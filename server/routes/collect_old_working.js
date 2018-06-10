// THESE COLLECT ROUTES ARE USED AUTOMATICALLY AND CALLED FROM THE KEY-LOGGING SCRIPT THAT RUNS ON THE FRONT-END OF CONT AUTH WEBSITE
// THEY ARE USED TO COLLECT KEYSTROKE DATA AND TO PERFORM CONTINUOUS AUTHENTICATION


var User = require('../models/user');
var KeystrokeDataModel = require('../models/keystrokes')
var config = require('../../config');
var fs = require('fs');

module.exports = function(app, express) {

    var collectRouter = express.Router();

    collectRouter.route('/keystrokes')

    // create a keystroke schema (accessed at POST http://localhost:8080/collect/keystrokes)
    // this route is used to collect keystrokes every 10 sec from key-logger script of cont auth website
    .post(function(req, res) {


        // console.log(req.headers);
        console.log(req.body);

        // create a new instance of the Keystrokedata model
        var keystrokeData = new KeystrokeDataModel();

        // check body for missing data
        if (req.body.track_code == null) {
            res.json({ success: false, message: 'Track code is missing.' })
            console.log('Track code is missing');
            return;
        } else if (req.body.subject == null) {
            res.json({ success: false, message: 'Subject is missing.' })
            console.log('Subject is missing');
            return;
        } else if (req.body.keystroke_code == null) {
            res.json({ success: false, message: 'Keystroke Codes are missing.' });
            console.log('Keystroke Codes are missing.');
            return;
        } else if (req.body.keystroke_dt == null) {
            res.json({ success: false, message: 'Keystroke Dts are missing.' });
            console.log('Keystroke Dts are missing.');
            return;
        }

        // Check if the requested track_code is indeed belong to some  user admin model
        User.findOne({
            track_code: req.body.track_code
        }).select('track_code').exec(function(err, admin) {
            if (err) throw err; // no user with that username was found
            if (!admin) {
                res.json({
                    success: false,
                    message: 'Track Code not found!'
                });
                console.log('Track code not found!');
            } else if (admin) {

                // The track_code is found and is valid at this point.
                // Now take care the subject
                // The subject can either be a new one (no records yet) or an old one.
                // If it is an old one it can either have a very recent record or not (very recent = a record in the last 24hrs)

                // Check dates of today and the latest document of this subject
                var todayObj = new Date();
                var today = todayObj.getUTCFullYear() + "-" + (todayObj.getUTCMonth() + 1) + "-" + todayObj.getUTCDate();

                // get latest document of this subject (if exists)
                KeystrokeDataModel.findOne({ subject: req.body.subject }, {}, { sort: { 'date': -1 } }, function(err, post) {
                    if (err) throw err;

                    if (post) {
                        // At this point, this is an old subject (records exists)
                        // Check it's record date to check if it is recent or not

                        let docDate = post.date.getUTCFullYear() + "-" + (post.date.getUTCMonth() + 1) + "-" + post.date.getUTCDate();
                        // compare date in days with today's date
                        if (getDaysDifference(today, docDate) < 1) {
                            // they have less than a day  difference so just update the documentt
                            // Check if it's end delimeter to adjust (gia na min exw 2 -1 stin seira)
                            // if (!(req.body.keystroke_code == -1 && post.keystroke_code[post.keystroke_code.length - 1] == -1)) {
                            post.keystroke_code = post.keystroke_code.concat(req.body.keystroke_code.split(',').map(Number));
                            post.keystroke_dt = post.keystroke_dt.concat(req.body.keystroke_dt.split(',').map(Number));
                            post.date = new Date();
                            post.save();
                            res.json({ message: 'KeystrokeData Updated for track-code: ' + req.body.track_code });
                            console.log('KeystrokeData Updated');
                            console.log('Track code: ' + req.body.track_code);
                            console.log('Subject: ' + req.body.subject);
                            // }
                            return;

                        } else {
                            // At this point the subject is note recent (daysdiff > 1)
                            // So make new record
                            keystrokeData.track_code = admin.track_code;
                            keystrokeData.subject = req.body.subject;
                            keystrokeData.keystroke_code = req.body.keystroke_code.split(',');
                            keystrokeData.keystroke_dt = req.body.keystroke_dt.split(',');

                            // save the keystrokedata record and check for errors
                            keystrokeData.save(function(err) {
                                if (err) {
                                    res.json({ message: 'Error Saving data.' });
                                    console.log(err);
                                    return; // make sure server dont crash
                                }
                                // data successfuly saves.
                                res.json({ message: 'KeystrokeData Received for track-code: ' + req.body.track_code });
                                console.log('KeystrokeData Created for track-code: ' + req.body.track_code);
                            });
                        }

                    } else {
                        // At this point the subject is complete new (no record yet)
                        keystrokeData.track_code = admin.track_code;
                        keystrokeData.subject = req.body.subject;
                        keystrokeData.keystroke_code = req.body.keystroke_code.split(',');
                        keystrokeData.keystroke_dt = req.body.keystroke_dt.split(',');

                        // save the keystrokedata and check for errors
                        keystrokeData.save(function(err) {
                            if (err) {
                                res.json({ message: 'Error Saving data.' });
                                console.log(err);
                                return; // make sure server dont crash
                            }
                            // data successfuly saves.
                            res.json({ message: 'KeystrokeData Received for track-code: ' + req.body.track_code });
                            console.log('KeystrokeData Created First Time for track-code: ' + req.body.track_code);

                        });
                    }
                });

            }
        });




    })

    return collectRouter;
}


//returns date1 - date2 in days
function getDaysDifference(date1, date2) {
    //format of days: YEAR-MONTH-DAY
    let date_1 = date1.split('-').map(Number);
    let date_2 = date2.split('-').map(Number);

    if (date_1[0] > date_2[0]) {
        return date_1[0] - date_2[0];
    }

    if (date_1[1] > date_2[1])  {
        return 30 * (date_1[1] - date_2[1]);
    }

    return date_1[2] - date_2[2];

}