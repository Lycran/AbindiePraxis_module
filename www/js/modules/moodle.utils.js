"use strict";

define([
  'underscore',
  'modules/localstorage.api'
], function( _ ) {

  var utils = {};

  // /**
  //  * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
  //  * For download remote files from Moodle we need to use the special /webservice/pluginfile
  //  * passing the ws token as a get parameter.
  //  *
  //  * @param {string} url The url to be fixed.
  //  */
  utils.fixPluginfile = function(token, url) {

    // First check if we need to fix this url or is already fixed.
    if (url.indexOf('token=') != -1) {
      return url;
    }

    // Check if is a valid URL (contains the pluginfile endpoint).
    if (url.indexOf('pluginfile') == -1) {
      return url;
    }

    // Do we already use a query string?
    if (url.indexOf('?') != -1) {
      url += '&';
    } else {
      url += '?';
    }
    url += 'token=' + token;

    // Some webservices returns directly the correct download url, others not.
    if (url.indexOf('/webservice/pluginfile') == -1) {
      url = url.replace('/pluginfile', '/webservice/pluginfile');
    }
    return url;
  };

  utils.urlSearchPattern = /(\b(https?):\/\/[-A-Z0-9+&amp;@#\/%?=~_|!:,.;]*[-A-Z0-9+&amp;@#\/%=~_|])/ig;
  utils.fixPluginfileInString = function(token, string) {
    if (string) {
      string = string.replace(
        utils.urlSearchPattern,
        function(match, pos, string){
          return utils.fixPluginfile(token, match);
        }
      );
    }
    return string;
  }

  utils.fixPluginfileForCourseContents = function(token, contents_arr){

    var fixed_contents_arr = _.map(contents_arr, function(c){
      c.summary = utils.fixPluginfileInString(token, c.summary);
      c.modules = _.map(c.modules, function(m){
        m.description = utils.fixPluginfileInString(token, m.description);

        m.contents = _.map(m.contents, function(mc){
          if (mc.fileurl) {
            mc.fileurl = utils.fixPluginfile(token, mc.fileurl);
          }
          return mc;
        });
        return m;
      });
      return c;
    })
    return fixed_contents_arr;
  }

  /**
   * Find matching moodle course link out of moodleCourses collection 
   * by courseName (name from calender).
   * 
   * Returns string[] with matching links. (should only one)
   */
  utils.getCourseByName = function(courseName, moodleCourses)
  {
    var result = [];
            var courseID = $(courseName.split(" "))[0];
            // first check storage
            if (storage.getCourseLink(courseID) != '')
                result.push(storage.getCourseLink(courseID));

            // if nothing found check Moodle
            if (result.length == 0) {
                moodleCourses.filter(function(item) {
                    var candidates = item.get('fullname').split(" ");
                    for (var i = 0; i < candidates.length; i++) {
                        if (candidates[i] != 'Übung' && candidates[i] != 'Praktikum' && candidates[i] != 'Seminar' && candidates[i] != 'Vorlesung') {
                            if (courseName.indexOf(candidates[i]) > -1) {
                                var link = "https://moodle2.uni-potsdam.de/course/view.php?id=" + item.get('id');
                                result.push(link);
                                storage.saveCourseLink(courseID, link);
                                return true;
                            }
                        }
                    }
                });
            }

            return result;
  }
  return utils;
});
