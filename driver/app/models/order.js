
var mongoose = require('mongoose');

// define the schema for our driver model
var orderSchema = mongoose.Schema({

        from         : String,
        name         : String,
        location     : String,
        note         : String,
        driver       : String,
        status       : String

});


// create the model for users and expose it to our app
module.exports = mongoose.model('Order', orderSchema);
