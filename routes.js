/*jshint -W033 */
const express = require('express');
const router = express.Router();
// const User=require('../models/user-model')
const bcrypt = require("bcryptjs");
// const fs=require('fs');
const fs = require('fs-extra')

const { findOne } = require("./models/user-model");
const User = require('./models/user-model');
const Contract = require('./models/contract-model');
const multer=require('multer')
const upload=multer({dest:"uploadedContracts"})
// const fileUpload = require('express-fileupload');

const path = require("path");
const SSF=require("SSF")
var XLSX = require('xlsx');
const { Console } = require('console');
const nodemailer=require('nodemailer')

router.get('/',(req,res,next)=>{
    // console.log(req.session)
    let template = {
        layout: false
    }
    if (req.session.currentUser) {
        res.render('contracts');
    } else {
        res.render('login-register/login', template);
    }
})
router.get('/register',(req,res,next)=>{
    // if (req.session!==undefined) {
    //     res.render('contracts');
    // } else {
        let template = {
            layout: false
        }
        res.render('login-register/register', template);
    // }
})
router.post('/register',async (req,res,next)=>{
    const{username, usersurname, email, repeatemail, password, repeatedpassword, role} = req.body;
    var errorMsg = [];
    //Validates that the fields are not empty
    if (username=== ""||username ==null){errorMsg.push('Insert your name.')}
    if (usersurname=== ""||usersurname ==null){errorMsg.push('Insert your surname.')}
    if (email=== ""||email ==null){errorMsg.push('Insert your email.')}
    if (repeatemail=== ""||repeatemail ==null){errorMsg.push('Repeat your email.')}
    if (password=== ""||password ==null){errorMsg.push('Insert your password.')}
    if (repeatedpassword=== ""||repeatedpassword ==null){errorMsg.push('Repeat your password.')}
    if (role=== ""||role ==null || role === "Select Your Role"){errorMsg.push('Select your Role.')}

    //Validdates email and passwords match
    if (email!==repeatemail){errorMsg.push("The emails doesn't match.")}
    if (password!==repeatedpassword){errorMsg.push("The passwords doesn't match.")}

    //Validates Password Lenght
    if (password.length<6){errorMsg.push("The password must have at least 6 characters.")}
    
    //Validate if email already exists.
    try {
        const user = await User.findOne({ email: email });
        if (user!==null){errorMsg.push("This email already exists. Click here to log in.")}
    }catch (error){
        next(error);
    }

    //PENDING
    // const validEmail = validateEmail(email);
    // console.log(validEmail)
    // if (validEmail===false){errorMsg.push('Invalid Email.')}
    // How to chack that it have capital leters and special characters?
    // How to check that an email is really an email?

    
    formData={
        errorMsg:errorMsg,
        succesMsg:null,
        username:username,
        usersurname:usersurname,
        email:email,
        repeatemail:repeatemail,
        password:password,
        repeatedpassword:repeatedpassword,
        role:role
    };


    if (errorMsg.length===0){
        const bcryptSalt = 10;
        const salt = bcrypt.genSaltSync(bcryptSalt);
        const hashPass = bcrypt.hashSync(password, salt);

        await User.create({
            name:username,
            surname:usersurname,
            email,
            password:hashPass,
            role
        });
        formData.succesMsg="User succesfully created.";
        //FALTA QUE AL CREAR EL USUARIO APAREZCA EL MENSAJE DE USUARIO CREADO Y REDIRECCIONE AL LOGIN
    //     res.render('login-register/login',{formData});
    // } else {
        res.render("login-register/login",{formData, layout: false});
        // await setTimeout(async function(){

        //    await  res.redirect("/") 
        // },3000);
        
    }
})
router.post('/', async(req,res,next)=>{
    console.log("postLogin")
    const{email, password} = req.body;
    var errorMsg = [];

    //Validates that the fields are not empty
    if (email=== ""||email ==null){errorMsg.push('Insert email.')}
    if (password=== ""||password ==null){errorMsg.push('Insert your password.')}
    if (errorMsg.length===0){
        console.log(errorMsg)
        // const bcryptSalt = 10;
        // const salt = bcrypt.genSaltSync(bcryptSalt);
        // const hashPass = bcrypt.hashSync(password, salt);

        try{
            const user = await User.findOne({ email: email });
            if (!user){errorMsg.push("This emails doesn't exist.")}
            if (errorMsg.length===0){
                if (bcrypt.compareSync(password, user.password)) {
                    req.session.currentUser = user;
                    // formData={
                    //     succesMsg:"Succesfully Logged In",
                    // }
                    res.redirect("/")
                }else{
                    errorMsg.push('Incorrect email or password.')
                    formData={
                        layout:false,
                        errorMsg:errorMsg
                    }
                }
                // console.log(formData);
                res.render("login-register/login", formData);
                

            }
        } catch(error){
            next(error);
        }
    }
})
router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        res.redirect('/');
    })
})
router.get('/createContract',(req,res,next)=>{
    // if (req.session!==undefined) {
    //     res.render('contracts');
    // } else {
        res.render('contract-actions/create-contract.hbs');
    // }
})
router.post("/uploadNewContractToDB",upload.any(), async (req,res)=>{
    console.log("--------------- UPLOADING NEW CONTRACT ---------------");
    console.log(req.files)
    if (req.files.length===0){
        noFileSelected="No se ha seleccionado ningún contrato.";
        res.render("contract-actions/create-contract.hbs",{noFileSelected});
    }else {
        
        //Save Excel document to "temporaryFiles" folder to read it
        let tempFolder = path.join(__dirname,"temporaryFiles");
        let tempFile = path.join(tempFolder,req.files[0].originalname);
        await saveFile(req.files[0].path,tempFile)
        
        //Reads Excel File Variables
        const pq=readExcel(tempFile,'V7');
        const pqFolderName = editPQ(pq)
        const comercial=readExcel(tempFile,'F7');
        const cliente=readExcel(tempFile,'F9');
        const obra=readExcel(tempFile,'E11');
        const usuarioFinal=readExcel(tempFile,'G13');
        const nPedido=readExcel(tempFile,'W11');
        const importe=readExcel(tempFile,'G17');
        const fechaStatusWon=readExcel(tempFile,'H19');
        const fechaRecepcion=readExcel(tempFile,'U19');
        console.log("PQ: " + pq + " | Comercial: " + comercial + " | Cliente: " + cliente + " | Obra: " + obra + " | Usuario Final: " + usuarioFinal + " | Nº de Pedido: " + nPedido + " | Importe: " + importe + " | Fecha Status Won: " + fechaStatusWon + " | Fecha Recepción: " + fechaRecepcion);
        await deleteFile(tempFile)

        var errorMsg = createErrorMessageOnNewContract(pq,comercial,cliente,obra,usuarioFinal,nPedido,importe,fechaStatusWon,fechaRecepcion)
        
        if (errorMsg.length>0){
            deleteFile(tempFile)
            res.render("contract-actions/create-contract.hbs",{errorMsg});
        } else {
            //Create PQ Folder
            let contractsFolder = path.join(__dirname, "contracts");
            const pqFolder=path.join(contractsFolder,pqFolderName);
            let uploadedFiles=[]


            //Save all the files to PQ Folder
            for (i=0;i<req.files.length;i++){
                let uploadedFile=req.files[i]
                let fileToSave = path.join(pqFolder,uploadedFile.originalname)
                await saveFile(uploadedFile.path,fileToSave)
                uploadedFiles.push(fileToSave)
            }

            //Create Contract to DB
            await Contract.create({pq,comercial,cliente,obra,usuarioFinal,nPedido,importe,fechaStatusWon,fechaRecepcion,uploadedFiles});

            let transporter = nodemailer.createTransport({
                host:"smtp-mail.outlook.com",
                port:587,
                secure:false,
                auth: {
                    user: "",
                    pass: ""
                  },
            })

            let info=await transporter.sendMail({
                from:'"Esteve Martín - MPA Solutions"<estevemartinmauri@hotmail.com>',
                to:"esteve.martin@mpasolutions.es",
                subject:"Test Email",
                html: "<b> NO ME CREO QUE HAYA LLEGADO </b>"
            })


            succesMsg = "Contrato Creado Correctamente.";
            res.render("contract-actions/create-contract.hbs",{succesMsg});
        }
    }
});


async function deleteFile (filePath) {
    try {
        // console.log(filePath)
      await fs.remove(filePath)
    //   console.log('File Removed: '+filePath)
    } catch (err) {
      console.error(err)
    }
}
async function createDirectory(dir){
    try{
        await fs.ensureDir(dir)
        // console.log("Directory Created: " +dir)
    } catch (err){
        console.error(err)
    }
}
async function saveFile(src,dest){
    try{
        await fs.ensureLink(src,dest)
        // console.log("File Saved from: " + src + " to " + dest)
    } catch (err){
        console.error(err)
    }
}
function editPQ(pq){
    if (pq===undefined){return ""}else{return pq.split('-')[0] + "-"+pq.split('-')[1];}
}
function createErrorMessageOnNewContract(pq,comercial,cliente,obra,usuarioFinal,nPedido,importe,fechaStatusWon,fechaRecepcion){
    var errorMsg = [];
    
    if (pq===undefined){errorMsg.push('PQ.');}
    if (comercial ==undefined){errorMsg.push('Nombre del Comercial.');}
    if (cliente ==undefined){errorMsg.push('Cliente.');}
    if (obra ==undefined){errorMsg.push('Obra.');}
    if (usuarioFinal ==undefined){errorMsg.push('Usuario Final.');}
    if (nPedido ==undefined){errorMsg.push('Nº de Pedido.');}
    if (importe ==undefined){errorMsg.push('Importe.');}
    if (fechaStatusWon ==undefined){errorMsg.push('Fecha de Status Won.');}
    if (fechaRecepcion ==undefined){errorMsg.push('Fecha de Recepción del Contrato.');}
    return errorMsg;
}
function readExcel(excelPath,cell){
    var workbook = XLSX.readFile(excelPath);
    var first_sheet_name = workbook.SheetNames[0];
    
    var address_of_cell = cell;
    var worksheet = workbook.Sheets[first_sheet_name];
    var desired_cell = worksheet[address_of_cell];
    
    var desired_value = (desired_cell  ? desired_cell.v : undefined);
    if (cell==='H19' || cell==="U19"){
        // console.log("Previous Value: " +desired_value)
        if(desired_value!==undefined){desired_value=ExcelDateToJSDate(desired_value).toLocaleString().split(' ')[0]}
        // desired_value=SSF.format(fmt:Number,val:desired_value)
        // console.log("After Value: " + desired_value)
    }
    // console.log(desired_value)
    return desired_value;
}
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
function ExcelDateToJSDate(serial) {
    var utc_days  = Math.floor(serial - 25569);
    var utc_value = utc_days * 86400;                                        
    var date_info = new Date(utc_value * 1000);
    // var fractional_day = serial - Math.floor(serial) + 0.0000001;
    // var total_seconds = Math.floor(86400 * fractional_day);
    // var seconds = total_seconds % 60;
    // total_seconds -= seconds;
    // var hours = Math.floor(total_seconds / (60 * 60));
    // var minutes = Math.floor(total_seconds / 60) % 60;
    returnDate = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
    returnDate=returnDate.toLocaleString().split(' ')[0]

    var year=returnDate.split('-')[0]
    var month=returnDate.split('-')[1]
    var day=returnDate.split('-')[2]
    if (month.length===1){month='0'+month}
    returnDate=day+"/"+month+"/"+year
    // console.log(returnDate)

    return returnDate;
}
module.exports=router;