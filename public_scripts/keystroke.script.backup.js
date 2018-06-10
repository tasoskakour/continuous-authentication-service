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

// Used to periodically send data
var sendDataInterval = 0;
var KEYSTROKE_DATA_LENGTH_LIMIT = 20; // how much data should be in the buffer before to send
var SEND_DATA_EVERY_N_MILLISECONDS = -1; // send data every n milliseconds (loaded from server)
var SEND_DATA_EVERY_N_MILLISECONDS_BACKUP = -1;

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
var RANDOM_SENTENCE_RETAKE_MAXIMUM_LENGTH = 40;
// var KEYSTROKE_DATA_COLLECT_LIMIT_RETAKE_OFFSET = 7;
//console.log('Server requests TO: ' + cont_auth_server_url);

// used for detection of token/log-in/username session etc:
var currentUser = {
    'username': '',
    'token': ''
};
var loggedInFlag = false;


// Used for impostor detection etc
var insideImpostorModalFlag = false; // Becomes true when impostor modal is activated


/* Load the keystroke_code_collect_limit  from the server */
getKeystrokeDataCollectIntervalValue();

// **** There is a possibility that the user initiates the page while is stil logged in.
// That can happen if the user clicks the refresh button while he is still logged in, then the script will incorrectly
// wait for a login click event, but the user is already logged in!
// So just on a page initiation check for a username 
findUsername();



// ============================================================================================================================
/***********RxJs Event Listeners and  Subscribers *************/

/**
 * Is called when the users tries to close the tab/browser forcefully.
 * Is used to send any data left before the user has left.
 */
window.addEventListener('beforeunload', function (event) {

    // Check if user tries to "escape" the impostor modal procedure
    if (insideImpostorModalFlag) {
        console.log('Keyguard Script: User tries to escape');
        sessionStorage.clear();
        // event.preventDefault();
    } else {
        if (keystrokeData.length > 0 && loggedInFlag) {
            sendData(force = true);
            //resetKeystrokeData();
            // sessionStorage.clear(); // safety
            console.log('Keyguard Script: onBeforeUnload -> Data Sent');
            event.preventDefault();
        }
    }

});

/**
 * It fires  when login is detected
 * @param token: The token that will be decoded to get subjects username
 */
function keyGuardLoginProcedureStart(aToken) {
    console.log('Keyguard Script: Login Detected');
    findUsername(aToken);
}

/**
 * It fires when logout is detected
 */
function keyGuardLogoutProcedureStart() {
    console.log('Keyguard Script: Logout Detected');
    clearTimerSendData();

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
        // console.log(keyEvent);
        if (keyEvent.keyCode !== 91 && keyEvent.keyCode !== 92 && keyEvent.keyCode !== 18 && keyEvent.keyCode !== 17 && keyEvent.keyCode !== 93 && keyEvent.keyCode !== 9) {
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
        // console.log(keyEvent);
        if (keyEvent.keyCode !== 91 && keyEvent.keyCode !== 92 && keyEvent.keyCode !== 18 && keyEvent.keyCode !== 17 && keyEvent.keyCode !== 93 && keyEvent.keyCode !== 9) {
            onKeyUpProcedure(keyEvent);
        }
    },
    function (err) {
        console.log('Error in keyup event: ' + err);
    });



// =====================================================================================================================================
/******************************Functions **************************/

/**
 * Loads the keystroke code collect limit for this track_code from the keyguard-server (set by admin)
 */
function getKeystrokeDataCollectIntervalValue() {
    Rx.DOM.get({
            url: cont_auth_server_get_keystroke_code_limit,
            headers: myheaders
        })
        .subscribe(
            function (data) {
                res = JSON.parse(data.response);
                if (res.success == true) {
                    SEND_DATA_EVERY_N_MILLISECONDS = 1000 * Number(res.keystroke_data_collect_every_n_seconds);
                    SEND_DATA_EVERY_N_MILLISECONDS_BACKUP = 1000 * Number(res.keystroke_data_collect_every_n_seconds);
                    console.log('Keyguard Script: SEND_DATA_EVERY_N_MILLISECONDS Loaded to: -> ' + String(SEND_DATA_EVERY_N_MILLISECONDS))
                } else {
                    console.log('Keyguard Script: Problem with collect keystroke code limit');
                    SEND_DATA_EVERY_N_MILLISECONDS = 5000;
                    SEND_DATA_EVERY_N_MILLISECONDS_BACKUP = 5000;
                    console.log(res);
                }
                if (loggedInFlag) {
                    startTimerSendData(SEND_DATA_EVERY_N_MILLISECONDS);
                } // because when username was found, the send_dataevery... value was not ready yet
            },
            function (error) {
                SEND_DATA_EVERY_N_MILLISECONDS = 5000;
                SEND_DATA_EVERY_N_MILLISECONDS_BACKUP = 5000;
                console.log('Keyguard Script: Error at get keystroke code collect limit');
                console.log(error);
            });
}

/**
 * Is called on the keyUp Event.
 * Is used to log the keystroke data
 * @param {Event} e The KeyboardEvent
 */
function onKeyUpProcedure(e) {

    if (loggedInFlag) {

        logKeystrokeUpData(e);

    } else {

        /* At this point user typed on keyboard without being logged in
            Log the keystrokes, only for the keystroke-auth-box section (not for username or password)
        */
        if (e.target.classList.contains('keystroke-auth-box-user-feedback')) {
            logKeystrokeUpData(e);
        }

    }

}

/**
 * Is called on the keyDown Event.
 * Is used to log the keystroke data
 * @param {Event} e The KeyboardEvent
 */
function onKeyDownProcedure(e) {

    if (loggedInFlag) {

        logKeystrokeDownData(e);

    } else {

        /* At this point user typed on keyboard without being logged in
            Log the keystrokes, only for the keystroke-auth-box section (not for username or password)
        */
        if (e.target.classList.contains('keystroke-auth-box-user-feedback')) {
            logKeystrokeDownData(e);
        }

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
    // console.log('key down')
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
    // console.log('Key up')
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

    resetKeystrokeData();

    Rx.DOM.post({
            url: cont_auth_server_collect_url,
            body: dataBody,
            headers: myheaders
        })
        .subscribe(
            function (data) {
                res = JSON.parse(data.response);

                /* Check if there is an alert for the user -*/
                if (res.alert == true && loggedInFlag) {
                    if (res.isImpostor == true) {
                        console.log('Keyguard Script Server: User is impostor!');
                        // Check if maybe impostor modal is already activated
                        if (!insideImpostorModalFlag) {
                            activateImpostorModal();
                        } else {
                            // At this point, user was detected as impostor in the past, and didn't pass the retake-test.
                            // So drop him out of the system (back to log-in page)
                            deactivateImpostorModal();
                            activateUserRejectedModal();
                            setTimeout(function () {
                                window.location.replace(window.location.origin + '/login');
                            }, 4500);
                        }
                    } else {
                        if (res.not_enough_training == true) {
                            alert('Impostor Alert Failed: Not enough training to test the data!!!');
                        }
                    }
                    // PROSOXI TI GINETE AN DN EXW ENOUGGH TRAINING????
                } else {
                    if (!insideImpostorModalFlag) {
                        // all good
                        //console.log(res.message);
                    } else {
                        // User was detected as impostor in the past, and DID pass the retake-test.
                        // So deactivate impostor modal and continue.
                        deactivateImpostorModal();
                        insideImpostorModalFlag = false;
                        activateUserRetakeSuccessModal();
                        resetKeystrokeData();

                        // KEYSTROKE_DATA_COLLECT_LIMIT = KEYSTROKE_DATA_COLLECT_LIMIT_BACKUP;
                    }

                }

            },
            function (err) {
                console.log('Error at ajax POST: ');
                console.log(err);
            }
        );

}


/**
 * 
 * @param {string} token The token if provided
 */
function findUsername(token_ = '') {
    console.log('Keyguard Script: findUsername Fired.');

    // If token isn't provided try to parse it from sessionStorage
    if (token_ == '') {
        try {
            let tmp_currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            token_ = tmp_currentUser.token;
        } catch (errorr) {
            console.log('Keyguard Script: CurrentUser is null at sessionStorage.');
            return;
        }
    }

    // Extract username from token
    try {
        let decode_tok = jwt_decode(token_);
        let tmp_username = decode_tok['username'];
        if (tmp_username === undefined) {
            console.log('Keyguard Script: No username in this jwt-token');
        } else {
            console.log('Keyguard Script: Username found -> ' + tmp_username);
            currentUser.token = token_;
            currentUser.username = tmp_username;

            // Update variables
            loggedInFlag = true;

            // Send data and start periodically sending data
            if (keystrokeData.length > 0) {
                sendData(force = true);
            }
            // resetKeystrokeData();
            if (SEND_DATA_EVERY_N_MILLISECONDS != -1) {
                startTimerSendData(SEND_DATA_EVERY_N_MILLISECONDS);
            } // if == -1 then it means that script hasn't loaded the intervalPeriod yet, so it will the timer will be set on getKeystrokeDataLimitFunction


        }
    } catch (errr) {
        console.log('Keyguard Script: Invalid jwt-token');
        console.log(errr);
    }

}


/**
 *  Called when a user do not pass the keystroke authentication test
 */
function activateImpostorModal() {
    // console.log('Keyguard Script: Inside activate Impostor Modal...');
    insideImpostorModalFlag = true;

    // Load html modal
    if (!document.getElementById('keyguardScriptImpostorModal')) {
        $(document.body).append('\
        <div class="modal" id="keyguardScriptImpostorModal">\
          <div class="modal-dialog">\
            <div class="modal-content">\
              <div class="modal-header" style="text-align:center;">\
                 <i class="fa fa-hand-paper-o fa-4x" style="color:red;" aria-hidden="true"></i>\
                <h3 class="modal-title" style="font-weight:bold;">&nbsp;Keystroke Authentication Failed!</h3>\
              </div>\
              <div class="modal-body">\
                 <p style="text-align:center;margin-top:-10px;font-size:14px;">You are requested to <strong>type the text below</strong> , in order to continue browsing this website.</p>\
                <br>\
                <div class="retake-access-container" style="border-radius:7px;background-color:rgba(0, 0, 0,0.84);padding:25px 8px 30px 8px;">\
                  <div class="retake-p-input" style="text-align:center;">\
                     <p id="keyguardScriptretakeP" style="font-size:20px;color:white;"><img src="data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA=="></p>\
                  </div>\
                  <div class="retake-input" style="text-align:center;">\
                     <input id="keyguardScriptretakeInput" ondrop="return false" onpaste="return false" placeholder="start typing..." style="width:90%;color:black;font-size:20px;">\
                  </div>\
                </div>\
             </div>\
            </div>\
          </div>\
        </div>')

        // Animation Loader inside input, activated on click (before user starts to type sth)
        $("#keyguardScriptretakeInput").on("click", function () {
            $('#keyguardScriptretakeInput').css({
                "background-image": "url(\'http://loadinggif.com/images/image-selection/3.gif\')",
                "background-size": "25px 25px",
                "background-position": "right center",
                "background-repeat": "no-repeat",
            })
        });
    } else {
        // reset loading, html modal is already ready
        $('#keyguardScriptretakeP').html('<img src="data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA==">');
        $('#keyguardScriptretakeInput').css({
            "background-image": "",
            "background-size": "",
            "background-position": "",
            "background-repeat": "",
        })
    }



    // Clear the input for safety
    $('#keyguardScriptretakeInput').val('');

    // Pop modal
    $("#ngx-app-container-wrapper").css("opacity", "0");
    $('#keyguardScriptImpostorModal').modal({
        backdrop: 'static',
        keyboard: false
    })

    // Load a random quote.
    var randomSentence = '...';
    Rx.DOM.get({
        url: cont_auth_server_get_random_sentence + '/' + String(RANDOM_SENTENCE_RETAKE_MAXIMUM_LENGTH),
        headers: myheaders
    }).subscribe(
        function (data) {
            res = JSON.parse(data.response);
            if (res.success == true) {
                randomSentence = res.sentence;
                $('#keyguardScriptretakeP').text(randomSentence);
                // Reset keystroke data and adjust keystroke code length limit
                resetKeystrokeData();
                resetT1();
                // KEYSTROKE_DATA_COLLECT_LIMIT = (randomSentence.length) - (randomSentence.split(' ').length - 1) - KEYSTROKE_DATA_COLLECT_LIMIT_RETAKE_OFFSET;
            }
        },
        function (error) {
            console.log(error);
            randomSentence = 'hello world'
            $('#keyguardScriptretakeP').text(randomSentence);
            resetKeystrokeData();
            resetT1();
            // KEYSTROKE_DATA_COLLECT_LIMIT = (randomSentence.length) - (randomSentence.split(' ').length - 1) - KEYSTROKE_DATA_COLLECT_LIMIT_RETAKE_OFFSET;
        }
    )

}

/**
 * Closes impostor modal
 */
function deactivateImpostorModal() {
    $('#keyguardScriptImpostorModal').modal('hide');
    $("#ngx-app-container-wrapper").css("opacity", "1");
}


/**
 * Activates the user rejected modal for a period of ms
 * @param {number} ms
 */
function activateUserRejectedModal() {
    $(document.body).append('\
    <div class="modal" id="keyguardScriptUserRejectedModal">\
      <div class="modal-dialog">\
        <div class="modal-content">\
          <div class="modal-header" style="text-align:center;">\
            <i class="fa fa-ban fa-4x" style="color:red;" aria-hidden="true"></i>\
            <h2 class="modal-title" style="font-weight:bold;">&nbsp;You are rejected!</h2>\
            <p style="font-style:italic;">You will be redirected back to login page.</p>\
          </div>\
        </div>\
      </div>\
    </div>')
    $("#ngx-app-container-wrapper").css("opacity", "0");
    $('#keyguardScriptUserRejectedModal').modal({
        backdrop: 'static',
        keyboard: false
    });
}

/**
 * DeactivatesUserRejectedModal
 */
function deactivateUserRejectedModal() {
    $('#keyguardScriptUserRejectedModal').modal('hide');
    $("#ngx-app-container-wrapper").css("opacity", "1");
}


/**
 *  Activates the user Retake Modal when user pass the retake test.
 */
function activateUserRetakeSuccessModal() {

    if (!document.getElementById('keyguardScriptUserRetakeSuccessModal')) {
        $(document.body).append('\
        <div class="modal" id="keyguardScriptUserRetakeSuccessModal">\
          <div class="modal-dialog">\
            <div class="modal-content">\
              <div class="modal-header" style="text-align:center;">\
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>\
                 <i class="fa fa-check-circle fa-4x" aria-hidden="true" style="color:green;"></i>\
                <h2 class="modal-title" style="font-weight:bold;">You passed the test!</h2>\
              <p style="font-style:italic;">You can continue browsing this website.</p>\
                <div align="right"><button type="button" class="btn btn-default"  data-dismiss="modal">Close</button></div>\
              </div>\
            </div>\
          </div>\
        </div>')
    }

    $("#ngx-app-container-wrapper").css("opacity", "1");
    $('#keyguardScriptUserRetakeSuccessModal').modal('show');
}


/**
 * Starts timer to send data
 */
function startTimerSendData(ms) {
    if (sendDataInterval != 0) {
        clearInterval(sendDataInterval);
        sendDataInterval = 0;
    }
    console.log('KeyguardScript: Send data interval set every ' + String(ms / 1000) + ' seconds');
    sendDataInterval = setInterval(sendData, ms);
}

/**
 * Clears timer send data
 */
function clearTimerSendData() {
    if (sendDataInterval != 0) {
        clearInterval(sendDataInterval);
        sendDataInterval = 0;
    } else {
        console.log('KeyguardScript on ClearTimerSendData(): Warning, clear Timer was called, when timer was already cleared.')
    }
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
    currentUser.token = '';
    currentUser.username = '';
    loggedInFlag = false;
}