/**
 * Developed by Tasos Kakouris
 */

// NOTES FOR DEVELOPERS.

// -How this script logs keystroke data?
// Keystroke data are logged when user is pressing down a key (keyDown) or releasing a key (keyUp).
// For each event a timestamp is posted along with the key that is being pressed and the type of event.

// -When this script sends the data that has recorded?
// The script sends the data to the server every fixed amount of time (in seconds), if ofcourse the data are enough

console.log('Keyguard Script: Init...');
// =======================================================================
/*********** Init Settings and Variables *************/

//~~debugging
// var countDowns = 0
// var countUps = 0
//~~debugging

// used for keystroke data & logging:
var allDOMS = document.getElementsByTagName('*'); // get all DOMS
var keydownDOMObserver = Rx.DOM.keydown(allDOMS); // observe  keydown
var keyupDOMObserver = Rx.DOM.keyup(allDOMS); // observe  keyup


// var keystrokeData = [{
//     event: string (-> keyup or keydown),
//     key: string,
//     timestamp: number
// }]; // eventType = keyUp or keyDown
var keystrokeData = [];

// used for http requests
var myheaders = {
    'Content-Type': 'application/x-www-form-urlencoded'
};
let tmp = document.getElementById('contAuthServerScriptTag').src.split('/');
var cont_auth_server_url = tmp[0] + '//' + tmp[2];
var cont_auth_server_get_keystroke_code_limit = cont_auth_server_url + '/collect/' + 'get_keystroke_code_collect_limit/' + track_code
var cont_auth_server_collect_url = cont_auth_server_url + '/collect/' + 'keystrokes';
var cont_auth_server_get_random_sentence = cont_auth_server_url + '/misc/' + 'get-random-sentence'; // + '/:MAXIMUM_LENGTH

var RAT_RANDOM_SENTENCE_LOGIN_MAXIMUM_LENGTH = 60;
var RAT_LEVENSHTEIN_LIMIT = 5;
// var KEYSTROKE_DATA_COLLECT_LIMIT_RETAKE_OFFSET = 7;
//console.log('Server requests TO: ' + cont_auth_server_url);

// used for detection of username session etc:
var currentUser = {
    'username': '',
};
var loggedInFlag = false;


/* Load the keystroke_code_collect_limit  from the server */
// getKeystrokeDataCollectIntervalValue();



// ============================================================================================================================
/***********RxJs Event Listeners and  Subscribers *************/

/**
 * Is called when the users tries to close the tab/browser forcefully.
 * Is used to send any data left before the user has left.
 */
window.addEventListener('beforeunload', function (event) {

    if (keystrokeData.length > 0 && loggedInFlag) {
        sendData(force = true);
        //resetKeystrokeData();
        // sessionStorage.clear(); // safety
        console.log('Keyguard Script: onBeforeUnload -> Data Sent');
        event.preventDefault();
    }

});

/**
 * It fires  when login is detected
 * @param username: The subjects username
 */
function keyGuardLoginProcedureStart(username_) {
    console.log('Keyguard Script: Login Detected');
    keyguardSetSubjectUsername(username_);
    keyguardPopLoginModal();
}

/**
 * It fires when logout is detected
 */
function keyGuardLogoutProcedureStart() {
    console.log('Keyguard Script: Logout Detected');
    // clearTimerSendData();

    // Send what is left, user is logged out
    if (keystrokeData.length > 0) {
        sendData(force = true);
    }

    // Reset variables
    resetLogInStuff();
    resetKeystrokeData(); // isws na min xreiaazete
}



/**
 * RXJS Subscribtion to keydown.
 */
var keystrokeDOWNSubscriber = keydownDOMObserver.subscribe(
    //keyEvent => onKeyDownProcedure(keyEvent),
    function (keyEvent) {
        if (keyEvent.keyCode !== 91 && keyEvent.keyCode !== 92 && keyEvent.keyCode !== 18 && keyEvent.keyCode !== 17 && keyEvent.keyCode !== 93 && keyEvent.keyCode !== 9){
			onKeyDownProcedure(keyEvent);
        }   
    },
    function (err) {
        console.log('Error in keydown event: ' + err);
    });


/**
 * RXJS Subscribtion to keyup.
 */
var keystrokeUPSubscriber = keyupDOMObserver.subscribe(
    //keyEvent => onKeyDownProcedure(keyEvent),
    function (keyEvent) {
       if (keyEvent.keyCode !== 91 && keyEvent.keyCode !== 92 && keyEvent.keyCode !== 18 && keyEvent.keyCode !== 17 && keyEvent.keyCode !== 93 && keyEvent.keyCode !== 9){
        onKeyUpProcedure(keyEvent);
        }
    },
    function (err) {
        console.log('Error in keyup event: ' + err);
    });



// =====================================================================================================================================
/******************************Functions **************************/



/**
 * Is called on the keyUp Event.
 * Is used to log the keystroke data
 * @param {Event} e The KeyboardEvent
 */
function onKeyUpProcedure(e) {

    /* 
        Log the keystrokes, only for the keystroke-auth-box section
    */
    if (e.target.id == 'keyguardLoginModalContentMainDivInput') {
        logKeystrokeUpData(e);
    }

}

/**
 * Is called on the keyDown Event.
 * Is used to log the keystroke data
 * @param {Event} e The KeyboardEvent
 */
function onKeyDownProcedure(e) {

    if (e.target.id == 'keyguardLoginModalContentMainDivInput') {
        logKeystrokeDownData(e);
    }

}

/**
 * Is called to log Keystroke Data. The function uses Date.now().
 * @param {Event} e The keyboard event.
 */
function logKeystrokeDownData(e) {

    // Un-comment next line to log data only for letters and numbers.
    // if (!((e.keyCode >= 65 && e.keyCode <= 90) || (e.key >= '1' && e.key <= '9'))) {
    //     return;
    // }
    // console.log(e)
    if (!e.repeat) {
        keystrokeData.push({
            event: 'keystrokeDown',
            key: e.code,
            timestamp: Date.now()
        });
        // countDowns++;
    }

}

/**
 * Is called to log Keystroke Data. The function uses Date.now().
 * The flagDetermines if the function will send the data when the keystroke_code max length is reached
 * @param {Event} e The keyboard event.
 * @param {boolean} sendAfterCodeLengthLimitFlag
 */
function logKeystrokeUpData(e) {

    // Un-comment next line to log data only for letters and numbers.
    // if (!((e.keyCode >= 65 && e.keyCode <= 90) || (e.key >= '1' && e.key <= '9'))) {
    //     return;
    // }
    // console.log(e)
    keystrokeData.push({
        event: 'keystrokeUp',
        key: e.code,
        timestamp: Date.now()
    });
    // countUps++;
}



/**
 * Is called to send Data to the server. Performs Rx.DOM POST.
 * Also, according to the server response, the function may call other functions that block or allow user access.
 * @param force {boolean} Send data independendly of length limit
 */
function sendData(force = false) {

    // Check if there is enough data to send
    if (!force) {
        if ((keystrokeData.length < KEYSTROKE_DATA_LENGTH_LIMIT && loggedInFlag)) { //|| (keystrokeData.length % 2 != 0)
            // console.log('KeyguardScript at SendData: Not enough data');
            return;
        }
    }

    // perform POST request
    let dataBody = {
        track_code: track_code,
        subject: currentUser.username,
        keystrokeData: JSON.stringify(keystrokeData)
    };
    // console.log('countKeyDowns = ' + countDowns)
    // console.log('countKeyUps = ' + countUps)
    // countDowns = 0;
    // countUps = 0;
    // console.log(keystrokeData);
    resetKeystrokeData();

    Rx.DOM.post({
            url: cont_auth_server_collect_url,
            body: dataBody,
            headers: myheaders
        })
        .subscribe(
            function (data) {
                res = JSON.parse(data.response);
                // console.log(res);
            },
            function (err) {
                console.log('Error at ajax POST: ');
                console.log(err);
            }
        );

}


/**
 * 
 * @param {string} username_ 
 */
function keyguardSetSubjectUsername(username_ = '') {
    loggedInFlag = true;
    currentUser.username = username_;
    console.log('Keyguard Script: findUsername Fired. Username set to ->' + currentUser.username);
}

/**
 * Activates a modal with a sentence for keystroke dynamics auth
 */
function keyguardPopLoginModal() {
    console.log('Keyguard Script: Activating login modal...');

    // Hide the body 
    $('body').css('opacity', '0.15');

    if (document.getElementById('keyguardLoginModal') == null) {
        // Construct html
        $('keystrokedynamics').append('<div id="keyguardLoginModal"><div id="keyguardLoginModalContent"><h2 id="keyguardLoginModalContentheader">Keystroke Dynamics Authentication Layer</h2><hr/><p id="keyguardLoginModalContentSubheader">Please type the text below in order to continue</p><div id="keyguardLoginModalContentMainDiv"> <p id="keyguardLoginModalContentMainDivP"><img id="keyguardLoginModalContentMainDivPLoadingImg" src="' + cont_auth_server_url + '/public/loading.gif' + '" /></p> <input id = "keyguardLoginModalContentMainDivInput" type="text" placeholder="Type the text above here..." onpaste="return false;" ondrop="return false;"  /> <p id="keyguardLoginModalContentMainDivPError">Texts differ a lot! Please try again.</p> </div><div id="keyguardLoginModalFooter"><button id="keyguardLoginModalFooterButton">Submit</button></div></div></div>');

        // Show the modal and style it
        $('keystrokedynamics #keyguardLoginModal').css({
            'display': 'block',
            'position': 'fixed',
            'z-index': '1020',
            'padding-top': '100px',
            'left': '0',
            'top': '0',
            'width': '100%',
            'height': '100%',
            'overflow': 'auto',
            'background-color': 'rgb(0,0,0)',
            'background-color': 'rgba(0,0,0,0.4)'
        });
        $('keystrokedynamics #keyguardLoginModalContent').css({
            'background-color': '#fefefe',
            'margin': 'auto',
            'padding': '20px',
            'padding-top': '20px',
            'padding-left': '20px',
            'padding-right': '20px',
            'padding-bottom': '10px',
            'border': '1px solid #888',
            'width': '38%'
        });
        $('keystrokedynamics #keyguardLoginModalContentheader').css({
            'text-align': 'center'
        });
        $('keystrokedynamics #keyguardLoginModalContentSubheader').css({
            'text-align': 'center'
        });
        $('keystrokedynamics #keyguardLoginModalContentMainDiv').css({
            'background-color': '#262626',
            'padding-top': '10px',
            'padding-bottom': '20px',
            'padding-right': '15px',
            'padding-left': '15px',
            'border-radius': '4px'
        });
        $('keystrokedynamics #keyguardLoginModalContentMainDivPLoadingImg').css({
            'width': '30px',
            'height': 'auto',
            'text-align': 'center'
        });
        $('keystrokedynamics #keyguardLoginModalContentMainDivP').css({
            'color': 'white',
            'font-size': '19px',
            'text-align': 'center'
        });
        $('keystrokedynamics #keyguardLoginModalContentMainDivInput').css({
            'font-size': '18px',
            'width': '98%',
            'color': 'black'
        });
        $('keystrokedynamics #keyguardLoginModalContentMainDivPError').css({
            'display': 'none',
            'font-size': '15px',
            'color': '#ffd906',
            'text-align': 'center',
            'margin-bottom': '0px'
        });
        $('keystrokedynamics #keyguardLoginModalFooter').css({
            'text-align': 'center',
            'margin-top': '15px'
        });
        $('keystrokedynamics #keyguardLoginModalFooterButton').css({
            'background-color': '#e7e7e7',
            'border': '1px solid #242424',
            'color': 'black',
            'padding-top': '8px',
            'padding-bottom': '8px',
            'padding-right': '12px',
            'padding-left': '12px',
            'font-size': '16px',
            'cursor': 'pointer',
            'border-radius': '4px'
        });

        // Attach listener to submit button
        $('keystrokedynamics #keyguardLoginModalFooterButton').click(function () {
            // Check if MED of input val and the random sentence
            if (levenshtein($('keystrokedynamics #keyguardLoginModalContentMainDivInput').val(), $('keystrokedynamics #keyguardLoginModalContentMainDivP').text()) <= RAT_LEVENSHTEIN_LIMIT) {
                // Close the Modal and send data
                $('keystrokedynamics #keyguardLoginModal').css('display', 'none');
                // Show the body 
                $('body').css('opacity', '1');
                sendData(force = true);
            } else {
                console.log('Levenshtein >5')
                $('keystrokedynamics #keyguardLoginModalContentMainDivPError').css('display', 'block');
                setTimeout(function () {
                    $('keystrokedynamics #keyguardLoginModalContentMainDivPError').css('display', 'none');
                }, 1800)
            }
        });

    } else {
        // Re-show modal
        $('keystrokedynamics #keyguardLoginModal').css('display', 'block');
        // Clear the random sentence
        $('keystrokedynamics #keyguardLoginModalContentMainDivP').text('');
        // Reload the loading gif
        $('keystrokedynamics #keyguardLoginModalContentMainDivPLoadingImg').css('display', 'inline')
    }

    // Clear the input for safety
    $('keystrokedynamics #keyguardLoginModalContentMainDivInput').val('');


    // Fill the p with a random sentence
    loadRandomSentenceFromServer(RAT_RANDOM_SENTENCE_LOGIN_MAXIMUM_LENGTH, function (err, val) {
        if (err) {
            console.log('Keyguard Script: Error in loadRandomSentenceFromServer ->')
            console.log(err)
            $('keystrokedynamics #keyguardLoginModalContentMainDivP').text('Hello darkness my old friend')
        } else {
            $('keystrokedynamics #keyguardLoginModalContentMainDivPLoadingImg').css('display', 'none')
            $('keystrokedynamics #keyguardLoginModalContentMainDivP').text(val)
        }
    });



}


/**
 * Loads a random sentence from the server
 * @param maximumLength: The maximum length of the sentence
 */
function loadRandomSentenceFromServer(maximumLength, callback) {
    Rx.DOM.get({
        url: cont_auth_server_get_random_sentence + '/' + String(maximumLength),
        headers: myheaders
    }).subscribe(
        function (data) {
            res = JSON.parse(data.response);
            if (res.success == true) {
                callback(false, res.sentence);
                // $('#keyguardScriptretakeP').text(randomSentence);
                // Reset keystroke data and adjust keystroke code length limit
                // resetKeystrokeData();
                // resetT1();
                // KEYSTROKE_DATA_COLLECT_LIMIT = (randomSentence.length) - (randomSentence.split(' ').length - 1) - KEYSTROKE_DATA_COLLECT_LIMIT_RETAKE_OFFSET;
            } else {
                callback(res);
            }
        },
        function (error) {
            callback(error);
            // console.log(error);
            // randomSentence = 'hello world'
            // $('#keyguardScriptretakeP').text(randomSentence);
            // resetKeystrokeData();
            // resetT1();
        }
    )
}




/**
 * Resets keystroke data
 */
function resetKeystrokeData() {
    keystrokeData = [];
}


/**
 * Resets log in flags
 */
function resetLogInStuff() {
    currentUser.username = '';
    loggedInFlag = false;
}
