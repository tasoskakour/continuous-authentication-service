// grab the packages that we need for the user model
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise // https://github.com/Automattic/mongoose/issues/4951
var bcrypt = require('bcrypt-nodejs');

// user schema
var UserSchema = new Schema({
    // User data
    username: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    date: {
        type: Date,
        default: new Date()
    },

    // Projects data
    projects: [{
        date: {
            type: Date,
            default: new Date()
        },
        siteurl: {
            type: String,
            required: true
        },
        track_code: String,
        last_train_date: {
            type: Date
        }, // latest train date
        enable_keyguard_auth_flag: {
            type: Boolean,
            default: false
        }, // used to enable keyguard
        testing_threshold: {
            type: Number,
            default: 0.6
        }, // used at testing
        keystroke_data_collect_every_n_seconds: {
            type: Number,
            default: 5
        }, // how often the logging script sends data to the server
        timing_limits: {
            key_hold: {
                min: {
                    type: Number,
                    default: 0
                },
                max: {
                    type: Number,
                    default: 400
                }
            },
            digraph_up_down: {
                min: {
                    type: Number,
                    default: -400
                },
                max: {
                    type: Number,
                    default: 800
                }
            }
        }, // Timing limits used to extract timings from events to save trained templates.
        training_algorithm: {
            type: String,
            default: 'ONE_CLASS_SVM' // or 'GMM'
        },
        training_params: {
            GMM: {
                delta: {
                    type: Number,
                    default: 1.5
                },
                n_components: {
                    type: Number,
                    default: 2
                }
            },
            ONE_CLASS_SVM: {
                gamma: {
                    type: Number,
                    default: 0.1
                }
            }
        }
    }]
});

// hash the password before the user is saved
UserSchema.pre('save', function (next) {
    var user = this;
    // hash the password only if the password has been changed or user is new
    if (!user.isModified('password')) return next();
    // generate the hash
    bcrypt.hash(user.password, null, null, function (err, hash) {
        if (err) return next(err);
        // change the password to the hashed version
        user.password = hash;
        next();
    });

    // also generate a track_code by hashing the username
    // user.track_code = user.username.hashCode();
    // console.log(user.track_code);
});

// method to compare a given password with the database hash
UserSchema.methods.comparePassword = function (password) {
    var user = this;
    return bcrypt.compareSync(password, user.password);
};

// method to hash a string (used to produce trackcode from userame)
String.prototype.hashCode = function () {
    var hash = 0;
    for (let i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = hash + chr;
    }
    hash = Math.pow(hash, 4);

    return hash.toString();
};



// return the model
module.exports = mongoose.model('User', UserSchema);