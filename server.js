// BASE SETUP
// ======================================
// CALL THE PACKAGES
require('dotenv').config();
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');
var config = require('./config');
var path = require('path');


const http = require('http').Server(app);

// APP CONFIGURATION ==================
// use body parser so we can grab information from POST requests
app.use(bodyParser.urlencoded({
    extended: true
})); // edw eixe false
app.use(bodyParser.json());


// configure our app to handle CORS requests
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, \
Authorization, user-key-profile-request'); // the header userKeyProfileRequest is used from cont auth website
    next();
});

// log all requests to the console
app.use(morgan('dev'));

// Connect to our database
mongoose.connect(config.database);


// set static files location
app.use(express.static(path.join(__dirname, 'dist')));
app.use("/public", express.static(__dirname + "/public_scripts")); // edw 8a einai to keystroke public script collector


// Get our API routes
var apiRoutes = require('./server/routes/api')(app, express);
app.use('/api', apiRoutes);
// Get our Dash routes
var dashRoutes = require('./server/routes/dash')(app, express);
app.use('/dash', dashRoutes);
//Get our collect routes
var collectRoutes = require('./server/routes/collect')(app, express);
app.use('/collect', collectRoutes);
// Get our misc routes
var miscRoutes = require('./server/routes/misc')(app, express);
app.use('/misc', miscRoutes);

// MAIN CATCHALL ROUTE ---------------
// SEND USERS TO FRONTEND ------------
// has to be registered after API ROUTES
app.get('*', function (req, res) {
    //res.sendFile(path.join(__dirname + '/public/app/views/index.html'));
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});



// START THE SERVER
// ====================================
http.listen(config.port, function () {
    console.log('listening on ' + config.port);
});