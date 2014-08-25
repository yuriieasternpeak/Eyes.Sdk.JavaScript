/*
 ---

 name: ServerConnector

 description: Provides an API for communication with the Applitools server.

 provides: [ServerConnector]
 requires: [GeneralUtils]

 ---
 */

;(function() {
    "use strict";

    var GeneralUtils = require('./GeneralUtils'),
        PromiseFactory = require('./EyesPromiseFactory'),
        restler = require('restler');


    // Constants
    var CONNECTION_TIMEOUT_MS = 5 * 60 * 1000,
        DEFAULT_HEADERS = {'Accept': 'application/json', 'Content-Type': 'application/json'},
        SERVER_SUFFIX = '/api/sessions/running';

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUri
     **/
    function ServerConnector(serverUri) {
        console.log('ServerConnector initialized');
        this._serverUri = GeneralUtils.urlConcat(serverUri, SERVER_SUFFIX);
        this._httpOptions = {
            rejectUnauthorized: false,
            headers: DEFAULT_HEADERS,
            timeout: CONNECTION_TIMEOUT_MS,
            query: {}
        };
    }

    /**
     * Sets the API key of your applitools Eyes account.
     *
     * @param apiKey {String} The api key to be used.
     */
    ServerConnector.prototype.setApiKey = function (apiKey) {
        console.log('api key set to: ', apiKey)
        this._httpOptions.query.apiKey = apiKey;
    };

    /**
     *
     * @return {String} The currently set API key.
     */
    ServerConnector.prototype.getApiKey = function () {
        return this._httpOptions.query.apiKey;
    }

    /**
     *
     * Starts a new running session in the server. Based on the given parameters,
     * this running session will either be linked to an existing session, or to
     * a completely new session.
     *
     * @method _startSession
     * @param {Object} sessionStartInfo - The start parameters for the session.
     * @return {Object} Promise with a resolve result that represents the current running session.
     *
     **/
    ServerConnector.prototype.startSession = function (sessionStartInfo) {
        console.log('ServerConnector.startSession called with:', sessionStartInfo);
        return PromiseFactory.makePromise(function (resolve, reject) {
            console.log('ServerConnector.startSession will now post call');
            restler.postJson(this._serverUri, {startInfo: sessionStartInfo}, this._httpOptions)
                .on('complete', function(data, response) {
                    console.log('ServerConnector.startSession - start session result', data,
                        ' status code ', response.statusCode);
                    if (response.statusCode == 200 || response.statusCode == 201) {
                        console.log('ServerConnector.startSession - post succeeded');
                        resolve({sessionId: data['id'], sessionUrl: data['url'],
                            isNewSession: response.statusCode == 201});
                    } else {
                        console.log('ServerConnector.startSession - post failed');
                        reject(Error(response));
                    }
                });
        }.bind(this));
    };

    ServerConnector.prototype.endSession = function (runningSession, isAborted, save) {
        console.log('ServerConnector.endSession called with isAborted:', isAborted,
        ', save:', save, 'for session:', runningSession);
        return PromiseFactory.makePromise(function (resolve, reject) {
            var data = {aborted: isAborted, updateBaseline: save};
            var url = GeneralUtils.urlConcat(this._serverUri, runningSession.sessionId.toString());
            console.log("ServerConnector.endSession will now post:", data, "to:", url);
            restler.json(url, data, this._httpOptions, 'DELETE')
                .on('complete', function(data, response) {
                    console.log('ServerConnector.endSession result', data,' status code', response.statusCode);
                    if (response.statusCode == 200 || response.statusCode == 201) {
                        resolve({
                            steps: data['steps'],
                            matches: data['matches'],
                            mismatches: data['mismatches'],
                            missing: data['missing'],
                            exactMatches: data['exactMatches'],
                            strictMatches: data['strictMatches'],
                            contentMatches: data['contentMatches'],
                            layoutMatches: data['layoutMatches'],
                            noneMatches: data['noneMatches']
                        });
                    } else {
                        reject(Error("error on server connector endSession"));
                    }
                });
        }.bind(this));
    };

    ServerConnector.prototype.matchWindow = function (runningSession, matchWindowData) {
        return PromiseFactory.makePromise(function (resolve, reject) {
            var url = GeneralUtils.urlConcat(this._serverUri, runningSession.sessionId.toString());
            var options = Object.create(this._httpOptions);
            options.headers = Object.create(this._httpOptions.headers);
            options.headers['Content-Type'] = 'application/octet-stream';
            console.log("ServerConnector.matchWindow will now post to:", url);
            restler.postJson(url, matchWindowData, options)
                .on('complete', function(data, response) {
                    console.log('ServerConnector.matchWindow result', data,'status code', response.statusCode);
                    if (response.statusCode == 200 || response.statusCode == 201) {
                        resolve({asExpected: data.asExpected});
                    } else {
                        reject(Error(JSON.parse(response)));
                    }
                });
        }.bind(this));
    };

    module.exports = ServerConnector;
}());