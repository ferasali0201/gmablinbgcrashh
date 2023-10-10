const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const passportLocal = require("passport-local").Strategy;
const router = express.Router();
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const bodyParser = require("body-parser");
const app = express();
const User = require("./models/user");
const Game_loop = require("./models/game")
require('dotenv').config()

const GAME_LOOP_ID = "5f8d9b8c1c9d440000c3e7b3";


const { Server } = require('socket.io')
const http = require('http')
const Stopwatch = require('statman-stopwatch');
const { update } = require("./models/user");
const sw = new Stopwatch(true);

//start socket.io server 
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

io.on("connection", (socket) => {
  socket.on("clicked", (data) => {
  })
})

server.listen(3001, () => {
})
//connect to mongodb
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
//backend setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.PASSPORT_SECRET,
    resave: true,
    saveUninitialized: true,

  })
);
app.use(cookieParser(process.env.PASSPORT_SECRET));
app.use(passport.initialize());
app.use(passport.session());
require("./passportConfig")(passport);

//Passport.js login/register system
// Login route
app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) throw err;
      if (!user) {
        res.send("Username or Password is Wrong")
      }
      else {
        req.logIn(user, (err) => {
          if (err) throw err;
          res.send("Login Successful");
        });
      }
    })(req, res, next);
  });
  
  // Register route
  app.post("/register", (req, res) => {
    if (req.body.username.length < 3 || req.body.password < 3 || req.body.email.length < 3) {
      return
    }
  
    User.findOne({ $or: [{ username: req.body.username }, { email: req.body.email }] }, async (err, doc) => {
      if (err) throw err;
      if (doc) {
        if (doc.username === req.body.username) {
          res.send("Username already exists");
        } else {
          res.send("Email already exists");
        }
      }
      if (!doc) {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
  
        const newUser = new User({
          username: req.body.username,
          email: req.body.email,
          password: hashedPassword,
        });
        await newUser.save();
        res.send("Loading...");
      }
    });
  });


// Middleware to check if user is authenticated
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  }
  //route to get the current user
app.get("/user",checkAuthenticated, (req, res) => {
    res.send(req.user);
  });
  //route to log out the current user
  app.get("/logout", (req, res) => {
    req.logout();
    res.send("success2")
  });
  //route to multiply user balance
  app.get("/multiply", checkAuthenticated, async (req, res) => {
    const thisUser = await User.findById(req.user._id);
    const game_loop = await Game_loop.findById(GAME_LOOP_ID)
    crashMultipler = game_loop.multiplier_crash
    thisUser.balance = (thisUser.balance + crashMultipler)
    await thisUser.save();
    res.json(thisUser);
    ;
  })
  //route to generate a new crash value
  app.get('/generate_crash_value', async (req, res) => {
    const randomInt = Math.floor(Math.random() * 6) + 1
    const game_loop = await Game_loop.findById(GAME_LOOP_ID)
    game_loop.multiplier_crash = randomInt
    await game_loop.save()
    res.json(randomInt)
  
  })
  //route to retrieve the current crash value
  app.get('/retrieve', async (req, res) => {
    const game_loop = await Game_loop.findById(GAME_LOOP_ID)
    crashMultipler = game_loop.multiplier_crash
    res.json(crashMultipler)
    const delta = sw.read(2);
    let seconds = delta / 1000.0;
    seconds = seconds.toFixed(2);
    return
  })
  /
  app.post('/send_bet', checkAuthenticated, async (req, res) => {
    if (!betting_phase) {
      res.status(400).json({ customError: "IT IS NOT THE BETTING PHASE" });
      return
    }
    if (isNaN(req.body.bet_amount) == true || isNaN(req.body.payout_multiplier) == true) {
      res.status(400).json({ customError: "Not a number" });
    }
    bDuplicate = false
    theLoop = await Game_loop.findById(GAME_LOOP_ID)
    playerIdList = theLoop.active_player_id_list
    let now = Date.now()
    for (var i = 0; i < playerIdList.length; i++) {
      if (playerIdList[i] === req.user.id) {
        res.status(400).json({ customError: "You are already betting this round" });
        bDuplicate = true
        break
      }
    }
    if (bDuplicate) {
      return
    }
    thisUser = await User.findById(req.user.id)
    if (req.body.bet_amount > thisUser.balance) {
  
      res.status(400).json({ customError: "Bet too big" });
      return
    }
    await User.findByIdAndUpdate(req.user.id, { bet_amount: req.body.bet_amount, payout_multiplier: req.body.payout_multiplier })
    await User.findByIdAndUpdate(req.user.id, { balance: thisUser.balance - req.body.bet_amount })
    await Game_loop.findByIdAndUpdate(GAME_LOOP_ID, { $push: { active_player_id_list: req.user.id } })
  
    info_json = {
      the_user_id: req.user.id,
      the_username: req.user.username,
      bet_amount: req.body.bet_amount,
      cashout_multiplier: null,
      profit: null,
      b_bet_live: true,
    }
    live_bettors_table.push(info_json)
    io.emit("receive_live_betting_table", JSON.stringify(live_bettors_table))
    res.json(`Bet placed for ${req.user.username}`)
  })
  
  
