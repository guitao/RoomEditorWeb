// server.js
//
// main entry point for the RoomEditorWeb cloud-based
// 2D round-trip real-time Revit BIM room editor for
// any desktop or mobile device., implemented
// as a node.js REST API driven web server with a
// mongo database and SVG viewer.
//
// Copyright 2016 by Jose Ignacio Montes, Avatar BIM
// and Jeremy Tammik, Autodesk Inc.

// Read configuration settings.

var pkg = require( './package.json' );
var config = require('./config/config.json');

// Set up Mongo database.

var mongoose = require('mongoose');

if( config.db.local ) {
  var mongo_uri = 'mongodb://localhost/'
    + config.db.database;
  mongoose.connect( mongo_uri );
}
else {
  mongoose.connect(
    config.db.host || 'localhost',
    config.db.database,
    config.db.port || 27017,
    { user: config.db.username,
      pass: config.db.password }
  );
}

var db = mongoose.connection;

// Database connection error handler

db.on( 'error', function () {
  var msg = 'unable to connect to database at ';
  console.log( msg );
  throw new Error( msg + db.host );
});

// Database connection success handler

db.once( 'open', function() {

  console.log( 'Connection to ' + db.name
    + ' database at ' + db.host
    + ' established.' );

  // Set up web serveer middleware.

  var path = require('path');
  var express = require('express');
  var app = express();

  app.set( 'port', process.env.PORT || config.port || 3001 );

  //app.use( express.favicon() );

  //app.set( 'views', path.join( __dirname, './views' ) );
  //app.set( 'view engine', 'jade' );

  app.use( express.static( path.join( __dirname, './public' ) ) );

  var bodyParser = require( 'body-parser' );
  app.use( bodyParser.json({ limit: '1mb' }) );
  app.use( bodyParser.urlencoded({ extended: true, limit: '1mb' }) );

  // Define REST API to populate mongo database.

  model = require( './model/instance' );
  require( './routes' )( app );

  // Public HTML client access points.

  app.get( '/', function( request, response ) {
    response.send( 'RoomEditorWeb 2D round-trip '
			+ 'real-time Revit BIM room editor '
			+ pkg.version + '. Hello, world!' );
  });

  // Just for fun, echo a message, if provided.

  app.get('/hello/:message', function (req, res) {
    res.send( 'Room editor ' + pkg.version
			+ ': Hello! You sent me <b>'
			+ req.params.message + '</b>');
  })

  // Custom handlebars rendering
  // http://webapplog.com/jade-handlebars-express/
  var hb = require ('express-handlebars') ;
  app.engine ('handlebars', hb ({
	  //defaultLayout: 'instances1',
	  'layoutsDir': (__dirname + '/view')
  })) ;
  app.set ('view engine', 'handlebars') ;
  app.set ('views', __dirname + '/view') ;

  app.get ('/html/count', function (req, res) {
    Instance =mongoose.model ('Instance') ;
    Instance.find ({},function (err, results) {
      res.render ('count', { count: results.length }) ;
    }) ;
  }) ;

  // Catch 404 and forward to error handler.

  app.use (function (req, res, next) {
    var err =new Error ('Error 404 - Resource Not Found') ;
    err.status =404 ;
    next (err) ;
  }) ;

  // Error handlers

  var node_env = app.get ('env');

  // Development error handler, prints stack trace.

  if ( node_env === 'development') {
    app.use (function (err, req, res, next) {
      res.status (err.status || 500) ;
      res.render ('error', {
        message: err.message,
        error: err
      }) ;
    }) ;
  }

  // Production error handler;
  // no stack traces leaked to user.

  app.use (function (err, req, res, next) {
    res.status (err.status || 500) ;
    res.render ('error', {
      message: err.message,
      error: {}
    }) ;
  }) ;

  var server = app.listen(
    app.get( 'port' ),
    function() {
      var h = db.host;
      if( -1 < h.indexOf('localhost') ) { h = 'locally '; }
      else if( -1 < h.indexOf('mongolab') ) { h = 'mongolab-'; }

      console.log( 'Room Editor ' + node_env
        + ' server ' + pkg.version
        + ' listening at port ' + server.address().port
        + ' with ' + h + 'hosted mongo db.');
    }
  );

});
