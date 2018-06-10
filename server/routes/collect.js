var User = require('../models/user');
var KeystrokeDataModel = require('../models/keystrokes')
var config = require('../../config');
var fs = require('fs');
var PythonShell = require('python-shell');



module.exports = function (app, express) {

    var collectRouter = express.Router();


    collectRouter.route('/get_keystroke_code_collect_limit/:track_code')
        .get(function (req, res) {

            User.findOne().elemMatch("projects", {
                "track_code": req.params.track_code
            }).exec(function (err, admin) {
                if (err) return res.send(err);
                if (!admin) {
                    console.log('Track code given from the client script is wrong');
                    res.json({
                        success: false,
                        message: 'Track code given from the client script is wrong'
                    });
                } else {

                    // Load the appropriate keystroke_code_collect_limit
                    let track_code_arr = admin.projects.map(a => String(a.track_code));
                    let _projectIndex = track_code_arr.indexOf(req.params.track_code);
                    console.log('Client Script: Keystroke Collect Limit Loaded.');
                    console.log(admin);
                    res.json({
                        success: true,
                        keystroke_data_collect_every_n_seconds: admin.projects[_projectIndex].keystroke_data_collect_every_n_seconds
                    })
                }
            })
        });


    collectRouter.route('/keystrokes')
        //  (accessed at POST http://localhost:8080/collect/keystrokes)
        // this route is used to collect keystrokes from key-logger script of cont auth website
        .post(function (req, res) {

            console.log('\n\nGathering new data.......');
            console.log('\nOrigin (without http(s)): ' + req.headers.origin.split('/')[2]);

            // console.log(req.body);
            console.log(req.body.subject);
            console.log('\n');


            // check body for missing data
            if (req.body.track_code == null) {
                res.json({
                    success: false,
                    message: 'Track code is missing.'
                })
                console.log('Track code is missing');
                return;
            } else if (req.body.subject == null || req.body.subject == '') {
                res.json({
                    success: false,
                    message: 'Subject is missing.'
                })
                console.log('Subject is missing');
                return;
            } else if (req.body.keystrokeData == null || req.body.keystrokeData == '[]') {
                res.json({
                    success: false,
                    message: 'Keystroke Data are missing.'
                });
                console.log('Keystroke Data are missing.');
                return;
            }

            // Check if the requested track_code and the origin header is correct
            User.findOne({
                    projects: {
                        $elemMatch: {
                            "track_code": req.body.track_code,
                            "siteurl": req.headers.origin.split('/')[2]
                        }
                    }
                })
                .exec(function (err, admin) {
                    if (err) throw err;
                    if (!admin) {
                        res.json({
                            success: false,
                            message: '******Track Code && Site Url Origin dont match!'
                        });
                        console.log('Track code && site url Origin dont match!');
                    } else if (admin) {

                        // Find the data from the project with this track_code
                        let track_code_arr = admin.projects.map(a => String(a.track_code));
                        let _projectIndex = track_code_arr.indexOf(req.body.track_code);


                        // Parse the JSON to arrays
                        try {
                            var keystrokeData_new = JSON.parse(req.body.keystrokeData);
                        } catch (errr) {
                            console.log('ERROR AT JSON PARSE:');
                            console.log(errr);
                            return res.json({
                                success: false,
                                message: 'Error check the console'
                            });
                        }

                        // console.log(keystrokeData_new)



                        // create a new instance of the Keystrokedata model
                        var keystrokeModel = new KeystrokeDataModel();

                        // Try to find the subject and select its sessions and di_gmms
                        KeystrokeDataModel.findOne({
                            subject: req.body.subject,
                            track_code: req.body.track_code
                        }).select('sessions rejections is_trained').exec(function (error, doc) {
                            if (error) throw error;

                            // Subject doesn't exist, create new document
                            // No need to perform testing at this point.
                            if (!doc) {
                                console.log('No subject with this username exists');
                                console.log('Creating new document');

                                keystrokeModel.subject = req.body.subject;
                                keystrokeModel.track_code = req.body.track_code;
                                keystrokeModel.sessions = {
                                    data: keystrokeData_new
                                };

                                keystrokeModel.save(function (err) {
                                    if (err) {
                                        res.json({
                                            message: 'Error Saving data.'
                                        });
                                        console.log(err);
                                        return;
                                    }

                                    res.json({
                                        message: 'KeystrokeData Received for track-code: ' + req.body.track_code
                                    });
                                    console.log('KeystrokeData Created for track-code: ' + req.body.track_code);
                                });

                            } else {

                                const byPassTest = (req.body.byPassTest == 'true')
                                if (!byPassTest &&
                                    doc.is_trained && admin.projects[_projectIndex].enable_keyguard_auth_flag) {

                                    // Perform Testing
                                    const _testerData = {
                                        subject: req.body.subject,
                                        track_code: req.body.track_code,
                                        events: keystrokeData_new
                                    }
                                    const testing_threshold = admin.projects[_projectIndex].testing_threshold
                                    const trainingAlgorithm = admin.projects[_projectIndex].training_algorithm;
                                    const _trainingParams = admin.projects[_projectIndex].training_params[trainingAlgorithm];

                                    pytrain_and_test(_testerData, testing_threshold, trainingAlgorithm, _trainingParams, function (err, pyresponse) {
                                        if (err) {
                                            console.log(err)
                                            return res.send(err);
                                        }
                                        if (pyresponse.not_enough_training) {
                                            console.log('Not enough training for user')
                                            saveKeystrokeDataWrapper(res, doc, keystrokeData_new, req.body.track_code);
                                        } else {
                                            if (pyresponse.passed) {
                                                console.log('**User Passed');
                                                console.log(pyresponse.score);
                                                saveKeystrokeDataWrapper(res, doc, keystrokeData_new, req.body.track_code);
                                            } else {
                                                console.log('**User Rejected');
                                                console.log(pyresponse.score);
                                                doc.rejections = doc.rejections + 1;
                                                doc.save();
                                                res.json({
                                                    alert: true,
                                                    isImpostor: true,
                                                    message: 'User did not passed test',
                                                    score: pyresponse.score
                                                });
                                            }
                                        }

                                    });
                                } else {

                                    // Just save it
                                    saveKeystrokeDataWrapper(res, doc, keystrokeData_new, req.body.track_code);
                                }

                            }
                        });

                    }
                });




        })

    return collectRouter;
}



/** 
 * Saves keystroke data 
 */
function saveKeystrokeDataWrapper(res, doc, keystrokeData_new, track_code) {

    doc.sessions.data = doc.sessions.data.concat(keystrokeData_new);
    doc.save();

    res.json({
        alert: false,
        message: 'KeystrokeData Received for track-code: ' + track_code
    });
    console.log('KeystrokeData Updated for track-code: ' + track_code);

}

/**
 * @description Calls the trainandtest pyscript to test data
 * @param {object} testerData  {"subject", "track_code", "events"}
 * @param {string} trainingAlgorithm 'ONE_CLASS_SVM' or 'GMM'
 * @param {object} trainingParams {}
 * @param {object} callback Returns the object {"passed":Boolean, "score": Float}
 */
function pytrain_and_test(testerData, testingThreshold, trainingAlgorithm, trainingParams, callback) {
    console.log('Calling python script to train and test.');
    // console.log(testerData);
    // console.log(trainingAlgorithm);
    // console.log(trainingParams);

    var options = {
        mode: 'json',
        scriptPath: '././python_scripts/'
    };

    var pyshell = new PythonShell('train_and_test.py', options);

    pyshell.send({
        tester_data: testerData,
        testing_threshold: testingThreshold,
        training_algorithm: trainingAlgorithm,
        training_params: trainingParams
    }).end(function (err3) {
        if (err3) {
            console.log(err3);
            callback(err3);
        }
    });

    // Log the message returned from python
    pyshell.on('message', function (message) {

        if (typeof message.data == 'string') {
            console.log(message.data);
        } else if (typeof message.data == 'object') {
            console.log(message.data);
            callback(false, message.data);
        }
    });
}