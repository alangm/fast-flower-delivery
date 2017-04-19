
var mongoose = require('mongoose');

// define the schema for our driver model
var shopSchema = mongoose.Schema({

        name         : String,
        location     : String

});

module.exports = mongoose.model('Shop', shopSchema);
