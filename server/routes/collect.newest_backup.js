var User = require('../models/user');
var KeystrokeDataModel = require('../models/keystrokes')
var config = require('../../config');
var fs = require('fs');
var PythonShell = require('python-shell');

module.exports = function(app, express) {

    var collectRouter = express.Router();

    collectRouter.route('/keystrokes')

    //  (accessed at POST http://localhost:8080/collect/keystrokes)
    // this route is used to collect keystrokes from key-logger script of cont auth website
    .post(function(req, res) {

        console.log('\n\nGathering new data.......');
        console.log('\nOrigin (without http(s)): ' + req.headers.origin.split('/')[2]);
        console.log(req.body);
        console.log('\n');


        // check body for missing data
        if (req.body.track_code == null) {
            res.json({ success: false, message: 'Track code is missing.' })
            console.log('Track code is missing');
            return;
        } else if (req.body.subject == null || req.body.subject == '') {
            res.json({ success: false, message: 'Subject is missing.' })
            console.log('Subject is missing');
            return;
        } else if (req.body.keystroke_code == null || req.body.keystroke_code == '[]') {
            res.json({ success: false, message: 'Keystroke Codes are missing.' });
            console.log('Keystroke Codes are missing.');
            return;
        } else if (req.body.keystroke_dt == null || req.body.keystroke_dt == '[]') {
            res.json({ success: false, message: 'Keystroke Dts are missing.' });
            console.log('Keystroke Dts are missing.');
            return;
        }

        // Check if the requested track_code and the origin header is correct
        User.findOne({
            track_code: req.body.track_code,
            siteurl: req.headers.origin.split('/')[2] // without http(s)
        }).select('track_code is_trained_flag').exec(function(err, admin) {
            if (err) throw err;
            if (!admin) {
                res.json({
                    success: false,
                    message: '******Track Code && Site Url Origin dont match!'
                });
                console.log('Track code && site url Origin dont match!');
            } else if (admin) {

                // The track_code & siteurl is found and is valid at this point.
                // Now take care of the subject to log the key data correctly.
                // The subject can either be a new one (no records yet) or an old one.
                // Also, if it's an old one you must check the date of the latest session of the subject. If it's older than 1 day then create a new session
                // So find the session with subject:req.body.subject and and session.date less than one day diff with the present day of today.
                // if the query return null then the doc will be created, else the doc will be updated (according to the sessionStart flag of http post req)

                // Parse the JSON to arrays
                try {
                    var keystroke_dt_new = JSON.parse(req.body.keystroke_dt);
                    var keystroke_code_new = JSON.parse(req.body.keystroke_code);
                } catch (errr) {
                    console.log('ERROR AT JSON PARSE:');
                    console.log(errr);
                    return res.json({ success: false, message: 'Error check the console' });
                }

                // create a new instance of the Keystrokedata model
                var keystrokeModel = new KeystrokeDataModel();

                // Try to find the subject and select its sessions and di_gmms
                KeystrokeDataModel.findOne({ subject: req.body.subject, track_code: req.body.track_code }).select('sessions di_gmms').exec(function(error, doc) {
                    if (error) throw error;

                    // Subject doesn't exist, create new document
                    // No need to perform testing at this point.
                    if (!doc) {
                        console.log('No subject with this username exists');
                        console.log('Creating new document');

                        keystrokeModel.subject = req.body.subject;
                        keystrokeModel.track_code = req.body.track_code;
                        keystrokeModel.sessions = { keystroke_code: keystroke_code_new, keystroke_dt: keystroke_dt_new };

                        keystrokeModel.save(function(err) {
                            if (err) {
                                res.json({ message: 'Error Saving data.' });
                                console.log(err);
                                return;
                            }

                            res.json({ message: 'KeystrokeData Received for track-code: ' + req.body.track_code });
                            console.log('KeystrokeData Created for track-code: ' + req.body.track_code);
                        });

                    } else {

                        if (admin.is_trained_flag) { // edw kalitera subject.is_trained_flag

                            /** Keystroke Authentication Phase Starts here.
                             * Subject: doc.subject
                             * Trained Models: doc.di_gmms
                             * Digraph Data to be tested against trained models: keystroke_dt_new, keystroke_code_new
                             */
                            var data = { di_gmms: doc.di_gmms, testing: { keystroke_dt: keystroke_dt_new, keystroke_code: keystroke_code_new } };
                            console.log(' Calling Python Script for Testing... \n')
                            var options = {
                                mode: 'json',
                                scriptPath: '././python_scripts/'
                            };
                            var pyshell = new PythonShell('test.py', options);

                            // Send the data to be tested to python script as json
                            pyshell.send(data).end(function(err) {
                                if (err) console.log(err)
                            });

                            // Log the message returned from python
                            pyshell.on('message', function(message) {

                                if (typeof message.data == 'string') {
                                    console.log(message.data);
                                } else if (typeof message.data == 'object') {
                                    console.log(message.data);
                                    // console.log(message.data.dt);
                                    // console.log(message.data.di);
                                    if (message.data.not_enough_training == true) {
                                        console.log('Not enough training for user!!')
                                            // Continue by saving his sessions
                                    } else {
                                        if (message.data.passed == true) {
                                            console.log('**User passed!**');
                                            // Continue by saving his sessions
                                        } else {
                                            console.log('--User rejected!--');
                                            return res.json({ alert: true, isImpostor: true, message: 'User did not passed test' });
                                        }
                                    }
                                }
                            });

                            // Testing puprpose to breakpoint program.
                            return res.json({ message: 'Testing OK.' })

                        } else {

                            /**
                             * Admin hasn't trained his data yet, so just store it!
                             */


                            // Update it according to latest date

                            let cutoff = new Date();
                            cutoff.setDate(cutoff.getDate() - 1); // equals to yesterday (24hours before)
                            // console.log('debugging');
                            // console.log(doc.sessions);

                            // If the latest session is >1 day older then create a new session (a new JSON inside sesssions array)
                            if (doc.sessions[doc.sessions.length - 1].date < cutoff) {
                                // console.log('It is older than 1 day');
                                let newData = { keystroke_code: keystroke_code_new, keystroke_dt: keystroke_dt_new };
                                doc.sessions.push(newData);
                                doc.save();

                                // Else The latest session is not <1 day older so just update the latest session
                            } else {
                                // console.log('It isnt older than 1 day');
                                doc.sessions[doc.sessions.length - 1].keystroke_dt = doc.sessions[doc.sessions.length - 1].keystroke_dt.concat(keystroke_dt_new);
                                doc.sessions[doc.sessions.length - 1].keystroke_code = doc.sessions[doc.sessions.length - 1].keystroke_code.concat(keystroke_code_new);
                                doc.sessions[doc.sessions.length - 1].date = new Date();

                                doc.save();
                            }

                            res.json({ message: 'KeystrokeData Received for track-code: ' + req.body.track_code });
                            console.log('KeystrokeData Updated for track-code: ' + req.body.track_code);
                            return;

                        }






                    }
                });

            }
        });




    })

    return collectRouter;
}



/** Saves keystroke data according to daily sessions
 *
 */
function saveKeystrokeDataWrapper() {

}













//returns date1 - date2 in days
function getDaysDifference(date1, date2) {
    //format of days: YEAR-MONTH-DAY
    let date_1 = date1.split('-').map(Number);
    let date_2 = date2.split('-').map(Number);

    if (date_1[0] > date_2[0]) {
        return date_1[0] - date_2[0];
    }

    if (date_1[1] > date_2[1]) {
        return 30 * (date_1[1] - date_2[1]);
    }

    return date_1[2] - date_2[2];

}