require('dotenv').config();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const hbs = require('hbs');
const mongoose = require('mongoose');
const logger = require('morgan');
const session    = require("express-session");
const path = require('path');
const MongoStore = require("connect-mongo")(session);
const app_name = require('./package.json').name;

const app = express();

// require database configuration
require('./cfg/db-cfg');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));

// Middleware Setup ¿¿¿¿¿QUE HACE ESTO?????
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
    secret: "basic-auth-secret",
    cookie: { maxAge: 60000 },
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
      ttl: 24 * 60 * 60 // 1 day
    }),
    resave: true,
    saveUninitialized: true
  }));

const index = require('./routes');
app.use('/', index);

module.exports = app;