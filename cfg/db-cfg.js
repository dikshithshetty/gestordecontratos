const mongoose = require('mongoose');

mongoose
  .connect('mongodb://localhost/contract-manager', {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(x => console.log(`Connected to Database: "${x.connections[0].name}"`))
  .catch(err => console.error('Error connecting to database', err));
