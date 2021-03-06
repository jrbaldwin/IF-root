'use strict';

var express = require('express');
var path = require('path');
var app = express();
var bodyParser  = require('body-parser');
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
var http = require('http').Server(app);
var mongoose = require('mongoose');
var session = require('express-session');
var cors = require('cors');
var webpack = require('webpack');
var config = require('./webpack.config.dev');
var compiler = webpack(config);

var User = require('./server/models/User');
//set env vars
process.env.MONGOLAB_URI = process.env.MONGOLAB_URI || 'mongodb://localhost/chat_dev';
// process.env.MONGOLAB_URI || 
process.env.PORT =  process.env.PORT || 5100;

// connect our DB
mongoose.connect(process.env.MONGOLAB_URI);
process.on('uncaughtException', function (err) {
  console.log(err);
});

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}));
app.use(require('webpack-hot-middleware')(compiler));

app.use(cors());
app.use(session({
  secret: 'keyboard kitty', 
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 600000000 }
}));

//load routers
var messageRouter = express.Router();
var usersRouter = express.Router();
var channelRouter = express.Router();
require('./server/routes/message_routes')(messageRouter);
require('./server/routes/channel_routes')(channelRouter);
app.use('/api', messageRouter);
app.use('/api', usersRouter);
app.use('/api', channelRouter);

app.use('/', express.static(path.join(__dirname)));
var webpackServer = http.listen(process.env.PORT 
// 'localhost',
,function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('server listening on port: %s', process.env.PORT);
});

// attach socket.io onto our development server
var io = require('socket.io')(webpackServer);
var socketEvents = require('./socketEvents')(io);
