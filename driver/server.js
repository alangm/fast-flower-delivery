// server.js
require('rootpath')();

// setup ======================================================================
var express  = require('express');
var app      = express();
var port     = 8080;
var ssl_port = parseInt(process.argv[2]) || 8081;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');
var colors = require('colors/safe');
var http = require('http');
var https = require('https');
var configDB = require('./config/database.js');
var enforce = require('express-sslify');
var faye = require('faye');
var Order = require('./app/models/order');
var Shop = require('./app/models/shop');
var Driver = require('./app/models/driver');
var User = require('./app/models/user');

// config ===============================================================
var bayeux = new faye.NodeAdapter({
  mount:    '/faye',
  timeout:  45
});

mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

app.configure(function() {

	// set up our express application
	app.use(express.logger('dev')); // log every request to the console
	app.use(express.cookieParser()); // read cookies (needed for auth)
	app.use(express.bodyParser()); // get information from html forms

	app.set('view engine', 'ejs');
	app.set('views', __dirname + '/views');

	// required for passport
	app.use(express.session({ secret: 'secretssecretsaresofun' })); // session secret
	app.use(passport.initialize());
	app.use(passport.session()); // persistent login sessions
	app.use(flash()); // use connect-flash for flash messages stored in session

  // serve angular app files from the '/app' route
  app.use('app/', express.static('app'));

	app.use(enforce.HTTPS({ trustProtoHeader : true }));

});

var fs = require("fs");
var ssl_config = {
    key: fs.readFileSync('bin/ssl/ds-ssl.pem'),
    cert: fs.readFileSync('bin/ssl/ds-cert.crt')
};

var server = http.createServer(app);
var server_ssl = https.createServer(ssl_config, app);

bayeux.attach(server_ssl);
// routes ======================================================================
require('./routes.js')(app, passport, bayeux);


var twilio = require('twilio');

var accountSid = 'AC7899481d8d0f5f78bb0c967e436912ad'; // Your Account SID from www.twilio.com/console
var authToken = '7c2cf562b983635581243d0ec86ec9d9';   // Your Auth Token from www.twilio.com/console

var twilio = require('twilio');
var client = new twilio.RestClient(accountSid, authToken);


var io = require('socket.io')(server_ssl);
var io2 = require('socket.io-client')
var io3 = io2.connect('https://52.89.85.45:8081');

setInterval(function(){
  io.emit('time', new Date);
}, 5000);

io.on('connection', function (socket) {
  io.emit('driver_connected');

	socket.on('server_connected', function() {
		console.log('Connected to https://52.89.85.45:8081');
	});

	socket.on('delivery_ready', function(data) {
		console.log('Got delivery_ready event',data);
		new_order = new Order({from:data.from,name:data.name,location:data.location,note:data.note,driver:data.driver,status:data.status});
		new_order.save(function(err,data){});
    io.emit('refresh_view');
	});

  socket.on('fs_push', function(data) {
    io.emit('refresh_view');
  });

	socket.on('shop_created', function(data) {
		console.log('Got shop_created event', data);
		new_shop = new Shop({name:data.name, location:data.location});
		new_shop.save(function(err, data){console.log('saved shop:', err, data);});
	});

	socket.on('shop_removed', function(data) {
		console.log('Got shop_removed event');
		Shop.remove({ name:data.name }, function(err,data) {console.log('deleted shop:', err, data);});
	});

	socket.on('driver_created', function (data) {
		console.log('Got driver_created event');
		new_driver = new Driver({name:data.name,rating:data.rating,status:data.status,location:data.location});
		new_driver.save(function(err,data){console.log('saved driver:',err,data);});
		io3.emit('driver_created', data);
	});

	socket.on('driver_removed', function(data) {
		console.log('Got driver_removed event');
		Driver.remove({name:data.name},function(err,data){console.log('deleted driver:',err,data);});
		io3.emit('driver_removed', data);
	});

	socket.on('driver_accepted_order', function(data) {
		console.log('Got driver_accepted_order event');

		var query = { name:data.name }
  	  , update = { $set: { driver:data.driver, status:data.status }};

		Order.update(query, update, function(err, changed){
			if (changed > 0) {
				io3.emit('order_status_changed', data);
			}
		});
    io.emit('refresh_view');
	});

	socket.on('order_status_changed', function(data) {
		console.log('Got order_status_changed event');

		if(data.status == 'done'){
			Order.remove({_id:data.id},function(err,data){console.log('deleted order:',err,data);});
		} else {
			var query = {name:data.name};
			Order.update(query, { $set: { driver:data.driver,status:data.status }},
				function(err, doc){console.log(err, doc);});
		}
    io3.emit('order_status_changed',data);
    io.emit('refresh_view');
	});

	socket.on('received_sms', function(data) {
		console.log('Got received_sms event');
		// TODO update database
	});

	socket.on('received_checkin', function(data) {
		console.log('Got received_checkin event');
		io3.emit('driver_location_updated', data);
    io.emit('refresh_view');
	});

	socket.on('message', function(data) {
		console.log('Got message event');

		var full_message = data.from + " says: " + data.message;
		client.messages.create({
		    body: data.message,
		    to: '+18013725796',  // Text this number
		    from: '+13852194196' // From a valid Twilio number
		}, function(err, message) {
		    if(err) {
		        console.error(err.message);
		    } else {
					io3.emit('message_read', message);
				}
		});
	});
});

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
