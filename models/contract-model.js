const { timeStamp } = require('console');
const mongoose = require('mongoose');
const { stringify } = require('querystring');
const Schema = mongoose.Schema;

const contractSchema = new Schema(
    {
        pq:{type:String,required:true},
        comercial:{type:String,required:true},
        cliente:{type:String,required:true},
        obra:{type:String,required:true},
        usuarioFinal:{type:String,required:true},
        nPedido:{type:String,required:true},
        importe:{type:String,required:true},
        fechaStatusWon:{type:String,required:true},
        fechaRecepcion:{type:String,required:true},
        fechaCreaccionApp:{type:String,default:timeStamp},
        visible:{type:Boolean,default:true},
        mainStatus:{type:String,default:"Pending"},
        historico:{type:Array,default:[]},
        uploadedFiles:{type:Array,default:[]}
    }
  );

const Contract = mongoose.model('Contract', contractSchema);
module.exports = Contract;