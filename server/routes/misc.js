// THESE ROUTES ARE USED AND CALLED FROM EXTERNAL WEB-SERVERS OR FRONT-ENDS.


var User = require('../models/user');
var KeystrokeDataModel = require('../models/keystrokes')
var jwt = require('jsonwebtoken');
var config = require('../../config');
var PythonShell = require('python-shell');
// var keyboardMap = require('../helpers/keyboardmap')

// Outliers in milliseconds
const UPPER_OUTLIER_THRESH = 2000;
const LOWER_OUTLIER_THRESH = 10;


module.exports = function (app, express) {


    var miscRouter = express.Router();


    // api endpoint to get the keystrokes profile of subject
    // The request is performed from the cont auth website back-end
    // The request must include the track_code and the username of the subject whose keystroke profile must be queried. (avg latency, std, minmax etc)
    miscRouter.route('/mykeyprofile')

        .get(function (req, res) {
            console.log('Subject wants his keystroke profile data->');
            console.log(req.get('user-key-profile-request'));

            // Extract track_code and subject from my custom http headers
            const reqInfo = JSON.parse(req.get('user-key-profile-request'));
            const track_code = reqInfo.track_code;
            const subject = reqInfo.subject;


            // create an instance of the Keystrokedata model
            var keystrokeData = new KeystrokeDataModel();

            // ->Return the subject with this track_code and with this subject's name and select its sessions
            KeystrokeDataModel.findOne({
                track_code: track_code,
                subject: subject
            }).select('subject sessions').exec(function (err, doc) {
                if (err) throw err;

                if (!doc) {
                    // Track code or subject's name not found in keystrokedata model
                    res.json({
                        success: false,
                        message: 'Track Code or Subject name not found!'
                    });
                    console.log('KeystrokeProfile Request, Response: Track Code or Subject name not found!');

                } else {

                    // console.log(doc.sessions);
                    sendToPython = [{
                        subject: doc.subject,
                        sessions: doc.sessions
                    }]
                    // console.log(sendToPython);
                    // Call the python script to return some statistics for this subject
                    var options = {
                        mode: 'json',
                        scriptPath: '././python_scripts/preprocessing_phase'
                    };
                    var pyshell = new PythonShell('main.py', options);
                    // Send the data to be trained to python script as json
                    pyshell.send({
                        subjectEventsList: sendToPython,
                        writeCsvFlag: false
                    }).end(function (err2) {
                        if (err2) console.log(err2);
                    })
                    // Receive from python
                    pyshell.on('message', function (message) {

                        if (typeof message.data == 'string') {
                            console.log(message.data);
                        } else if (typeof message.data == 'object') {
                            // console.log(message.data);
                            // Save results to database
                            var arrObj = message.data;

                            // Send back the results
                            res.json({
                                success: true,
                                keyprofile: arrObj[0]
                            });
                        }
                    });






                }
            });


        });



    // Returns a random sentence with the maximum specified length
    // This is used for RAT
    miscRouter.route('/get-random-sentence/:MAXIMUM_LENGTH')
        // At the moment MAXIMUM_LENGTH is not used
        .get(function (req, res) {

            var quote = require('../models/randomparagraphs').paragraphs[0];

            res.json({
                success: true,
                sentence: quote
            })
        });

    //This is used for safeshop
    miscRouter.route('/get-random-sentence-safeshop/:MAXIMUM_LENGTH')
        // At the moment MAXIMUM_LENGTH is not used
        .get(function (req, res) {

            var sentence = require('../models/randomparagraphs').paragraphs_SAFESHOP[0];

            res.json({
                success: true,
                sentence: sentence
            })
        });


    return miscRouter;

}



/************************************************************************************** */
// Inline functions

/**
 * Returns a random integer between the specified range
 */
function getRandomInt(minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

/**
 * Restrict string length without cutting last word
 * @param {string} str
 * @param {number} maxStrSize
 */
function restrictStringLength(str, maxStrSize) {
    if (str.length > maxStrSize) {
        var temp = str;
        if (temp[maxStrSize] !== ' ') {
            var offset = temp.substring(maxStrSize).indexOf(' ');
            if (offset > -1) {
                maxStrSize += offset;
            } else {
                maxStrSize = str.length;
            }
        }
    }
    return str.substr(0, maxStrSize);
}

// Return average of a number array starting at index 'from' and ending to index 'to-1'
function arrAvg(myArr, from = 0, to = myArr.length) {
    let sum = 0;
    let countEndDelims = 0; // counter to count outliers so that you exclude them to calc avg
    for (let i = from; i < to; i++) {
        // if it's end delimeter ignore it
        if (isOutlier(myArr[i])) {
            countEndDelims++;
            continue;
        }

        sum = sum + myArr[i];
    }

    return sum / (myArr.length - countEndDelims);
}


// Return the squared average of a number array (used to calculate standard deviation)
function arrSquaredAvg(myArr, from = 0, to = myArr.length) {
    let sqSum = 0;
    let countEndDelims = 0; // counter to count outliers so that you exclude them to calc sq avg
    for (let i = from; i < to; i++) {
        // if it's end delimeter ignore it
        if (isOutlier(myArr[i])) {
            countEndDelims++;
            continue;
        }
        sqSum = sqSum + Math.pow(myArr[i], 2);
    }
    // console.log(sqSum);
    return sqSum / (myArr.length - countEndDelims);
}


// Return the standard deviation from eqaution: s^2 = E[x^2] - E[x]^2
function calcStd(myAvg, mySquaredAvg) {
    return Math.sqrt(mySquaredAvg - Math.pow(myAvg, 2));
}


// Returns the fastest digraph (the fastest combination of 2 character eg 'df')
// It finds it based on the minimum val of keystroke_dt
function myFastestDigraph(keystroke_dt, keystroke_code, minKeyDtVal) {
    let index = keystroke_dt.indexOf(minKeyDtVal);
    console.log('INDEX TOY MY FASTEST');
    console.log(index);
    // return keyboardMap.key[keystroke_code[index][0]].concat(keyboardMap.key[keystroke_code[index][1]])
    let ret = (String.fromCharCode(keystroke_code[index][0]).concat(String.fromCharCode(keystroke_code[index][1]))).toLowerCase();
    return ret.replace('@', '#').replace('@', '#');
}

// Returns the slowest digraph (the slowest combination of 2 character eg 'df')
// It finds it based on the maximum val of keystroke_dt
function mySlowestDigraph(keystroke_dt, keystroke_code, maxKeyDtVal) {
    let index = keystroke_dt.indexOf(maxKeyDtVal);
    console.log('INDEX TOY MY SLOWEST');
    console.log(index);
    // return keyboardMap.key[keystroke_code[index][0]].concat(keyboardMap.key[keystroke_code[index][1]])
    let ret = (String.fromCharCode(keystroke_code[index][0]).concat(String.fromCharCode(keystroke_code[index][1]))).toLowerCase();
    return ret.replace('@', '#').replace('@', '#');
}

// Returns the minimum value of arr (excluding the -1 which is the delimeter)
function myMin(arr) {
    mymin = 1234568;
    for (let i = 0; i < arr.length; i++) {
        if (isOutlier(arr[i])) continue;
        if (arr[i] < mymin) {
            mymin = arr[i];
        };
    }
    return mymin;
}

// Returns the maximum value of arr (excluding the outliers)
function myMax(arr) {
    mymax = -2;
    for (let i = 0; i < arr.length; i++) {
        if (isOutlier(arr[i])) continue;
        if (arr[i] > mymax) {
            mymax = arr[i];
        };
    }
    return mymax;
}

// Checks if a number is an outlier
function isOutlier(num) {
    return ((num < LOWER_OUTLIER_THRESH) || (num > UPPER_OUTLIER_THRESH))
}