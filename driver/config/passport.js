// config/passport.js

// load all the things we need
var LocalStrategy      = require('passport-local').Strategy;
var FoursquareStrategy = require('passport-foursquare-token');

var User = require('../app/models/user');
var configAuth = require('./auth');

module.exports = function(passport) {

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });



    // =========================================================================
    // LOCAL ===================================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'username',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) {
    console.log('finding: ' + username);
        process.nextTick(function() {
          User.findOne({ 'local.username' :  username }, function(err, user) {
              if (err) return done(err);
              if (user) {
                  user.local.username = username;
                  user.fs.displayname = username;
                  return done(null, newUser);
              } else {
                  var newUser            = new User();
                  newUser.local.username = username;
                  newUser.fs.displayName = username;
                  newUser.save(function(err) {
                    if (err) throw err;
                    return done(err, newUser);
                  });
              }
          });
        });
    }));

    // =========================================================================
    // FOURSQUARE ==============================================================
    // =========================================================================
    passport.use(new FoursquareStrategy({
            clientID          : configAuth.foursquareAuth.clientId,
            clientSecret      : configAuth.foursquareAuth.clientSecret,
            callbackURL       : configAuth.foursquareAuth.callbackUrl,
            passReqToCallback : true
        }, function(req, accessToken, refreshToken, profile, next) {
          process.nextTick(function() {
            // find user
            User.findOne({ 'fs.id' : profile.id }, function(err, user) {
              if(err) return next(err);
              if(user) {
                user.fs.photo = JSON.stringify(profile.photos[0].value.prefix + profile.photos[0].value.suffix);
                user.fs.displayName = JSON.stringify(profile.displayName);
                user.fs.firstName = JSON.stringify(profile.name.givenName);
                user.fs.lastName = JSON.stringify(profile.name.familyName);
                user.fs.token = accessToken;
                user.local.username = JSON.stringify(profile.displayName);
                return next(null, user);
              } else {
                var newUser = new User();
                newUser.fs.id = profile.id;
                newUser.fs.email = JSON.stringify(profile.emails[0].value);
                newUser.fs.displayName = JSON.stringify(profile.displayName);
                newUser.fs.firstName = JSON.stringify(profile.name.givenName);
                newUser.fs.lastName = JSON.stringify(profile.name.familyName);
                newUser.local.username = JSON.stringify(profile.displayName);
                newUser.fs.token = accessToken;
                newUser.fs.photo = JSON.stringify(profile.photos[0].value.prefix + profile.photos[0].value.suffix);

                newUser.save(function(err) {
                  if(err) throw err;
                  return next(err, newUser);
                });
              }
            });
          });
    }));
};



function removeQuotes(s) {
  return s.replace(/['"]+/g, '');
}
