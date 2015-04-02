var express = require('express');
var path = require('path');

var app = express();
var input = {};
var output = {};

app.use(express.static(path.resolve(__dirname, 'public')));

app.get('/input',function(req,res) {
    res.json(input);
});

app.get('/output',function(req,res) {
    res.json(output);
});

app.listen(7777);
