
var Order = require('./models/order');
var User = require('./models/user');


// app/routes.js
module.exports = function(app, passport) {

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		res.render('index.ejs', {
			user : false
		}); // load the index.ejs file
	});

	app.post('/order/new', function(req, res) {
		res.redirect('/profile');
	});

	app.get('/orders', function(req, res) {
		Order.find({}, function(err, data) {
			if(err) res.send(err);
			res.send(data);
		});
	});

	app.get('/shops', function(req, res) {
		User.find({}, function(err, data) {
			if(err) res.send(err);
			res.send(data);
		});
	});

	app.get('/orders/remove/all', function(req, res) {
		Order.remove({}, function(err, data) {
			if(err) res.send(err);
			res.send(data);
		});
		res.redirect('/profile');
	});

		app.get('/shops/remove/all', function(req, res) {
			User.remove({}, function(err, data) {
				if(err) res.send(err);
				res.send(data);
			});
			res.redirect('/profile');
		});

	// =====================================
	// LOGIN ===============================
	// =====================================
	// show the login form
	app.get('/login', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/login', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
	app.get('/signup', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// PROFILE SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile', isLoggedIn, function(req, res) {
		Order.find({}, function(err, orders){
			var orderMap = {};
			orders.forEach(function(order) {
				orderMap[order._id] = order;
			});

			res.render('profile.ejs', {
				user : req.user,
				orders : orders
			});

		});
	});

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
};

// route middleware to make sure
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}
