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

    var apiRouter = express.Router();

    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/authenticate
     * Used to authenticate users
     */
    apiRouter.post('/authenticate', function (req, res) {
        console.log('yea');
        User.findOne({
            username: req.body.username
        }).select('username firstname lastname password date projects').exec(function (err, user) {
            if (err) return res.send(err);
            if (!user) {
                res.json({
                    success: false,
                    message: 'Authentication failed. User not found.'
                });
            } else if (user) {
                var validPassword = user.comparePassword(req.body.password);
                if (!validPassword) {
                    res.json({
                        success: false,
                        message: 'Authentication failed. Wrong password.'
                    });
                } else {
                    var token = jwt.sign({
                        username: user.username
                    }, superSecret, {
                            expiresIn: '300d'
                        });
                    console.log(user);
                    res.json({
                        success: true,
                        message: 'Enjoy your token!',
                        token: token,
                        username: user.username,
                        firstname: user.firstname,
                        lastname: user.lastname,
                        _id: user._id,
                        date: user.date,
                        projects: user.projects
                    });
                }
            }
        });
    });


    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * Route middleware for all api requests
     */
    apiRouter.use(function (req, res, next) {
        console.log('Somebody just came to our app!');
        if ((req.path != '/users') || (req.method != 'POST')) {
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
        } else {
            console.log('User wants to register');
            next();
        }
    });



    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/users
     * Register users
     */
    apiRouter.route('/users')
        // create a user (accessed at POST http://localhost:8080/api/users)
        .post(function (req, res) {
            var user = new User();
            user.username = req.body.username;
            user.firstname = req.body.firstname;
            user.lastname = req.body.lastname;
            user.password = req.body.password;
            user.save(function (err) {
                if (err) {
                    if (err.code == 11000)
                        return res.json({
                            success: false,
                            message: 'A user with that username already exists. '
                        });
                    else
                        return res.send(err);
                }
                res.json({
                    success: true,
                    message: 'User created!'
                });
            });
        })

        // get all the users (accessed at GET http://localhost:8080/api/users)
        .get(function (req, res) {
            User.find(function (err, users) {
                if (err) res.send(err);
                // return the users
                res.json(users);
            });
        });


    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/users/:user_id
     * To work with specific user ids
     */
    apiRouter.route('/users/:user_id')
        // (accessed at GET http://localhost:8080/api/users/:user_id)
        .get(function (req, res) {
            User.findById(req.params.user_id, function (err, user) {
                if (err) res.send(err);
                console.log('response from server');
                console.log(JSON.stringify(user))
                res.json(user);
            });
        })

        // update the user with this id
        // (accessed at PUT http://localhost:8080/api/users/:user_id)
        .put(function (req, res) {
            User.findById(req.params.user_id, function (err, user) {
                if (err) res.send(err);
                if (req.body.firstname) user.firstname = req.body.firstname;
                if (req.body.lastname) user.lastname = req.body.lastname;
                if (req.body.username) user.username = req.body.username;
                user.save(function (err) {
                    if (err) res.send(err);
                    res.json({
                        success: true,
                        message: 'User updated!',
                        user: user
                    });
                });
            });
        })

        // delete the user with this id
        // (accessed at DELETE http://localhost:8080/api/users/:user_id)
        .delete(function (req, res) {
            User.remove({
                _id: req.params.user_id
            }, function (err, user) {
                if (err) return res.send(err);
                res.json({
                    message: 'Successfully deleted'
                });
            });
        });

    // api endpoint to get user information
    apiRouter.get('/me', function (req, res) {
        res.send(req.decoded);
    });


    //----------------------------------------------------------------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------------------------------------------------------------

    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/project/:user_id
     * To create a new project
     */
    apiRouter.route('/project/:user_id')
        .post(function (req, res) {
            console.log('User wants to create new project');
            console.log(req.body);
            User.findById(req.params.user_id, function (err, user) {
                if (err) return res.send(err);
                if (!user) {
                    res.json({
                        success: false,
                        message: 'No user with this id exists'
                    });
                } else {
                    var proj = {
                        siteurl: req.body.siteurl,
                        track_code: req.body.siteurl.hashCode()
                    };
                    user.projects.push(proj);
                    user.save(function (err) {
                        if (err) return res.send(err);
                        res.json({
                            success: true,
                            message: 'Project created succesfully',
                            project: user.projects[user.projects.length - 1]
                        });
                    });

                }
            });
        });


    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/projects/:user_id
     * To get all projects of a user
     */
    apiRouter.route('/projects/:user_id')
        .get(function (req, res) {
            console.log('User wants all his projects');
            User.findById(req.params.user_id, function (err, user) {
                if (err) return res.send(err);
                if (!user) {
                    res.json({
                        success: false,
                        message: 'No user with this username exists'
                    });
                } else {
                    res.json({
                        success: true,
                        projects: user.projects
                    });
                }
            });
        });



    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/project/:user_id/:project_id
     * GET: to get an existing project
     * PUT: to edit an existing project
     * DELETE: to delete an existing project
     * req.body: {project: {....}}
     */
    apiRouter.route('/project/:user_id/:project_id')
        .get(function (req, res) {
            console.log('User wants to get an existing project');
            User.findById(req.params.user_id, function (err, user) {
                if (err) return res.send(err);
                if (!user) {
                    res.json({
                        success: false,
                        message: 'Wrong user id'
                    })
                } else {
                    res.json({
                        success: true,
                        project: user.projects[arrIdFromJsonArray(user.projects).indexOf(req.params.project_id)]
                    })
                }
            });
        })


        .put(function (req, res) {
            console.log('User wants to edit an existing project');
            console.log(req.body);

            if (req.body.project == undefined) {
                return res.json({
                    success: false,
                    message: 'Project missing from body.'
                })
            }

            User.findById(req.params.user_id, function (err, user) {
                if (err) return res.send(err);
                if (!user) {
                    res.json({
                        success: false,
                        message: 'No user with this id exists'
                    });
                } else {
                    // Get the project with the specific project_id
                    let _projectIndex = arrIdFromJsonArray(user.projects).indexOf(req.params.project_id);
                    var track_code_changed_flag = false;
                    if (_projectIndex !== -1) {
                        bodyProject = req.body.project;
                        let _project = user.projects[_projectIndex];
                        if (bodyProject.siteurl !== undefined) {
                            _project.siteurl = bodyProject.siteurl;
                            _project.track_code = bodyProject.siteurl.hashCode();
                            track_code_changed_flag = true;
                        }
                        if (bodyProject.testing_threshold) _project.testing_threshold = bodyProject.testing_threshold;
                        if (bodyProject.enable_keyguard_auth_flag !== undefined) {
                            _project.enable_keyguard_auth_flag = bodyProject.enable_keyguard_auth_flag;
                        }
                        if (bodyProject.keystroke_data_collect_every_n_seconds) _project.keystroke_data_collect_every_n_seconds = bodyProject.keystroke_data_collect_every_n_seconds;

                        if (bodyProject.timing_limits) {
                            _project.timing_limits = bodyProject.timing_limits;
                        }
                        if (bodyProject.training_algorithm) {
                            _project.training_algorithm = bodyProject.training_algorithm;
                        }
                        if (bodyProject.training_params) {
                            _project.training_params = bodyProject.training_params;
                        }

                        user.projects[_projectIndex] = _project;
                        user.save(function (err1) {
                            if (err1) return res.send(err1);
                            res.json({
                                success: true,
                                track_code_changed_flag: track_code_changed_flag,
                                message: 'Project changed succesfully',
                                project: user.projects[_projectIndex]
                            });
                        })
                    } else {
                        res.json({
                            success: false,
                            message: 'Project id invalid'
                        })
                    }

                }
            });
        })


        .delete(function (req, res) {
            console.log('User wants to delete an existing project');
            User.findById(req.params.user_id, function (err, user) {
                if (err) return res.send(err);
                if (!user) {
                    res.json({
                        success: false,
                        message: 'Wrong user id'
                    })
                } else {
                    let _projectIndexToRemove = arrIdFromJsonArray(user.projects).indexOf(req.params.project_id);
                    const track_code_to_delete = user.projects[_projectIndexToRemove].track_code;
                    let tmp = user.projects;
                    tmp.splice(_projectIndexToRemove, 1);
                    user.projects = tmp;
                    user.save(function (err) {
                        if (err) return res.send(err);

                        KeystrokeDataModel.remove({
                            track_code: track_code_to_delete
                        }, function (err2) {
                            if (err2) return res.send(err2);
                            res.json({
                                success: true,
                                message: 'Project deleted succesfully',
                                projects: user.projects
                            })
                        });
                    });
                }
            });
        })




    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/dashboard_data/:user_id/:project_id
     */
    apiRouter.route('/dashboard_data/:user_id/:project_id')

        // Accessed at DELETE  /dashboard_data/:user_id/:project_id
        // Admin wants to delete the data of his subjects for this project
        .delete(function (req, res) {

            console.log('Admin wants to delete his keystroke subjects data for his project');
            // find the admin by his id
            User.findById(req.params.user_id, function (err, user) {

                if (err) {
                    return res.json(err)
                };

                if (!user) {
                    console.log('User id not found');
                    res.json({
                        success: false,
                        message: 'Problem with your userid.'
                    });
                } else {

                    console.log(user);

                    // Get his track_code from his project
                    let _projectIndex = arrIdFromJsonArray(user.projects).indexOf(req.params.project_id);
                    if (_projectIndex == -1) {
                        return res.json({
                            success: false,
                            message: 'Project id invalid'
                        });
                    }
                    const track_code = user.projects[_projectIndex].track_code;

                    // Delete all the subjects with his track_code
                    KeystrokeDataModel.remove({
                        track_code: track_code
                    }, function (err, obj) {
                        // console.log(obj);
                        if (err) {
                            console.log(err);
                            res.json(err);
                        }
                        if (obj.result.n == 0) {
                            console.log('Nothing to remove for this track_Code' + track_code);
                            res.json({
                                success: false,
                                message: 'You do not have any data to delete!'
                            });

                        } else {
                            console.log('Remove success');
                            // Data removed, reset train flag for admin project
                            user.projects[_projectIndex].last_train_date = undefined;
                            user.save(function (err3) {
                                if (err3) return res.send(err3);
                                res.json({
                                    success: true,
                                    message: 'Data removed succesfully'
                                });
                            });
                        }
                    });
                }
            });
        });

    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/subject_data/:user_id/:subject_id/:project_id
     * project_id is only used at DELETE
     */

    apiRouter.route('/subject_data/:user_id/:subject_id/:project_id')

        // To GET the collection for the subject_id
        .get(function (req, res) {
            console.log('User wants to download subjects data');
            console.log(req.params);

            // Find the user by his id
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

                    // Find the subject with the req.params.subject_id
                    KeystrokeDataModel.findOne({
                        _id: req.params.subject_id
                    }, '_id _v subject is_trained track_code sessions rejections', function (err, doc) {
                        if (err) {
                            console.log(err)
                            return res.json(err);
                        }
                        if (!doc) {
                            console.log('Subject id not found on database');
                            res.json({
                                success: false,
                                message: 'Subject id not found on database'
                            });
                        } else {
                            console.log('Sending text back');
                            // console.log(doc);
                            // First remove the sucject name from doc and then return it as text
                            fs.writeFileSync('./subjects-docs/subject-' + req.params.subject_id + '.json', beautify(doc, null, 2, 100), 'utf8');
                            res.set({
                                "Content-Disposition": "attachment"
                            });
                            res.sendFile(path.join(__dirname, '/../../subjects-docs/subject-' + req.params.subject_id + '.json'));
                        }
                    });
                }

            });

        })


        // To delete specific subject data
        .delete(function (req, res) {
            console.log('User wants to delete data from one subject');
            console.log(req.params);

            // Find the user by his id
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

                    // Find the subject with  the req.params.subject_id
                    KeystrokeDataModel.remove({
                        _id: req.params.subject_id
                    }, function (err, obj) {
                        if (err) {
                            console.log(err)
                            return res.json(err);
                        }
                        if (obj.result.n == 0) {
                            console.log('Nothing to remove for  subject' + user.track_code);
                            res.json({
                                success: false,
                                message: 'Wrong subject id'
                            });

                        } else {
                            console.log('Remove success');
                            // Data removed, You may have to reset training flag for admin
                            let _projectIndex = arrIdFromJsonArray(user.projects).indexOf(req.params.project_id);
                            if (_projectIndex == -1) {
                                return res.json({
                                    success: false,
                                    message: 'Project id invalid'
                                });
                            }
                            const track_code = user.projects[_projectIndex].track_code;
                            KeystrokeDataModel.find({
                                track_code: track_code
                            }, function (err2, docs) {
                                if (err2) return res.send(err2);
                                if (docs.length == 0) {
                                    user.projects[_projectIndex].last_train_date = undefined;
                                    user.save();
                                    res.json({
                                        success: true,
                                        train_date_reset: true,
                                        message: 'Subject removed succesfully.'
                                    })
                                } else {
                                    res.json({
                                        success: true,
                                        train_date_reset: false,
                                        message: 'Subject removed succesfully'
                                    })
                                }
                            });
                        }
                    });
                }

            });
        });


    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/gmm_data/:user_id/:subject_id/
     * TO GET THE GMM_DATA IN ORDER TO PLOT THE GAUSSIAN CURVES TO THE FRONT END
     */
    apiRouter.route('/gmm_data/:user_id/:subject_id')
        .get(function (req, res) {
            console.log('User wants to GET GMM_DATA for GMM CURVES');
            console.log(req.params);

            // Find the user by his id
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

                    // Find the subject with the req.params.subject_id
                    KeystrokeDataModel.findOne({
                        _id: req.params.subject_id
                    }, 'di_gmms', function (err, doc) {
                        if (err) {
                            console.log(err)
                            return res.json(err);
                        }
                        if (!doc) {
                            console.log('Subject id not found on database');
                            res.json({
                                success: false,
                                message: 'Subject id not found on database'
                            });
                        } else {
                            console.log('Removing nulls gmms');
                            // console.log(doc.di_gmms);
                            di_gmms_filtered = doc.di_gmms.filter(function (val) {
                                return val !== null;
                            });
                            console.log('Null gmms removed');
                            res.json({
                                success: true,
                                di_gmms: di_gmms_filtered,
                                message: 'Gaussian Mixture Data sent back successfully.'
                            })

                        }
                    });
                }

            });
        });

    /** ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     * api/gmm_data/:user_id/:project_id/
     * To get the digraph samples of all subjects of the project
     */
    apiRouter.route('/digraphs_samples/:user_id/:project_id')
        .get(function (req, res) {
            console.log('User wants Digraphs Timings Samples of Subjects');
            console.log(req.params);

            // Find the user by his id
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

                            console.log(' Calling Python To organize data  \n')
                            var options = {
                                mode: 'json',
                                scriptPath: '././python_scripts/'
                            };
                            var pyshell = new PythonShell('organize.py', options);

                            pyshell.send({
                                docs: docs,
                                writeToCsvFlag: false
                            }).end(function (err3) {
                                if (err3) console.log(err3)
                            });

                            // Log the message returned from python
                            pyshell.on('message', function (message) {

                                if (typeof message.data == 'string') {
                                    console.log(message.data);
                                } else if (typeof message.data == 'object') {
                                    // console.log(message.data)
                                    res.json({
                                        success: true,
                                        data: message.data
                                    })
                                }
                            });
                        }
                    })

                }

            });
        });




    return apiRouter;
};



// =================================================================
// ====================================================
// ===============================
// Inline Functions

/**
 * Returns the id from jsonArray that matches the expression
 * @param {*} objArr 
 */
function arrIdFromJsonArray(objArr) {
    return objArr.map(a => String(a._id))
}

/**
 * Is used to produce a hash
 */
String.prototype.hashCode = function () {
    var hash = 0;
    for (let i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = hash + chr;
    }
    hash = Math.pow(hash, 4);

    return hash.toString();
};

/**
 * Filters out noise from docs. Such as missing keyUp/keyDown events, extreme outliers, etc etc
 * @param {*} docs Array of docs of Keystrokes Models
 */
function filterNoiseFromData(docs) {
    const t1 = Date.now();
    let doc;
    let filtered;
    for (let i = 0; i < docs.length; i++) {
        doc = docs[i];
        console.log('Filtering noise from doc subject ->' + doc.subject);
        filtered = filterNoise(doc['sessions']['data']);
        if (filtered != doc['sessions']['data']) {
            // update
        }

    }

    console.log('Filter noise finished in: ' + String(Date.now() - t1) + ' ms');
}

/**
 * Input is an array of events like this: [  { event: 'keystrokeDown' or 'keystrokeUp', key: '', timestamp: ..  }   ]
 * @param {*} docs 
 */
function filterNoise(data) {
    ret = data

    return ret;
}