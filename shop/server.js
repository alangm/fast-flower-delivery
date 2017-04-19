// server.js

// set up ======================================================================
// get all the tools we need
var express  = require('express');
var app      = express();
var port     = 8080;
var ssl_port = parseInt(process.argv[2]) || 8081;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');
var colors   = require('colors/safe');
var http     = require('http');
var https    = require('https');
var enforce  = require('express-sslify');
var Order    = require('./app/models/order');
var User     = require('./app/models/user');

var configDB = require('./config/database.js');

// configuration ===============================================================

mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

app.configure(function() {

	// set up our express application
	app.use(express.logger('dev')); // log every request to the console
	app.use(express.cookieParser()); // read cookies (needed for auth)
	app.use(express.bodyParser()); // get information from html forms

	app.set('view engine', 'ejs'); // set up ejs for templating

	// required for passport
	app.use(express.session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret
	app.use(passport.initialize());
	app.use(passport.session()); // persistent login sessions
	app.use(flash()); // use connect-flash for flash messages stored in session

	app.use(enforce.HTTPS({ trustProtoHeader : true }));
});

var fs = require("fs");
var ssl_config = {
    key: fs.readFileSync('bin/ssl/ds-ssl.pem'),
    cert: fs.readFileSync('bin/ssl/ds-cert.crt')
};

var server = http.createServer(app);
var server_ssl = https.createServer(ssl_config, app);


var io = require('socket.io')(server_ssl);
var io2 = require('socket.io-client')
var io3 = io2.connect('https://35.161.219.103');
io3.on('connect', function () {
  // socket connected
  io3.emit('server_connected');
	console.log('\nConnected to https://35.161.219.103');
});

io.on('connection', function (socket) {
  io.emit('shop_connected');

	socket.on('order_created', function (data) {
	  console.log('Shop Server received order');

		var newOrder = new Order();
		newOrder.from = data.from;
		newOrder.name = data.name;
		newOrder.location = data.location;
		newOrder.driver = data.driver;
		newOrder.note = data.note;
		newOrder.status = 'pending';
		newOrder.save(function(err,data) {
			if(err) throw err;
			console.log('data',data);
		});

		var new_delivery = {
			from : data.from,
			name : data.name,
			location : data.location,
			driver : data.driver,
			note : data.note,
			status : 'pending'
		}

		io3.emit('delivery_ready', new_delivery);
		io.emit('delivery_ready', new_delivery);
	});

	socket.on('disconnect', function () {
	  io.emit('shop_disconnected');
	});

	socket.on('driver_accepted_order', function(data){
		console.log('driver_accepted_order');

		var query = { name:data.name }
  	  , update = { $set: { driver:data.driver, status:data.status }};

		Order.update(query, update, function(err, changed){});
	});

	socket.on('order_status_changed', function(data) {
		console.log('order_status_changed', data);

		if(data.status == 'done'){
			//Order.find({name:data.name}, function(err,data){console.log('found',data)});
			Order.remove({name:data.name},function(err,data){console.log('deleted order');});
		} else {
			var query = {name:data.name};
			Order.update(query, { $set: { driver:data.driver,status:data.status }},
				function(err, doc){console.log(err, doc);});
		}

		io.emit('refresh_view');
	});

	socket.on('shop_created', function(data) {
		console.log('shop_created');
		io3.emit('shop_created', data);
	});

	socket.on('message', function(data) {
		console.log('message', data);
		io3.emit('message', data);
	});

	socket.on('message_read', function(data) {
		console.log('message was read');
	})
});

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================

server.listen(port)
server_ssl.listen(ssl_port)

console.log(
  colors.bold.yellow(
    '\n\t* Server started at ' + server.address().address + ':'
                                 + server.address().port + ' *'));
console.log(
  colors.bold.white(
    '\n\t* Secure server started at ' + server_ssl.address().address + ':'
                                      + server_ssl.address().port + ' *\n\n'));
