var express = require('express');
var app = express();
var fs = require("fs");

app.get('/getroombytagid/:id', function (req, res) {
   // First read existing users.
   fs.readFile( __dirname + "/" + "rooms.json", 'utf8', function (err, data) {
       data = JSON.parse( data );
       var room = new Object();
       room.room = data[req.params.id]; 
       console.log( room );
       res.end( JSON.stringify(room));
   });
})

var server = app.listen(8081, function () {

  var host = server.address().address
  var port = server.address().port
  console.log("Example app listening at http://%s:%s", host, port)

})
