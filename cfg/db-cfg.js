const mongoose = require('mongoose');

mongoose
  .connect(process.env.MONGODB_URI, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(x => console.log(`Connected to Database: "${x.connections[0].name}"`))
  .catch(err => console.error('Error connecting to database', err));
