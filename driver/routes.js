// routes.js

var auth_config = require('./config/auth');
var foursquare = require('node-foursquare')(auth_config);
var request = require('request');
var Order = require('./app/models/order');
var Shop = require('./app/models/shop');
var Driver = require('./app/models/driver');
var User = require('./app/models/user');

module.exports = function(app, passport) {

  // this first route MUST have an access_token parameter
  app.get('/auth/foursquare', passport.authenticate('foursquare-token', {
      successRedirect : '/',
      failureRedirect : '/'
    }));
  app.get('/auth/fs', getFs);
  app.get('/auth/fs/cd', getFsCode);
  app.get('/logout', getLogout);
  app.post('/login/fs', postLogin);
  app.get('/register/', getRegister);
  app.post('/register/fs', postFsRegister);
  app.get('/users', getAllUsers);
  app.get('/user', function(req, res){res.redirect('/');});
  app.post('/fs/push', handlePush);
  app.get('/orders', getOrders);
  app.get('/order/accept', acceptOrder);
  app.get('/order/complete', completeOrder);
  app.get('/orders/remove/all', killOrders);
  app.get('/drivers', getDrivers);
  app.get('/drivers/remove/all', killDrivers);

// ==========================================================================

  // post login
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/gossip', // redirect to the secure profile section
		failureRedirect : '/', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

  // get checkins
  app.get('/user/checkins', function(req, res, next) {
      var url = 'https://api.foursquare.com/v2/users/self/checkins?oauth_token='
              + req.query.token + '&v=20170306';

      request({
        url : url,
        json : true
      }, function(error, response, body) {
        if(!error && body) {

          User.findOne({ 'fs.id' : req.query.id }, function(err, user) {
            if(err) {
              return next(err);
            }
            if(user) {
              res.render('checkins.ejs', {
                user  : user,
                self  : true,
                id    : req.query.id,
                count : body.response.checkins.count,
                items : body.response.checkins.items
              });
            } else {
              console.log('did not find user')
              res.render('checkins.ejs', {
                self  : false,
                id    : req.query.id,
                count : 0,
                items : []
              });
            }
          });

        } else {
          res.send('Error! ' + error.message)
        }
      });
  });

  // route for home page
  app.get('/', function(req, res, next) {
    Order.find({}, function(err, orders){
      var orderList = {};
      orders.forEach(function(order) {
        orderList[order._id] = order;
      });

        res.render('index.ejs', {
            user : req.user,
            users : req.users,
            token : req.token,
            orders : orders
        });

    })
  });

  // local vars and methods to use in ejs templates
  app.locals({
    removeQuotes : function(s) {
      if(s) { return s.replace(/['"]+/g, ''); }
    },
    renderScriptsTags: function (all) {
      if (all != undefined && all != '') {
        return '<script src="public/js/' + all + '"></script>';
      }
      else { return ''; }
    },
    renderStylesTags: function (all) {
      if (all != undefined && all != '') {
        return '<style rel="stylesheet" href="public/css/' + all + '"></style>';
      }
      else { return ''; }
    }
  });
}

// ==========================================================================
//                    HELPERS
// ==========================================================================


function getOrders(req, res) {
  Order.find({}, function(err, orders) {
    if(orders) {
      res.send(orders);
    }
  });
}

function acceptOrder(req, res) {
  Order.find({_id:req.query.orderID}, function(err, order){
    if(err) throw err;
    if(order){
      res.redirect('/');
    }
  });
};

function completeOrder(req, res) {
  res.redirect('/');
};

function killOrders(req, res) {
  Order.remove({}, function(err, orders) {
    if(orders) {
      res.send(orders);
    }
  });
  res.redirect('/');
};

function killDrivers(req, res) {
  Driver.remove({}, function(err, drivers) {
    if(drivers) {
      res.send(drivers);
    }
  });
  res.redirect('/logout');
};

function getDrivers(req, res) {
  User.find({}, function(err, users) {
    if(users) {
      res.send(users);
    }
  });
};



// ==========================================================================


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
      return next();
  res.redirect('/');
};

// ==========================================================================

function getFs(req, res) {
    res.writeHead(303, { 'location': foursquare.getAuthClientRedirectUrl() });
    res.end();
};

function getFsCode(req, res) {
     foursquare.getAccessToken({
      code: req.query.code
    }, function (error, access_token) {
      if(error) {
        res.send('An error was thrown: ' + error.message);
      }
      else {
        res.redirect('/auth/foursquare?access_token=' + access_token);
      }
    });
};

function handlePush(req, res) {
  console.log('Got a push!!!');
  var socket = require('socket.io-client')
  var io = socket.connect('https://35.161.219.103/');
  io.emit('fs_push');
};


// ==========================================================================

function getLogout(req, res) {
  req.logout();
  res.redirect('/');
};

function postLogin(req, res) {
    res.redirect('/auth/fs');
};

// ==========================================================================

function getRegister(req, res) {
    res.render('register');
};

function postFsRegister(req, res) {
    return res.redirect('/auth/fs');
};

// ==========================================================================

function getAllUsers(req, res, next) {
  User.find({}, function(err, u) {
    var uid;
    if(u) {
      User.findOne({ 'fs.id' : req.query.id }, function(err, us) {
        if(us) {
          uid = us.fs.id;
        }
        else uid = -1;
        res.render('users', { users : u, id : uid });
      });
    }
  });
};

function removeQuotes(s) {
  return s.replace(/['"]+/g, '');
};
