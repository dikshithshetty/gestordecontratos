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
const Notice = require('./models/notice-model')
const { Console } = require('console');
const { findOne } = require("./models/user-model");
const { pbkdf2 } = require('crypto');

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
router.post('/', async(req,res,next)=>{
    // console.log("Entering Login POST Method")
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
    const{username, usersurname, email, repeatemail, password, repeatedpassword, role,role1,role2,role3,role4} = req.body;
    var errorMsg = [];
    // console.log("Role4: ",role4)
        roleArr = createRoleArray(role,role1,role2,role3,role4)
        // console.log("Role Array", roleArr)
    errorMsg = await createErrorMsgRegister(username, usersurname, email, repeatemail, password, repeatedpassword, roleArr)
    
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
        
        await User.create({name:username,surname:usersurname,email,password:hashPass,role:roleArr});
        formData.succesMsg="User succesfully created.";
        res.render("login-register/login",{formData, layout: false});
    } else{
        res.render("login-register/register",{formData, layout: false});
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
    if (!req.session.currentUser){res.redirect("/")}

    if (req.session===undefined) {
        res.redirect("/")
    }else{
        // console.log("--------------- UPLOADING NEW CONTRACT ---------------");
        // console.log(req.files)
        if (req.files.length===0){
            errorMsg="No se ha seleccionado ningún contrato.";
            // res.render("contracts.hbs",{noFileSelected});
            res.redirect("/displayPendingContracts?errorMsg="+errorMsg)
        }else {
            const sesionEmail = req.session.currentUser.email
            let currentUser = await User.find({email:sesionEmail})

            //Save Excel document to "temporaryFiles" folder to read it
            let tempFolder = path.join(__dirname,"temporaryFiles");
            let tempFile = path.join(tempFolder,req.files[0].originalname);
            let ext = tempFile.substr(tempFile.lastIndexOf('.') + 1);
            // console.log("Extensión: " ,ext)
            if (ext!=="xlsx" && ext!=="xls" && ext!=="xlsm"){
                errorMsg="La hoja de firmas no se encuentra en formato Excel."
                // res.render("contracts.hbs",{noFileSelected})
                res.redirect("/displayPendingContracts?errorMsg="+errorMsg)
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
                res.redirect("/displayPendingContracts?errorMsg="+errorMsg);
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

                nuevaAccion=[{
                    accion:"Contrato Creado",
                    persona:currentUser[0].name+" "+currentUser[0].surname,
                    icono:"Nuevo Contrato",
                    fecha: getCurrentDate(),
                    observaciones:""
                }]


                //Create Contract to DB
                // console.log("!!!!!!ABOUT TO CREATE CONTRACT!!!!!")
                await Contract.create({pq,comercial,cliente,obra,usuarioFinal,nPedido,importe,fechaStatusWon,fechaRecepcion,uploadedFiles,historico:nuevaAccion});

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

                // const contractList = await Contract.find({visible:true,mainStatus:"Pending"},'pq cliente importe comercial')
                // console.log(contractList)
                // //Send Email
                // await sendEmail(emailParams)
                successMsg="Contrato "+pq+" Creado Correctamente.",

                // formData={
                //     succesMsg:succesMsg,
                //     contractList:contractList
                // }
                // console.log("!!!!!!ABOUT TO REDIRECT!!!!!")
                // res.render("contracts.hbs",{formData});
                res.redirect("/displayPendingContracts?successMsg="+successMsg);
            }
        }
    }
});

router.get("/displayClosedContracts", async (req,res)=>{
    // console.log("INSIDE DISPLAY CLOSED CONTRACTS")
    if (!req.session.currentUser){res.redirect("/")}

    const contractList = await Contract.find({visible:true,mainStatus:"Closed"},'pq cliente importe comercial')
    // console.log(contractList)
    contractList.forEach(pq=>{
        pq.importe = numberToCurrency(pq.importe)
    })
    // console.log(contractList)
    formData={showClosed:true,contractList:contractList}
    res.render("contracts.hbs",{formData});
})
router.get("/displayPendingContracts", async (req,res)=>{
    if (!req.session.currentUser){res.redirect("/")}

    const errorMsg = req.query.errorMsg
    const successMsg = req.query.successMsg
    const sesionEmail = req.session.currentUser.email

    let currentUser = await User.find({email:sesionEmail})
    // console.log(currentUser[0].role)
    // await deleteDir(path.join(__dirname,"uploadedContracts"))

    var contractList = await Contract.find({visible:true,mainStatus:"Pending"},'pq cliente historico importe comercial')
    const roleObj = await createRoleSelector(currentUser[0].role)
    // console.log(roleObj)
    // console.log(contractList)

    contractList.forEach(contract=>{
        contract.importe = numberToCurrency(contract.importe)
        let allowApprove = canUserSign(currentUser,contract)
        // let allowApprove = true;
        // console.log(allowApprove)
        let allowReject = true;
        contract.allowApprove = allowApprove
        contract.allowReject = allowReject
        // console.log(contract.allowAprove)
    })
    
    formData={
        errorMsg:errorMsg,
        showClosed:false,
        successMsg:successMsg,
        contractList:contractList,
        roleObj:roleObj,
    }
    // console.log("Form Data -->",formData)
    res.render("contracts.hbs",{formData});
})
router.post("/approveContract/:id",async(req,res)=>{
    if (!req.session.currentUser){res.redirect("/")}
    // console.log("ENTERED APPROVE CONTRACT / ID")
    const {role,approveInfo}=req.body
    const sesionEmail = req.session.currentUser.email
    const id=req.params.id
    // const role=req.params.role
    const fullRole=role
    // const approveInfo=req.params.approveInfo
    // console.log(req.params)
    // console.log(id,role,approveInfo)
    // console.log(id)
    //QUE HACEMOS SI NO ENCUENTRA EL USUARIO?
    let currentUser = await User.find({email:sesionEmail})
    // console.log(currentUser)
    // console.log(fullRole)

    const dept=fullRole.split(" - ")[0]
    const splitRole=fullRole.split(" - ")[1]
    console.log(dept)
    console.log(splitRole)
    
    let personaFirma=getPersonaHistorico(currentUser[0].name,currentUser[0].surname,dept)
    console.log(personaFirma)
    nuevaAccion={
        accion:"Aprobado",
        persona:personaFirma,
        icono:"Pulgar Arriba",
        fecha: getCurrentDate(),
        observaciones:approveInfo
    }
    let contract = await Contract.find({_id:id})
    let historico = contract[0].historico
    let canDirectorsign=getCanDirectorSign(historico)
    console.log(canDirectorsign)
    errorMsg = createErrorMsgApprove(role,canDirectorsign)
    // console.log("HISTORICO EN DB: ",historico)
    // console.log(nuevaAccion)
    if (errorMsg!==""){
        res.redirect('/displayPendingContracts?errorMsg='+errorMsg)
    }else{
        //Save Reject Action
        historico.push(nuevaAccion)
        switch (dept){
            case "Control de Riesgos":
                if(splitRole === "Autorizado"){
                    await Contract.findByIdAndUpdate({"_id":id},{"historico":historico,"firmas.autCRiesgos.person":personaFirma,"firmas.autCRiesgos.value":true})
                }else{
                    await Contract.findByIdAndUpdate({"_id":id},{"historico":historico,"firmas.dirCRiesgos.person":personaFirma,"firmas.dirCRiesgos.value":true})
                }
                break;
            case "Operaciones":
                if(splitRole === "Autorizado"){
                    await Contract.findByIdAndUpdate({"_id":id},{"historico":historico,"firmas.autOperaciones.person":personaFirma,"firmas.autOperaciones.value":true})
                }else{
                    await Contract.findByIdAndUpdate({"_id":id},{"historico":historico,"firmas.dirOperaciones.person":personaFirma,"firmas.dirOperaciones.value":true})
                }
                break;
            case "Comercial":
                if(splitRole === "Autorizado"){
                    await Contract.findByIdAndUpdate({"_id":id},{"historico":historico,"firmas.autComercial.person":personaFirma,"firmas.autComercial.value":true})
                }else{
                    await Contract.findByIdAndUpdate({"_id":id},{"historico":historico,"firmas.dirComercial.person":personaFirma,"firmas.dirComercial.value":true})
                }
                break;
            case "PRL":
                if(splitRole === "Autorizado"){
                    await Contract.findByIdAndUpdate({"_id":id},{"historico":historico,"firmas.autPRL.person":personaFirma,"firmas.autPRL.value":true})
                }else{
                    await Contract.findByIdAndUpdate({"_id":id},{"historico":historico,"firmas.dirPRL.person":personaFirma,"firmas.dirPRL.value":true})
                }
                break;
        }
        // await Contract.findByIdAndUpdate({_id:id},{historico:historico})

        //Send Approve Email (if needed)
        // await sendEmail(emailParams)
        // console.log("!!!!!!!!!!ABOUT TO DISPLAY SUCCES MESSAGE!!!!!!!!!!!!!")
        successMsg = "Contrato Aprobado Correctamente"
        res.redirect('/displayPendingContracts?successMsg='+successMsg)
    }

})
router.get("/deleteContract/:id",async(req,res)=>{
    if (!req.session.currentUser){res.redirect("/")}

    // console.log(req.params.id)
    const id=req.params.id
    // console.log("GET INSIDE ID: ", id)
    await Contract.deleteOne({_id:id})
    res.redirect("/displayPendingContracts")
})
router.post("/rejectContract/:id",async(req,res)=>{
    if (!req.session.currentUser){res.redirect("/")}
   
    // console.log("ENTERED REJECT CONTRACT / ID")
    const {role,reason,rejectInfo}=req.body
    const fullRole=role
    const sesionEmail = req.session.currentUser.email
    const id=req.params.id
    //QUE HACEMOS SI NO ENCUENTRA EL USUARIO?
    let currentUser = await User.find({email:sesionEmail})
    // console.og(currentUser)
    
    const dept=fullRole.split(" - ")[0]
    const splitRole=fullRole.split(" - ")[1]
    errorMsg = createErrorMsgReject(fullRole,reason)
    let personaFirma=getPersonaHistorico(currentUser[0].name,currentUser[0].surname,dept)
    nuevaAccion={
        accion:"Rechazado (" +reason+")",
        persona:personaFirma,
        icono:"Pulgar Abajo",
        fecha: getCurrentDate(),
        observaciones:rejectInfo
    }
    // console.log(nuevaAccion)
    // observaciones={reason:reason,additionalInfo:rejectInfo}

    let contract = await Contract.find({_id:id})
    let historico = contract[0].historico
    // console.log("HISTORICO EN DB: ",historico)
    if (errorMsg!==""){
        res.redirect('/displayPendingContracts?errorMsg='+errorMsg)
    }else{

        //Save Reject Action
        historico.push(nuevaAccion)
        firmas={
            autOperaciones:{value:false,person:""},
            dirOperaciones:{value:false,person:""},
            autComercial:{value:false,person:""},
            dirComercial:{value:false,person:""},
            autPRL:{value:false,person:""},
            dirPRL:{value:false,person:""},
            autCRiesgos:{value:false,person:""},
            dirCRiesgos:{value:false,person:""}
          }
        
        await Contract.findByIdAndUpdate({_id:id},{historico, firmas})

        //Send Rejection Email
        // await sendEmail(emailParams)


        successMsg = "Contrato Rechazado Correctamente"
        res.redirect('/displayPendingContracts?successMsg='+successMsg)
    }

    // res.render("contracts",{errorMsg})
    


})
router.get("/alertsContracts",async (req,res,next)=>{
    const notice = await Notice.find();
    // console.log(notice)


    res.render('alertsContracts',{notice})
});
router.post("/updateAlerts/:alertType",async(req,res)=>{
    if (!req.session.currentUser){res.redirect("/")}
    const alertType=req.params.alertType;
    const {email,cc,subject,emailBody}=req.body
    // console.log(alertType,email,cc,subject,emailBody)
    const newAlert = await Notice.findOneAndUpdate({noticeType:alertType},{destinatario:email,cc:cc,subject:subject,emailBody:emailBody})
    // console.log(newAlert)
    const successMsg = "Configuración Guardada"
    res.redirect("/alertsContracts?successMsg="+successMsg)
})
router.get("/editContracts/:id",async(req,res,next)=>{
    
    // console.log("entered the edit contract function")
    if (!req.session.currentUser){res.redirect("/")}
    const id = req.params.id
    // console.log(id)
    const selectedContract = await Contract.findOne({_id:id})
    // console.log(selectedContract)
    const uploadedFiles = getFiles(selectedContract.uploadedFiles)
    const showeditButons = getshoweditButons(selectedContract.mainStatus)

    contr={
        pq:selectedContract.pq,
        cliente:selectedContract.cliente,
        comercial:selectedContract.comercial,
        obra:selectedContract.obra,
        usuarioFinal:selectedContract.usuarioFinal,
        nPedido:selectedContract.nPedido,
        importe:numberToCurrency(selectedContract.importe),
        fechaStatusWon:selectedContract.fechaStatusWon,
        fechaRecepcion:selectedContract.fechaRecepcion,
        fechaCreacionApp:selectedContract.fechaCreaccionApp,
        historico:selectedContract.historico,
        firmas:selectedContract.firmas,
        uploadedFiles:uploadedFiles,
        showeditButons:showeditButons
    }
    
    res.render("editContracts",contr)
    // res.redirect("/editContracts?pq="+pq)

})
router.get("/deleteFiles/:pq/:fileName",async(req,res,next)=>{
    let pq=req.params.pq
    let fileName = req.params.fileName
    // console.log(pq)
    // console.log("fileName: ",fileName)
    let currentpq = await Contract.find({pq:pq})
    let id = currentpq[0].id
    // console.log("id: ",id)
    let uploadedFiles = currentpq[0].uploadedFiles
    // console.log(uploadedFiles)
    var newUploadedFiles=[]
    for (i=0;i<uploadedFiles.length;i++){
        if(uploadedFiles[i].includes(fileName)){
            var fileToDelete = uploadedFiles[i]
            // newUploadedFiles = uploadedFiles.splice(i,1)
        } else {
            newUploadedFiles.push(uploadedFiles[i])
        }
    }
    // console.log("filetoDelete: ",fileToDelete)
    await Contract.findOneAndUpdate({pq:pq},{uploadedFiles:newUploadedFiles})
    await fs.remove(fileToDelete)
    
    // console.log(newUploadedFiles)
    res.redirect("/editContracts/"+id)
})
router.get("/profile",async(req,res,next)=>{
    if (!req.session.currentUser){res.redirect("/")}
    //Obtener info del Usuario actual (sesion iniciada)
    const sesionEmail = req.session.currentUser.email
    let currentUser = await User.find({email:sesionEmail})
    user = currentUser[0]
    // console.log(currentUser)
    res.render('profile', {user})
});


function getCanDirectorSign(historico){
    let indexLastRejection = -1
    // let historico = contract.historico
    for(i=historico.length-1;i>=0;i--){
        if(historico[i].accion.includes("Rechazado")){indexLastRejection=i;break}
    }
    console.log("indexLastRejection: -->", indexLastRejection)
    //Cut everything previous to last rejection.
    if (indexLastRejection===-1){
        var historicoRelevante = historico
    } else{
        var historicoRelevante = historico.slice(indexLastRejection+1)
    }
    console.log(historicoRelevante)
    if (countEscalados(historicoRelevante)===1){return true}else{return false}
}
function getshoweditButons(mainStatus){
    if(mainStatus==="Closed"){
        return false
    }   else {
        return true
    }
}
function getFiles(uploadedFiles){
    const result = uploadedFiles.map(file=>{
        let separator ="\\"
        let fileName = file.split(separator)[file.split(separator).length-1]
        // console.log("fileName:",fileName)
        let filePathArr = file.split(separator)
        // console.log("filePathArr:",filePathArr)

        let folderNumber = filePathArr.indexOf("contractGenerator")+1
        // console.log("folderNumber:",folderNumber)

        let slicedPath = filePathArr.slice(folderNumber)
        // console.log("slicedPath:",slicedPath)

        let filePath=""
        for (i=0;i<slicedPath.length;i++){
            filePath = path.join(filePath,slicedPath[i])
            // filePath=filePath+slicedPath[i]
        }
        // console.log(filePath)

        // let filePath = path.join(slicedPath)
        // console.log(filePath)
        return {fileName:fileName,filePath:filePath}
    })
    // console.log(result)
    return result
}
function canUserSign(user,contract){
    // console.log("!!!!!!!!!!!!!!!INSIDE canUserSign!!!!!!!!!!!!!!!!")
    user = user[0]
    //Transforms "Control de Riesgos - Director" to "Esteve M. (C. Riesgos) for each role."
    let roles = formatRolesToResumedRoles(user)
    // console.log("Roles: -->",roles)
  
    //Get the historico after the last reject
    let historico = contract.historico
    let relevantHistorico = getRelevantHistorico(historico)
    // console.log("historicoRelevante: -->",relevantHistorico)
    
    //Count Nº de Escalados in Historico
    let numEscalados = countEscalados(relevantHistorico)
    // console.log("Número de Escalados:-->",numEscalados)

    //Get historico after the last escalado
    let historicoLastEscalado = getLastEscaladoHistorico(relevantHistorico)

    let result = false
    roles.forEach(role=>{

        let cargo=role.split("-")[2]
        let dept=role.split("-")[1]
        // console.log("--->>> CURRENT ROLE:",cargo,"   --->>> CURRENT DEPT:",dept)
        switch (cargo){
            case "Autorizado":
                // console.log("---------->>>>>Soy Autorizado!")
                if (numEscalados===0){
                    let approvedByMyDepartment = checkIfApprovedByMyDepartment(relevantHistorico,dept)
                    // console.log("Previously Approved by My Department?",approvedByMyDepartment)
                    if (approvedByMyDepartment===false){result=true}
                }
            break;
            case "Director":
                // console.log("---------->>>>>Soy Director!")
                if (numEscalados===1){
                    let approvedByMyDepartment = checkIfApprovedByMyDepartment(historicoLastEscalado,dept)
                    // console.log("Previously Approved by My Department?",approvedByMyDepartment)
                    if (approvedByMyDepartment===false){result=true}

                }

            break;
            case "Dirección General":
                // console.log("---------->>>>>Soy Director General!")
                if (numEscalados===2){
                    let approvedByMyDepartment = checkIfApprovedByMyDepartment(historicoLastEscalado,dept)
                    // console.log("Previously Approved by My Department?",approvedByMyDepartment)
                    if (approvedByMyDepartment===false){result=true}    
                }


            break;
        }
    })



    // result = true
    // console.log ("RESULT: ", result)
    // console.log("!!!!!!!!!!!!!!!OUTSIDE canUserSign!!!!!!!!!!!!!!!!")
    return result
}
function getLastEscaladoHistorico(historico){
    let indexLastEscalado = -1
    // let historico = contract.historico
    for(i=historico.length-1;i>=0;i--){
        if(historico[i].accion.includes("Escalado")){indexLastEscalado=i;break}
    }
    // console.log("indexLastEscalado: -->", indexLastEscalado)
    //Cut everything previous to last escalado.
    if (indexLastEscalado===-1){
        var historicoLastEscalado = historico
    } else{
        var historicoLastEscalado = historico.slice(indexLastEscalado+1)
    }
    return historicoLastEscalado
}
function checkIfApprovedByMyDepartment(hist,dept){
    // console.log("------------check if aproved by my department------------")
    // console.log(hist)
    // console.log(dept)
    for (i=0;i<hist.length;i++){
        if (hist[i].persona.includes(dept)){return true;}
        // console.log(hist[i].persona.includes(dept))
    }
    return false
}
function countEscalados(hist){
    // console.log(hist)
    let statusEscalados = hist.filter(accion=>{
        // console.log(accion.accion.includes("Rechazado"))
        return accion.accion.includes("Escalado")
    })
    // console.log(statusEscalados)
    return statusEscalados.length
}
function getRelevantHistorico(historico){
    let indexLastRejection = -1
    // let historico = contract.historico
    for(i=historico.length-1;i>=0;i--){
        if(historico[i].accion.includes("Rechazado")){indexLastRejection=i;break}
    }
    // console.log("indexLastRejection: -->", indexLastRejection)
    //Cut everything previous to last rejection.
    if (indexLastRejection===-1){
        var historicoRelevante = historico
    } else{
        var historicoRelevante = historico.slice(indexLastRejection+1)
    }
    return historicoRelevante
}
function formatRolesToResumedRoles(user){
    // console.log(user)
    const resumedUserRole = user.role.map(role=>{
        personalHist = getPersonaHistorico(user.name,user.surname,role.split(" - ")[0])
        return personalHist.replace(" (","-").replace(")","-")+role.split(" - ")[1]
        // console.log(personalHist)
        // return personalHist
    })
    // console.log("resumedUserRole: --> ",resumedUserRole)
    return resumedUserRole
}
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
        // console.log('File Removed: '+filePath)
    } catch (err) {
        // console.error(err)
    }
}
async function createDirectory(dir){
    try{
        await fs.ensureDir(dir)
        // console.log("Directory Created: " +dir)
    } catch (err){
        // console.error(err)
    }
}
async function saveFile(src,dest){
    try{
        await fs.ensureLink(src,dest)
        // console.log("File Saved from: " + src + " to " + dest)
    } catch (err){
        // console.error(err)
    }
}
async function deleteDir(dir){
    // console.log("deleting uploadedContracts")
    try {
        await fs.remove(dir)
        // console.log('Uploaded Contracts Deleted!')
      } catch (err) {
        // console.error(err)
      }
}
function editPQ(pq){
    try{
        if (pq.split('-').length-1===2){return pq;}
        if (pq===undefined){return ""}else{return pq.split('-')[0] + "-"+pq.split('-')[1];}
    } catch (error){
        // console.log(error)
    }
    
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
    var someEmptyRole = false
    role.forEach(role=>{
        if(role==="Select your Role and Department"){someEmptyRole=true}
    })
    // console.log(someEmptyRole)
    if (someEmptyRole===true){insertErrorMsg.push('role/department')}
    // console.log(insertErrorMsg)
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
    // if(email!==""){
    //     const checkedUser = await User.findOne({email:email})
    //     if(checkedUser){resultErrorMsg.push("This email already existst.")}
    // }

    return resultErrorMsg
}
async function modifyContract(pq){
    
        pq.importe = numberToCurrency(pq.importe)
        // pq['allowAccept']= true
        pq.allowAccept=true
        // console.log(pq)
        // console.log(pq.allowAccept)
        // console.log(pq.importe)
        // console.log("!!!!!!!!!!!!  PQ FINISH !!!!!!!!!!!!!")
    
    return pq
}
async function modifyContractList(contractList){
    var newContractList = contractList.forEach(async pq=>{
        pq = await modifyContract(pq)
    })
    return newContractList
}
function createErrorMsgReject(role,reason){
    // console.log(role)
    // console.log(reason)
    if(role === "Select your Role and Department" && reason ==="Select a reason"){
        errorMsg = "Select a role and a reason."
    } else if (role === "Select your Role and Department"){
        errorMsg = "Select a role."
    } else if (reason ==="Select a reason"){
        errorMsg = "Select a reason."
    } else {
        errorMsg = ""
    }
    // console.log(errorMsg)
    return errorMsg;
}
function createErrorMsgApprove(role,canDirectorsign){
    if(role === "Select your Role and Department"){
        errorMsg = "Select a role."
    } else {
        if (!canDirectorsign && role.includes("Director")){
            errorMsg="You must aprove as Autorized befor approving as Director."
        }else{
            errorMsg=""
        }
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
function createRoleArray(role,role1,role2,role3,role4){
    const roleArr = []
    // console.log(role4)
    if (role!==undefined){roleArr.push(role)}
    if (role1!==undefined){roleArr.push(role1)}
    if (role2!==undefined){roleArr.push(role2)}
    if (role3!==undefined){roleArr.push(role3)}
    if (role4!==undefined){roleArr.push(role4)}
    return roleArr
}
function getWho(currentUser,role){
    who={
        name:currentUser[0].name,
        surname:currentUser[0].surname,
        email:currentUser[0].email,
        roleDept:role,
        department:role.split(" - ")[0],
        role:role.split(" - ")[1]
    }
    return who;
}
function getStatusRejection(dept){
    // console.log(dept)
    let status={
        mainStatus:"Pending",
        operationsStatus:"",
        comercialStatus:"",
        prlStatus:"",
        controlDeRiesgosStatus:""
        }
    if (dept === "Comercial"){
        status.comercialStatus = "Rejected"
    }else if (dept === "Control de Riesgos"){
        status.operationsStatus = "Rejected"
    }else if (dept === "Operaciones"){
        status.prlStatus = "Rejected"
    }else if (dept === "PRL"){
        status.controlDeRiesgosStatus = "Rejected"
    }
    return status
}
function getPersonaHistorico(name,surname,dept){
    // let name1=""
    // let name2=""
    // let minidept=""
    // let result=""
    if (name.includes(" ")){
        var name1 = name.split(" ")[0]
        var name2 = name.split(" ")[1].charAt(0)
        name1 = name1 + " " + name2 + "."
    } else {
        var name1=name
    }
    
    let surnameInicial=surname.charAt(0)
    
    let minidept = ""

    if (dept === "Comercial"){
        minidept = "Comerc."
    }else if (dept === "Control de Riesgos"){
        minidept="C. Riesgos"
    }else if (dept === "Operaciones"){
        minidept = "Oper."
    }else if (dept === "PRL"){
        minidept = "PRL"
    }
    let result = name1 + " " + surnameInicial+". (" + minidept +")"
    
    return result
}
function getCurrentDate(){
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();

    today = dd + '/' + mm + '/' + yyyy;
    return today
}
function getCanReject(historico){
    // const data=JSON.parse(historico)
    canReject = historico[historico.length-1].accion.split(" ")[0]
    if (canReject === "Rechazado"){
        return false;
    } else{
        return true;
    }
    // console.log(canReject)
}
async function createRoleSelector(role){
    var roleCountVariable=0
    var roleObj={}
    if (role.indexOf("Comercial - Autorizado")!==-1){roleObj.autComercial=true;roleCountVariable=+1}else{roleObj.autComercial=false}
    if (role.indexOf("PRL - Autorizado")!==-1){roleObj.autPRL=true;roleCountVariable=+1}else{roleObj.autPRL=false}
    if (role.indexOf("Operaciones - Autorizado")!==-1){roleObj.autOperaciones=true;roleCountVariable=+1}else{roleObj.autOperaciones=false}
    if (role.indexOf("Control de Riesgos - Autorizado")!==-1){roleObj.autControlRiesgos=true;roleCountVariable=+1}else{roleObj.autControlRiesgos=false}
    if (role.indexOf("Comercial - Director")!==-1){roleObj.dirComercial=true;roleCountVariable=+1}else{roleObj.dirComercial=false}
    if (role.indexOf("PRL - Director")!==-1){roleObj.dirPRL=true;roleCountVariable=+1}else{roleObj.dirPRL=false}
    if (role.indexOf("Operaciones - Director")!==-1){roleObj.dirOperaciones=true;roleCountVariable=+1}else{roleObj.dirOperaciones=false}
    if (role.indexOf("Control de Riesgos - Director")!==-1){roleObj.dirControlRiesgos=true;roleCountVariable=+1}else{roleObj.dirControlRiesgos=false}
    
    if (roleCountVariable>1){roleObj.singleRole = true}else{roleObj.singleRole = false}
    return roleObj
}

module.exports=router;