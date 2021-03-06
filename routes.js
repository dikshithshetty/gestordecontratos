/*jshint -W033 */
const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const fs = require('fs-extra')
const multer=require('multer')
const upload=multer({dest:"uploadedContracts"})
const path=require('path')
const XLSX = require('xlsx');
const nodemailer=require('nodemailer')
const User = require('./models/user-model');
const Contract = require('./models/contract-model');
const { Console } = require('console');
const { findOne } = require("./models/user-model");

router.get('/',(req,res,next)=>{
    // console.log(req.session)
    let template = {
        layout: false
    }
    if (req.session.currentUser) {



        res.redirect('/displayPendingContracts');
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

    errorMsg = await createErrorMsgRegister(username, usersurname, email, repeatemail, password, repeatedpassword, role)
    
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
        await User.create({name:username,surname:usersurname,email,password:hashPass,role});
        formData.succesMsg="User succesfully created.";
        res.render("login-register/login",{formData, layout: false});
    } else{
        res.render("login-register/register",{formData, layout: false});
    }
})
router.post('/', async(req,res,next)=>{
    console.log("Entering Login POST Method")
    const{email, password} = req.body;
    var errorMsg = '';

    //Validates that the fields are not empty

    if (email==="" && password ===""){
        errorMsg = "You forgot to write your email and password."       //Email and Password not Filled.
        formData={errorMsg:errorMsg,layout:false}
        res.render("login-register/login",formData);                    //Render Login and Error Message.
    }else if (email===""){
        errorMsg = "You forgot to write your email."                    //Email not Filled.
        formData={errorMsg:errorMsg,layout:false}
        res.render("login-register/login",formData);                    //Render Login and Error Message.
    }else if (password ===""){
        errorMsg = "You forgot to write your password."                 //Password not Filled.
        formData={errorMsg:errorMsg,email:email,layout:false}
        res.render("login-register/login",formData);                    //Render Login and Error Message.
    } else {
        const user = await User.findOne({ email: email });              //Search User to BD by Email.
        if (!user){
            errorMsg="This email doesn't exist."                        //User doesn't exists.
            formData={errorMsg:errorMsg,email:email,layout:false}
            res.render("login-register/login",formData);
        } else{
                                                                        //User Exists.
            if (bcrypt.compareSync(password, user.password)) {          //Check if password match.
                req.session.currentUser = user;                         //Save User Session.
                // await deleteDir(path.join(__dirname,"uploadedContracts"))
                res.redirect("/displayPendingContracts")                                       //Redirect to home.
            }else{
                errorMsg="Incorrect email or password."                 //Password is inccorrect.
                formData={errorMsg:errorMsg,email:email,layout:false}
                res.render("login-register/login",formData);            //Render Login and Error Message.
            }
        }
    }
})
router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        res.redirect('/');
    })
})
router.get('/createContract',(req,res,next)=>{
    if (req.session!==undefined) {
        res.render('contracts');
    } else {
        res.redirect('/');
    }
})
router.post("/uploadNewContractToDB",upload.any(), async (req,res)=>{
    
    if (req.session===undefined) {
        res.redirect("/")
    }else{
        console.log("--------------- UPLOADING NEW CONTRACT ---------------");
        // console.log(req.files)
        if (req.files.length===0){
            noFileSelected="No se ha seleccionado ningún contrato.";
            res.render("contracts.hbs",{noFileSelected});
        }else {
            
            //Save Excel document to "temporaryFiles" folder to read it
            let tempFolder = path.join(__dirname,"temporaryFiles");
            let tempFile = path.join(tempFolder,req.files[0].originalname);
            let ext = tempFile.substr(tempFile.lastIndexOf('.') + 1);
            console.log("Extensión: " ,ext)
            if (ext!=="xlsx" && ext!=="xls" && ext!=="xlsm"){
                noFileSelected="La hoja de firmas no se encuentra en formato Excel."
                res.render("contracts.hbs",{noFileSelected});
            }
            
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
            // console.log("PQ: " + pq + " | Comercial: " + comercial + " | Cliente: " + cliente + " | Obra: " + obra + " | Usuario Final: " + usuarioFinal + " | Nº de Pedido: " + nPedido + " | Importe: " + importe + " | Fecha Status Won: " + fechaStatusWon + " | Fecha Recepción: " + fechaRecepcion);
            // await deleteFile(tempFile)

            var errorMsg = createErrorMessageOnNewContract(pq,comercial,cliente,obra,usuarioFinal,nPedido,importe,fechaStatusWon,fechaRecepcion)

            //Check that the contract doesn't exists in the DB.
            const contract = await Contract.findOne({ pq: pq });
            if (contract!==null){errorMsg.push("The contract "+pqFolderName+" already exists. Edit the existing contract.")}

            if (errorMsg.length>0){
                deleteFile(tempFile)
                res.render("contracts.hbs",{errorMsg});
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

                emailParams={
                    host:"smtp-mail.outlook.com",
                    port:587,
                    secure:false,
                    auth: {
                        user: "",
                        pass: ""
                    },
                    from:'"Esteve Martín - MPA Solutions"<estevemartinmauri@hotmail.com>',
                    to:"esteve.martin@mpasolutions.es",
                    subject:"Test Email",
                    html: "<b> NO ME CREO QUE HAYA LLEGADO </b>",
                    attachments:uploadedFiles
                }

                const contractList = await Contract.find({visible:true,mainStatus:"Pending"},'pq cliente importe comercial')
                console.log(contractList)
                // //Send Email
                // await sendEmail(emailParams)
                formData={
                    succesMsg:"Contrato "+pq+" Creado Correctamente.",
                    contractList:contractList
                }
                res.render("contracts.hbs",{formData});
            }
        }
    }
});

router.get("/displayClosedContracts", async (req,res)=>{
    
    if (req.session===undefined) {
        res.redirect("/")
    }else{
        const contractList = await Contract.find({visible:true,mainStatus:"Closed"},'pq cliente importe comercial')
        // console.log(contractList)
        contractList.forEach(pq=>{
            pq.importe = numberToCurrency(pq.importe)
        })
        // contractList.importe=numberToCurrency(contractList.importe)
        // console.log(contractList)
        formData={
            showClosed:true,
            contractList:contractList
        }
        res.render("contracts.hbs",{formData});
    }
})
router.get("/displayPendingContracts", async (req,res)=>{
    const errorMsg = req.query.errorMsg
    console.log("ERROR MESSAGE THROUGH QUERY: ", errorMsg)
    await deleteDir(path.join(__dirname,"uploadedContracts"))

    if (req.session===undefined) {
        res.redirect("/")
    }else{
        const contractList = await Contract.find({visible:true,mainStatus:"Pending"},'pq cliente importe comercial')
        // console.log(contractList)
        contractList.forEach(pq=>{
            pq.importe = numberToCurrency(pq.importe)
        })
        // console.log(contractList)
        formData={
            errorMsg:errorMsg,
            showClosed:false,
            contractList:contractList
        }
        res.render("contracts.hbs",{formData});
    }
})
router.get("/deleteContract/:id",async(req,res)=>{
    // console.log(req.params.id)
    const id=req.params.id
    // console.log("GET INSIDE ID: ", id)
    await Contract.findByIdAndUpdate({_id:id},{visible:false})
    res.redirect("/displayPendingContracts")
})

router.post("/rejectContract/:id",async(req,res)=>{
    console.log("ENTERED REJECT CONTRACT / ID")
    const {role,reason}=req.body
    const id=req.params.id
    // const id=req.params.id
    // const role=req.params.role
    // const reason=req.params.reason
    // const userName = req.session.currentUser.userName
    // const userSurname = req.session.currentUser.userSurname
    // console.log(id)
    // console.log(userName)
    // console.log(userSurname)
    console.log(role)
    console.log(reason)
    errorMsg = createErrorMsgReject(role,reason)
    console.log(errorMsg)
    
    let contract = await Contract.find({_id:id})
    let historico = contract[0].historico
    console.log(historico)
    if (errorMsg!==""){
        res.redirect('/displayPendingContracts?errorMsg='+errorMsg)
    }else{

        //Save Reject Action


        //Send Rejection Email
        successMsg = "Contrato Rechazado Correctamente"
        res.redirect('/displayPendingContracts?successMsg='+successMsg)
    }

    // res.render("contracts",{errorMsg})
    


})

async function sendEmail(emailParams){
    let attachmentsObj = []
    for (i=0;i<emailParams.attachments.length;i++){
        attachmentsObj.push(
            {
                path:emailParams.attachments[i],
                filename:emailParams.attachments[i].split("\\")[emailParams.attachments[i].split("\\").length-1]
            }
        )
    }
    // console.log(attachmentsObj)
    let transporter = nodemailer.createTransport({
        host: emailParams.host,
        port: emailParams.port,
        secure:false,
        auth: {
            user: emailParams.auth.user,
            pass: emailParams.auth.pass
          }
    })
    let info=await transporter.sendMail({
        from: emailParams.from,
        to: emailParams.to,
        subject: emailParams.subject,
        html: emailParams.html,
        attachments:attachmentsObj
    })
}
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
async function deleteDir(dir){
    console.log("deleting uploadedContracts")
    try {
        await fs.remove(dir)
        console.log('Uploaded Contracts Deleted!')
      } catch (err) {
        console.error(err)
      }
}
function editPQ(pq){
    if (pq.split('-').length-1===2){return pq;}
    if (pq===undefined){return ""}else{return pq.split('-')[0] + "-"+pq.split('-')[1];}
}
function createErrorMessageOnNewContract(pq,comercial,cliente,obra,usuarioFinal,nPedido,importe,fechaStatusWon,fechaRecepcion){
    var errorMsg = [];
    //Check Empty Variables.
    if (pq===undefined){errorMsg.push('PQ');}
    if (comercial ==undefined){errorMsg.push('nombre del comercial');}
    if (cliente ==undefined){errorMsg.push('cliente');}
    if (obra ==undefined){errorMsg.push('obra');}
    if (usuarioFinal ==undefined){errorMsg.push('usuario final');}
    if (nPedido ==undefined){errorMsg.push('Nº de pedido');}
    if (importe ==undefined){errorMsg.push('importe');}
    if (fechaStatusWon ==undefined){errorMsg.push('fecha de status Won');}
    if (fechaRecepcion ==undefined){errorMsg.push('fecha de recepción del contrato');}
    //Create the Error Message Parts.
    let errorMsgStart = "Los campos "
    let emptyFields = ""
    let errorMsgEnd = " se encuentran vacíos en la hoja de firmas." 
    //Concatenates empty fields.
    for(i=0;i<errorMsg.length;i++){
        if (i!== errorMsg.length){
            emptyFields += errorMsg[i]+", "
        }else{
            emptyFields += errorMsg[i]
        }
    }
    //Create the error message to be returned.
    if(emptyFields!==""){
        returnErrorMsg = [errorMsgStart+emptyFields+errorMsgEnd]
    } else {
        returnErrorMsg = []
    }
    
    return returnErrorMsg;
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
async function createErrorMsgRegister(username, usersurname, email, repeatemail, password, repeatedpassword, role){
    let resultErrorMsg=[]
    
    //INSERT ERRORS  (Validates that the fields are not empty).
    let insertErrorMsg = []
    let insertErrorMsgOutPut=''
    if (username=== ""||username ==null){insertErrorMsg.push('name')}
    if (usersurname=== ""||usersurname ==null){insertErrorMsg.push('surname')}
    if (email=== ""||email ==null){insertErrorMsg.push('email')}
    if (password=== ""||password ==null){insertErrorMsg.push('password')}
    if (role=== ""||role ==null || role === "Select your Role and Department"){insertErrorMsg.push('role/department')}
 
    switch (insertErrorMsg.length){
        case 1:
            insertErrorMsgOutPut = "You forgot to fill your " + insertErrorMsg[0] + "."
            break;
        case 2:
            insertErrorMsgOutPut = "You forgot to fill your " + insertErrorMsg[0] + " and " + insertErrorMsg[1] + "."
            break;
        case 3:
            insertErrorMsgOutPut = "You forgot to fill your " + insertErrorMsg[0] + ", " + insertErrorMsg[1] + " and " + insertErrorMsg[2] + "."
            break;
        case 4:
            insertErrorMsgOutPut = "You forgot to fill your " + insertErrorMsg[0] + ", " + insertErrorMsg[1] + ", " + insertErrorMsg[2] + " and " + insertErrorMsg[3] + "."
            break;
        case 5:
            insertErrorMsgOutPut = "You forgot to fill your " + insertErrorMsg[0] + ", " + insertErrorMsg[1] + ", " + insertErrorMsg[2] + ", " + insertErrorMsg[3] + " and " + insertErrorMsg[4] + "."
            break;
    }
    if (insertErrorMsgOutPut!==''){
        resultErrorMsg.push(insertErrorMsgOutPut)
    }

    //REPEAT ERRORS (Validates that you repeated email and password).
    let repeatErrorMsgOutPut=''
    let repeatErrorMsg=[]
    if (repeatemail=== "" && !insertErrorMsgOutPut.includes('email')){repeatErrorMsg.push('email')}
    if (repeatedpassword=== ""  && !insertErrorMsgOutPut.includes('password')){repeatErrorMsg.push('password')}
    switch (repeatErrorMsg.length){
        case 1:
            repeatErrorMsgOutPut = "You forgot to repeat your " + repeatErrorMsg[0] + "."
            break;
        case 2:
            repeatErrorMsgOutPut = "You forgot to repeat your " + repeatErrorMsg[0] + " and " + repeatErrorMsg[1] + "."
            break;
    }
    if (repeatErrorMsgOutPut!==''){
        resultErrorMsg.push(repeatErrorMsgOutPut)
    }

    //MATCH ERRORS (Validdates email and passwords match).
    let matchErrorMsgOutPut=''
    let matchErrorMsg=[]
    if (email!==repeatemail && !repeatErrorMsgOutPut.includes('email') && !insertErrorMsgOutPut.includes('email')){matchErrorMsg.push('emails')}
    if (password!==repeatedpassword && !repeatErrorMsgOutPut.includes('password') && !insertErrorMsgOutPut.includes('password')){matchErrorMsg.push('passwords')}
    switch (matchErrorMsg.length){
        case 1:
            matchErrorMsgOutPut = "The " + matchErrorMsg[0] + " doesn't match."
            break;

        case 2:
            matchErrorMsgOutPut = "The " + matchErrorMsg[0] + " and the " + matchErrorMsg[1] + " doesn't match."
            break;
    }
    if (matchErrorMsgOutPut!==''){
        resultErrorMsg.push(matchErrorMsgOutPut)
    }

    //Validates Password Lenght
    if (password.length<6  && !repeatErrorMsgOutPut.includes('password') && !insertErrorMsgOutPut.includes('password')){resultErrorMsg.push("The password must have at least 6 characters.")}
    // console.log(resultErrorMsg)

    return resultErrorMsg
}
function createErrorMsgReject(role,reason){
    if(role === "Select your Role and Department" && reason ==="Select a reason"){
        errorMsg = "Select a role and a reason."
    } else if (role === "Select your Role and Department"){
        errorMsg = "Select a role."
    } else if (reason ==="Select a reason"){
        errorMsg = "Select a reason."
    } else {
        errorMsg = ""
    }
    return errorMsg;
}

function numberToCurrency(number){
    // console.log(number)
    result = new Intl.NumberFormat("de-DE" ,{style: "currency", currency: "EUR"}).format(number)
    result = result.slice(2)+"€"
    result = result.replace(".","!").replace(",",".").replace("!",",").replace(",00","")
    // console.log(result)
    return result
  }


router.get('/editContracts',(req,res,next)=>{
    res.render('editContracts')
});

router.get('/alertsContracts',(req,res,next)=>{
    res.render('alertsContracts')
});

module.exports=router;