/**
 * This module is used to fetch data to the dashboard of addmin.
 */
var path = require('path');
var fs = require('fs');
var PythonShell = require('python-shell');
var User = require('../models/user');
var KeystrokeDataModel = require('../models/keystrokes')
var jwt = require('jsonwebtoken');
var config = require('../../config');
var superSecret = config.secret; // super secret for creating tokens
var beautify = require("json-beautify");


module.exports = function (app, express) {

    var dashRouter = express.Router();

    /**
     * @description Middleware for all dash requests.
     */
    dashRouter.use(function (req, res, next) {
        var token = req.body.token || req.params.token || req.headers['x-access-token'] || req.query.token;
        if (token) {
            jwt.verify(token, superSecret, function (err, decoded) {
                if (err) {
                    console.log('Failed to auth token');
                    res.json({
                        success: false,
                        message: 'Failed to authenticate token',
                        val: 'failtok'
                    });
                    return;
                } else {
                    req.decoded = decoded;
                    next();
                }
            });
        } else {
            console.log('No token provided.');
            res.json({
                success: false,
                message: 'No token provided.',
                val: 'notok'
            });
        }
    });

    /**
     * @description To train project
     * Pros to paron einai POST stelnw stoixeia apo front p dn xriazete
     */
    dashRouter.route('/train/:user_id/:project_id')

        .post(function (req, res) {
            console.log('Admin wants to train project')

            User.findById(req.params.user_id, function (err, user) {

                if (err) {
                    console.log(err);
                    return res.json(err);
                }

                if (!user) {
                    console.log('Admin userid not found');
                    res.json({
                        success: false,
                        message: 'Your id is invalid'
                    });

                } else {

                    let _projectIndex = arrIdFromJsonArray(user.projects).indexOf(req.params.project_id);

                    // Load all keystroke data for this track_code
                    KeystrokeDataModel.find({
                        track_code: user.projects[_projectIndex].track_code
                    }, function (err2, docs) {
                        if (err2) return res.send(err2)
                        if (docs.length == 0) {
                            res.json({
                                success: false,
                                message: 'No subjects data'
                            })
                        } else {

                            const timingLimits = req.body.project.timing_limits;

                            pyextract(docs, timingLimits, true, function (errn, data) {
                                if (errn) {
                                    console.log(errn);
                                    return res.send(errn);
                                }
                                // Update trained flags
                                for (let i = 0; i < docs.length; i++) {
                                    docs[i].is_trained = true;
                                    docs[i].save();
                                }
                                user.projects[_projectIndex] = req.body.project;
                                user.projects[_projectIndex].last_train_date = new Date();
                                user.save()

                                res.json({
                                    success: true,
                                    message: 'Project Trained SuccessFully.'
                                });
                            });
                        }
                    })

                }

            });
        });

    /**
     * @description To get all subjects summary
     */
    dashRouter.route('/get-subjects-summary/:user_id/:project_id')

        .get(function (req, res) {
            console.log('Admin want summary of subjects.')
            User.findById(req.params.user_id, function (err, user) {

                if (err) {
                    console.log(err);
                    return res.json(err);
                }

                if (!user) {
                    console.log('Admin userid not found');
                    res.json({
                        success: false,
                        message: 'Your id is invalid'
                    });

                } else {

                    let _projectIndex = arrIdFromJsonArray(user.projects).indexOf(req.params.project_id);

                    // Load all keystroke data for this track_code
                    KeystrokeDataModel.find({
                        track_code: user.projects[_projectIndex].track_code
                    }, function (err2, docs) {
                        if (err2) return res.send(err2)
                        if (docs.length == 0) {
                            res.json({
                                success: false,
                                val: 'no-subjects',
                                message: 'No subjects data'
                            })
                        } else {

                            const timingLimits = user.projects[_projectIndex].timing_limits;
                            pyextract(docs, timingLimits, false, function (errn, data) {

                                if (errn) {
                                    console.log(errn);
                                    return res.send(errn);
                                }
                                console.log('Constructing summary for each subject');
                                summary = [];

                                for (let i = 0; i < docs.length; i++) {

                                    // First-last keystroke date and total keystorkes
                                    _firstKeystrokeDate = docs[i].sessions.data[0].timestamp;
                                    _lastKeystrokeDate = docs[i].sessions.data[docs[i].sessions.data.length - 1].timestamp;
                                    _totalKeystrokes = Math.floor(docs[i].sessions.data.length / 2);
                                    _rejections = docs[i].rejections;
                                    _isTrained = docs[i].is_trained;

                                    // Get also some di summ
                                    summary.push(Object.assign({
                                        subject: docs[i].subject,
                                        _id: docs[i]._id,
                                        totalKeystrokes: _totalKeystrokes,
                                        firstKeystrokeDate: _firstKeystrokeDate,
                                        lastKeystrokeDate: _lastKeystrokeDate,
                                        rejections: _rejections,
                                        isTrained: _isTrained
                                    }, digraphsSummary(data[i])))
                                }

                                res.json({
                                    success: true,
                                    summary: summary
                                });
                            });
                        }
                    })

                }

            });
        });

    /**
     * @description To get all subjects timings to the front end
     */
    dashRouter.route('/get-subjects-timings/:user_id/:project_id')

        .get(function (req, res) {
            console.log('Admin wants to get all subject-timings')

            User.findById(req.params.user_id, function (err, user) {

                if (err) {
                    console.log(err);
                    return res.json(err);
                }

                if (!user) {
                    console.log('Admin userid not found');
                    res.json({
                        success: false,
                        message: 'Your id is invalid'
                    });

                } else {

                    let _projectIndex = arrIdFromJsonArray(user.projects).indexOf(req.params.project_id);

                    // Load all keystroke data for this track_code
                    KeystrokeDataModel.find({
                        track_code: user.projects[_projectIndex].track_code
                    }, function (err2, docs) {
                        if (err2) return res.send(err2)
                        if (docs.length == 0) {
                            res.json({
                                success: false,
                                message: 'No subjects data'
                            })
                        } else {
                            const timingLimits = user.projects[_projectIndex].timing_limits;
                            pyextract(docs, timingLimits, false, function (errn, data) {
                                // Send back all data!
                                if (errn) {
                                    console.log(errn);
                                    return res.send(errn);
                                }
                                res.json({
                                    success: true,
                                    subjectsTimings: data
                                });
                            });
                        }
                    })

                }

            });
        });


    return dashRouter;
};





//=============================================================================
//=============================================================================
// Inline Functions

/**
 * Returns the id from jsonArray that matches the expression
 * @param {*} objArr 
 */
function arrIdFromJsonArray(objArr) {
    return objArr.map(a => String(a._id))
}


/**
 * 
 */
function pyextract(docs, timingLimits, writeExtractedToJson = false, callback) {
    console.log('Calling python script to extract.');
    var options = {
        mode: 'json',
        scriptPath: '././python_scripts/'
    };

    var pyshell = new PythonShell('extract.py', options);

    pyshell.send({
        docs: docs,
        writeExtractedToJson: writeExtractedToJson,
        timing_limits: timingLimits
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
            callback(false, message.data);
        }
    });
}


/**
 * @param sed (jsonarr) {"subject","track_code", "data":[{"points":[],"digraph":''}]}
 * @returns (jsonarr)  {totalUniqueDigraphs:Number, top5: [digraph,samples],avgSamplesPerDigraph:number }
 */
function digraphsSummary(sed) {

    ret = {}

    // Get total digraphs
    totalUniqueDigraphs = sed.data.length

    // Get the top5 digraphs
    function sortByKey(array, key) {
        return array.sort(function (a, b) {
            var x = a[key];
            var y = b[key];
            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        });
    }
    diLengths = sortByKey(sed.data.map(function (d) {
        return {
            samples: d.points.length,
            digraph: d.digraph
        }
    }), 'samples')
    top5 = []
    for (let j = 0; j < 5; j++) {
        top5.push({
            digraph: diLengths[j].digraph,
            samples: diLengths[j].samples
        })
    }

    // Get average samples per di
    _lns = diLengths.map(function (di) {
        return di.samples
    })
    avgSamplesPerDigraph = arrSum(_lns) / _lns.length

    return {
        totalUniqueDigraphs: totalUniqueDigraphs,
        top5Digraphs: top5,
        avgSamplesPerDigraph: avgSamplesPerDigraph
    }


}



/**
 * 
 */
function arrSum(arr) {
    _sum = 0
    for (let i = 0; i < arr.length; i++) {
        _sum += arr[i]
    }
    return _sum
}