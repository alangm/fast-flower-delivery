
var mongoose = require('mongoose');

// define the schema for our driver model
var driverSchema = mongoose.Schema({

        name         : String,
        rating       : String,
        status       : String,
        location     : String

});


// create the model for users and expose it to our app
module.exports = mongoose.model('Driver', driverSchema);
