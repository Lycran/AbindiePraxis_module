define([
	'jquery',
	'underscore',
	'backbone',
	'router',
	'underscore-string',
	'utils',
	'jquerymobile'], function($, _, Backbone, Router, _str, utils){


		var Application = Backbone.Model.extend({

			initialize: function(){

				$(document).ready(function() {
  					document.addEventListener("deviceready", onDeviceReady, false);
				});

				function onDeviceReady() {
    				navigator.splashscreen.hide();
				}

				/**
		 	 	 * Override Backbone.sync to automatically include auth headers according to the url in use
		 	 	 */
				function overrideBackboneSync() {
					var authUrls = ["http://api.uni-potsdam.de/endpoints/roomsAPI",
									"http://api.uni-potsdam.de/endpoints/libraryAPI",
									"https://api.uni-potsdam.de/endpoints/pulsAPI",
									"https://api.uni-potsdam.de/endpoints/moodleAPI",
									"http://api.uni-potsdam.de/endpoints/transportAPI/1.0/"];
					var isStartOf = function(url) {
						return function(authUrl) {
							return _.str.startsWith(url, authUrl);
						};
					};

					var sync = Backbone.sync;
					Backbone.sync = function(method, model, options) {
						var url = options.url || _.result(model, "url");
						if (url && _.any(authUrls, isStartOf(url))) {
							options.headers = _.extend(options.headers || {}, { "Authorization": utils.getAuthHeader() });
						}
						sync(method, model, options);
					};
				}

				/**
			 	 * Initialize Backbone override
			 	 */
				$(overrideBackboneSync);
				
				/**
				 * Initialize external link override
				 */
				$(document).on("click", "a[rel=external]", utils.overrideExternalLinks);

				Router.initialize();
			}
		});

		return new Application();
});
