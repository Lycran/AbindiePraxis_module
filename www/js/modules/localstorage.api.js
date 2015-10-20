
define([
  'jquery',
], function($) {

  var storageAPI = {
    saveCourseLink : function (courseID,link)
    {
      var storage = window.localStorage;
      storage.setItem(courseID,link);
    },
    getCourseLink : function (courseID)
    {
      var storage = window.localStorage;
      var item = storage.getItem(courseID);
      //storage returns null object if not found
      if( item == null)
      {
	item = ''; 
      }
      return item;
    }
  };

  return storageAPI;
});