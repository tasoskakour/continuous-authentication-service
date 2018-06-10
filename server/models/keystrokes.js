// grab the packages that we need for the user model
var mongoose = require('mongoose');
mongoose.Promise = global.Promise // https://github.com/Automattic/mongoose/issues/4951
var Schema = mongoose.Schema;


// keystroke schema
var KeystrokeSchema = new Schema({
    track_code: {
        type: String,
        required: true
    }, // reference to track_code of admin of user.js model
    subject: {
        type: String,
        required: true
    }, // the subject whose keystroke data belong to
    rejections: {
        type: Number,
        required: true,
        default: 0
    }, // total rejections of user
    is_trained: {
        type: Boolean,
        default: false
    }, // True when the model is trained,
    // di_gmms: [{
    //     digraph: {
    //         type: String
    //     },
    //     data: {
    //         type: [Number]
    //     },
    //     labels: {
    //         type: [Number]
    //     },
    //     weights: {
    //         type: [Number]
    //     },
    //     means: {
    //         type: [Number]
    //     },
    //     covs: {
    //         type: [Number]
    //     },
    //     stds: {
    //         type: [Number]
    //     }
    // }], // Exei 27x27=729 kelia, ka8e keli antistoixei se ena digraph
    sessions: { // sessions of the user.
        data: [{
            event: {
                type: String // 'keystrokeDown' or 'keystrokeUp'
            },
            key: {
                type: String
            },
            timestamp: {
                type: Number
            }
        }]
    }
});




// return the model
module.exports = mongoose.model('KeystrokeDataModel', KeystrokeSchema);