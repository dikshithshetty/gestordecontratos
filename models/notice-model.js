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

// {"noticeType":"escalado",
// "destinatario":"estevemartinmauri.escalado@hotamil.com",
// "cc":"esteve.martin.escalado@mpasolutions.es",
// "subject":"El contrato XXX requiere de su firma",
// "emailBody":"El siguiente contrato ha siddo aprobado por los autorizados de todos los departamentos y ahora requiere de su revisión y firma.",
// "attachments":[],
// "periodicidad":""}