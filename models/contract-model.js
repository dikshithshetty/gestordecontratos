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
        fechaCreaccionApp:{type:String,default:getCurrentDate()},
        visible:{type:Boolean,default:true},
        mainStatus:{type:String,default:"Pending"},
        firmas:{
          autOperaciones:{
            value:{type:Boolean,default:false},
            person:{type:String,default:""}
          },
          dirOperaciones:{
            value:{type:Boolean,default:false},
            person:{type:String,default:""}
          },
          autComercial:{
            value:{type:Boolean,default:false},
            person:{type:String,default:""}
          },
          dirComercial:{
            value:{type:Boolean,default:false},
            person:{type:String,default:""}
          },
          autPRL:{
            value:{type:Boolean,default:false},
            person:{type:String,default:""}
          },
          dirPRL:{
            value:{type:Boolean,default:false},
            person:{type:String,default:""}
          },
          autCRiesgos:{
            value:{type:Boolean,default:false},
            person:{type:String,default:""}
          },
          dirCRiesgos:{
            value:{type:Boolean,default:false},
            person:{type:String,default:""}
          },
          dirGeneral:{
            value:{type:Boolean,default:false},
            person:{type:String,default:""}
          }
        },
        historico:{type:Array,default:[]},
        uploadedFiles:{type:Array,default:[]}
    }
  );

  function getCurrentDate(){
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = dd + '/' + mm + '/' + yyyy;
    return today
}

const Contract = mongoose.model('Contract', contractSchema);
module.exports = Contract;