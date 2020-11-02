const mongoose = require('mongoose');
const { stringify } = require('querystring');
const Schema = mongoose.Schema;

const noticeSchema = new Schema(
    {
        noticeType:{type:String,required:true},
        destinatario:{type:String,required:true},
        cc:{type:String},
        subject:{type:String,required:true},
        emailBody:{type:String,required:true},
        attachments:[String],
        periodicidad:{type:String}
    }
  );

const Notice = mongoose.model('Notice', noticeSchema);

module.exports = Notice;