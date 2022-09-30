//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
// const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption')
// var md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
// const findOrCreate = require('mongoose-findorcreate')
var findOrCreate = require('mongoose-findorcreate')


// require('https').globalAgent.options.rejectUnauthorized = false;


const app = express();
// console.log(process.env.API_KEY)

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: 'Our Little Secret',
  resave: false,
  saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session())

// mongoose.connect('mongodb://localhost:27017/userDB');
mongoose.connect('mongodb+srv://devin1206:devin1206@atlascluster.9vdu9tb.mongodb.net/userDB');


const userSchema = new mongoose.Schema({ ///encryption
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(findOrCreate)
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ['password'] });
const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


//Google login
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    // callbackURL: "http://localhost:3000/auth/google/secrets", //match the url I set in google
    callbackURL: "https://devinsecret.herokuapp.com/auth/google/secrets", //match the url I set in google
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

//FB login
passport.use(new FacebookStrategy({
    clientID: process.env.FBCLIENT_ID,
    clientSecret: process.env.FBCLIENT_SECRET,
    // callbackURL: "http://localhost:3000/auth/facebook/secrets",
    callbackURL: "https://devinsecret.herokuapp.com/auth/facebook/secrets",

  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));
/////////

app.get('/', function(req, res) {
  res.render('home');
})


//Google auth
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', "email"]
  }));

app.get('/auth/google/secrets',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect secret.
    res.redirect('/secrets');
  });


//Facebook auth
app.get('/auth/facebook',
  passport.authenticate('facebook', {
    scope: ['email']
  }));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });




app.get('/login', function(req, res) {
  res.render('login');
})

app.get('/register', function(req, res) {
  res.render('register');
})



app.get('/secrets', function(req, res) {
  User.find({
    'secret': {
      $ne: null
    }
  }, function(err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render('secrets', {
          usersWithSecrets: foundUsers
        })
      }
    }
  })
})

app.get('/submit', function(req, res) {
  if (req.isAuthenticated()) {
    res.render('submit')
  } else {
    res.redirect('/login');
  }
})

app.post('/submit', function(req, res) {
  const submittedSecret = req.body.secret

  console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser) {
    if (err) {
      console.log(err)
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function() {
          res.redirect('/secrets')
        });
      }
    }
  })
})

app.get('/logout', function(req, res) {
  req.logout(function(err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
})



app.post('/register', function(req, res) {

  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   const newUser = new User({
  //     email: req.body.username,
  //     password: hash
  //   })
  //   newUser.save(function(err) {
  //     if (err) {
  //       console.log(err)
  //     } else {
  //       res.render('secrets')
  //     }
  //   })
  // });
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect('/register')
    } else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets');
      });
    }



    // Value 'result' is set to false. The user could not be authenticated since the user is not active

  });

});
app.post('/login', function(req, res) {
  // const username = req.body.username;
  // const password = req.body.password;
  //
  //
  // User.findOne({
  //   email: username
  // }, function(err, foundUser) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (foundUser) {
  //       bcrypt.compare(password, foundUser.password, function(err, result) {
  //         if (result == true) {
  //           res.render('secrets')
  //         }
  //       });
  //     }
  //   }
  // })
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) { ///from passportjs.org
    if (err) {
      console.log(err)
    } else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets')
      })
    }
  })

})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}



app.listen(port, function() {
  console.log("Server started on port 3000.");
});
