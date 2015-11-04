define([
  'backbone'
], function(Backbone) {

  var iddb = Backbone.Model.extend({

    urlRoot: 'http://192.168.178.21:8081/getroombytagid/'
  });
  return iddb;
});