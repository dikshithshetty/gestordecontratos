const mongoose = require('mongoose');
const { stringify } = require('querystring');
const Schema = mongoose.Schema;


const userSchema = new Schema(
    {
        name:{type:String,required:true},
        surname:{type:String,required:true},
        email:{type:String,required:true, unique:true},
        password:{type:String,required:true},
        role:{type:Array,required:true},
        usertype:{type:String, default: 'user'},
    },
    {
      timestamps: true
    }
  );

const User = mongoose.model('User', userSchema);

module.exports = User;