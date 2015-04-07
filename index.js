var express = require('express');
var path = require('path');

var app = express();
var input = {};
var output = {};

app.use(express.static(path.resolve(__dirname, 'public')));

var port = 7777;

app.listen(port);
console.log('Data Thing running on port',port);
