/*jshint -W033 */
const express = require('express');
const router = express.Router();
// const User=require('../models/user-model')
const bcrypt = require("bcryptjs");
// const fs=require('fs');
const fs = require('fs-extra')

const { findOne } = require("./models/user-model");
const User = require('./models/user-model');
const multer=require('multer')
const upload=multer({dest:"/uploadedContracts"})
const path = require("path");
// const fileUpload = require('express-fileupload');

var XLSX = require('xlsx');
const { Console } = require('console');


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
        res.render("login-register/login",{formData});
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
                        errorMsg:errorMsg,
                    }
                }
                // console.log(formData);
                res.render("login-register/login",formData);
                //MUESTRA LA NAVBAR Y NO DEBERIA

            }
        } catch(error){
            next(error);
        }
    }
})


//SESSION NOT WORKING


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

router.post("/uploadNewContractToDB",upload.single('excelFile'),async (req,res)=>{
    console.log("--------------- UPLOADING NEW CONTRACT ---------------");
    // console.log("req.file: ", req.file)
    if (req.file===undefined){
        noFileSelected="No se ha seleccionado ningún contrato.";
        res.render("contract-actions/create-contract.hbs",{noFileSelected});
    }else {
        // console.log("req.file.path: "+req.file.path)
        //Create folder "temporaryFiles" if it doesnt exists already.
        // let tempFilesFolderName="temporaryFiles"; 
        let tempFolder = path.join(__dirname,"temporaryFiles");   //console.log("tempFilesPath: "+tempFilesPath)
        // console.log("Time to: Create Temporary Folder")
        // if (!fs.existsSync(tempFolder)){fs.mkdirSync(tempFolder);}   
        // await createDirectory(tempFolder)
        // console.log("--> Temporary Folder Created")
        //Save document to "temporaryFiles" folder
        let tempFile = path.join(tempFolder,req.file.originalname);  //console.log("tempFile: "+tempFile)
        console.log(req.file)
        console.log(tempFile)
        await saveFile(req.file.path,tempFile)
        // console.log("Time to: Save Temporary File in Temporary Folder")
        // if (fs.existsSync(tempFile)){
        //     // console.log("Time to: Delete Previous Temporary File")
        //     fs.unlinkSync(tempFile)
        //     // console.log("--> Previous Temporary File Deleted")
        // }
        // fs.rename(req.file.path, tempFile, err => {if (err) {console.log(err);}});
        // console.log("--> Temporary File saved in Temporary Folder")

        
        //Reads Excel File Variables
        // console.log(tempFile)
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

        
        var errorMsg = createErrorMessageOnNewContract(pq,comercial,cliente,obra,usuarioFinal,nPedido,importe,fechaStatusWon,fechaRecepcion)
        
        if (errorMsg.length>0){
            deleteFile(tempfile)
            // console.log("Time to: Delete Temporary File from Temporary Folder")
            // fs.unlinkSync(tempFile)
            // console.log("--> Temporary File Deleted From Temporary Folder")
            // console.log("Time to render Create-Contracts.hbs with Error Message")
            res.render("contract-actions/create-contract.hbs",{errorMsg});
        } else {

            //Create folder "contracts" if it doesnt exists already.
            // let contractsFolderName = "contracts";
            let contractsFolder = path.join(__dirname, "contracts");   //console.log("contractsFolder: "+contractsFolder)
            // console.log("Time to: Create Contracts Folder")
            // if (!fs.existsSync(contractsFolder)){fs.mkdirSync(contractsFolder)} // console.log(req.file)
            // console.log("--> Contracts Folder Created")
            const pqFolder=path.join(contractsFolder,pqFolderName);  //console.log("contractPath: " + contractPath);
            // console.log("Time to: Create Contracts/PQ-XXXXXX-X Folder")
            // if (!fs.existsSync(pqFolder)){fs.mkdirSync(pqFolder);}
            // console.log("--> Contracts/PQ-XXXXXX-X Folder Created")
            // console.log("Time to: Save Uploaded Form File in Contracts/PQ-XXXXXX-X")
            // console.log("req.file.originalname: "+req.file.originalname)
            const pqExcelFile = path.join(pqFolder,req.file.originalname);  //console.log("contractExcelFile: " + contractExcelFile);

            // if (fs.existsSync(pqExcelFile)){
            //     // console.log("Time to: Delete Previous Contract File")
            //     fs.unlinkSync(pqExcelFile)
            //     // console.log("--> Previous Contract File Deleted")
            // }
            saveFile(tempFile,pqExcelFile)
            // fs.rename(tempFile, pqExcelFile, err => {if (err) {console.log(err)}})
            // console.log("--> Uploaded Form File saved in Contracts/PQ-XXXXXX-X")
            // console.log("Time to: Delete Temporary File from Temporary Folder")
            // fs.unlinkSync(tempFile)
            deleteFile(tempfile)

            // console.log("--> Temporary File Deleted From Temporary Folder")







            succesMsg = "Contrato Creado Correctamente.";
            // console.log("Time to render Create-Contracts.hbs with Success Message")
            res.render("contract-actions/create-contract.hbs",{succesMsg});
        }
    }
    
});
async function deleteFile (filePath) {
    try {
      await fs.remove(filePath)
      console.log('File Removed: '+filePath)
    } catch (err) {
      console.error(err)
    }
  }
async function createDirectory(dir){
    try{
        await fs.ensureDir(dir)
        console.log("Directory Created: " +dir)
    } catch (err){
        console.error(err)
    }
}
async function saveFile(src,dest){
    try{
        await fs.ensureLink(src,dest)
        console.log("File Saved from: " + src + " to " + dest)
    } catch (err){
        console.error(err)
    }
}
function editPQ(pq){
    return pq.split('-')[0] + "-"+pq.split('-')[1];
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
    return desired_value;
}
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}
module.exports=router;