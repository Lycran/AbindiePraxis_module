/**
 * Created by hgessner on 01.05.2016.
 */
define([
    'jquery',
    'underscore',
    'utils'
], function( $, _, utils) {

    var ERROR_TECHNICAL = 1;
    var ERROR_CREDENTIALS = 2;
    var ERROR_USER_CANCELLED = 3;

    /*
    Moodle token retrieval and Moodle SSO login, general process
    1. Call the Moodle plugin
      1.1 If a login is required the browser gets redirected to the Moodle login page
      1.2 If the user is already logged in, a token is retrieved and the process ends
    2. On the Moodle login page the SSO / IdP login link must be followed
    3. Once in the login mask the credentials have to be inserted and the login form must be submitted.
      3.1 If the login succeeds we are taken to the next step
      3.2 If the login fails, we are taken back to the login mask
    4. If the user logs into Moodle for the first time, an attribute release has to be accepted before we are taken back to the Moodle plugin
    If the user decides to close the browser window while a login is running, an error is issued.
     */
    var actions = {

        /*
        1.2: User is logged in, the token is given as
        moodlemobile://token=<base64 passport:::token>
        Sometimes the url is preceeded by a http://
         */
        retrieveToken: {
            type: "loadstart",
            predicate: function (ev) { return ev.url.indexOf(tokenUrl) != -1 || ev.url.indexOf("http://" + tokenUrl) != -1; },
            action: function (ev, loginRequest) {
                var token = ev.url;
                token = token.replace("http://", "");
                token = token.replace(tokenUrl, "");
                try {
                    token = atob(token);

                    // Skip the passport validation, just trust the token
                    token = token.split(":::")[1];
                    console.log("Moodle token found: " + token);

                    var session = loginRequest.session;
                    session.set('up.session.MoodleToken', token);
                    session.set('up.session.authenticated', true);

                    loginRequest.success();
                } catch (err) {
                    // error happened
                    loginRequest.error(ERROR_TECHNICAL);
                }
            }
        },

        moodleLogin: {
            type: "loadstop",
            predicate: function (ev) { return ev.url === loginUrl },
            action: function (ev, loginRequest) {
                console.log("IdP link required");
                var startLogin = 'window.open("https://moodle2.uni-potsdam.de/auth/shibboleth/index.php");';

                loginRequest.browser.executeScript({code: startLogin}, function (result) {});
            }
        },

        ssoLogin: {
            type: "loadstop",
            predicate: function (ev, loginRequest) { return ev.url === idpUrl && !loginRequest.loginAttemptStarted; },
            action: function (ev, loginRequest) {
                console.log("Login inject required");

                var session = loginRequest.session;
                var user = session.get("up.session.username");
                var pw = session.get("up.session.password");
                var enterCredentials = 'var user = document.getElementsByName("j_username");' +
                                       'user[0].value = ' + JSON.stringify(user) + ';' +
                                       'var pw = document.getElementsByName("j_password");' +
                                       'pw[0].value = ' + JSON.stringify(pw) + ';' +
                                       'document.forms["login"].submit()';

                loginRequest.loginAttemptStarted = true;
                loginRequest.browser.executeScript({ code: enterCredentials }, function(result) {});
            }
        },

        /*
        3.2 Although there already was a login attempt, we are taken to the login mask. There could be a technical problem, but we assume the login data was invalid. We have to listen for loadstop because posting the login data the first time results in a loadstart on the IdP url
         */
        loginFailed: {
            type: "loadstop",
            predicate: function(ev, loginRequest) { return ev.url === idpUrl && loginRequest.loginAttemptStarted; },
            action: function(ev, loginRequest) {
                loginRequest.error(ERROR_CREDENTIALS);
            }
        },

        /*
        4. The user has to sign an attribute release to confirm that he wants Moodle to access his data. If the user disagrees, the IdP asks him to close the browser, which we detect. If the user agrees, he is taken to the Moodle token page
         */
        attributeRelease: {
            type: "loadstop",
            predicate: function(ev) { return ev.url === attributeReleaseUrl; },
            action: function(ev, loginRequest) {
                loginRequest.browser.show();
            }
        },

        /*
        Something went wrong. Propagate error. Only exception: Moodle token. We can't load those but we already handle them in 1.2
         */
        technicalError: {
            type: "loaderror",
            predicate: function(ev) { return ev.url.indexOf(tokenUrl) === -1 && ev.url.indexOf("http://" + tokenUrl) === -1; },
            action: function(ev, loginRequest) {
                console.log("loaderror happened on " + ev.url);
                loginRequest.error(ERROR_TECHNICAL);
            }
        },

        browserClosed: {
            type: "exit",
            predicate: function(ev) { return true; },
            action: function(ev, loginRequest) {
                console.log("browser exit");
                loginRequest.error(ERROR_USER_CANCELLED);
            }
        }
    };

    var handle = function(actions, loginRequest, event) {
        _.chain(actions)
            .filter(function(action) { return event.type === action.type })
            .filter(function(action) { return action.predicate(event, loginRequest); })
            .each(function(action) { action.action(event, loginRequest, loginRequest.browser); });
    };

    var moodleBase = "https://moodle2.uni-potsdam.de";
    var pluginUrl = moodleBase + "/local/mobile/launch.php?service=local_mobile&passport=1002";
    var loginUrl = moodleBase + "/login/index.php";
    var idpUrl = "https://idp.uni-potsdam.de/idp/Authn/UserPassword";
    var attributeReleaseUrl = "https://idp.uni-potsdam.de/idp/uApprove/AttributeRelease";
    var tokenUrl = "moodlemobile://token=";

    var openBrowser = function(session, success, error) {
        var loginRequest = {
            session: session,
            browser: window.open(pluginUrl, "_blank", "clearcache=yes,clearsessioncache=yes,hidden=yes")
        };
        var browser = loginRequest.browser;

        var handleEvent = function(event) {
            handle(actions, loginRequest, event);
        };

        var freeBrowser = function() {
            browser.removeEventListener("loadstart", handleEvent);
            browser.removeEventListener("loadstop", handleEvent);
            browser.removeEventListener("loaderror", handleEvent);
            browser.removeEventListener("exit", handleEvent);
            browser.close();
        };

        browser.addEventListener("loadstart", handleEvent);
        browser.addEventListener("loadstop", handleEvent);
        browser.addEventListener("loaderror", handleEvent);
        browser.addEventListener("exit", handleEvent);

        loginRequest.success = function() {
            console.log("Moodle SSO login succeeded");
            freeBrowser();
            success();
        };
        loginRequest.error = function() {
            console.log("Moodle SSO login failed");
            freeBrowser();
            error();
        }
    };

    var createToken = function(session) {
        var promise = $.Deferred();
        openBrowser(session, promise.resolve, promise.reject);
        return promise.promise();
    };

    return {
        createToken: createToken
    };
});
