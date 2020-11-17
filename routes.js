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
var crypto = require('crypto');

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
    try{

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
                console.log("User Account Activated:" , user.accountStatus)
                // console.log("User Account Is Unactive:" , user.accountStatus===false)
                if (user.accountStatus===false){
                    console.log("User Account It Not Activated")
                    errorMsg="The account needs to be activated. Check your email and spam mailbox for the activation email."                 //Password is inccorrect.
                    formData={errorMsg:errorMsg,email:email,layout:false}
                    res.render("login-register/login",formData);            //Render Login and Error Message.
                } else {
                    console.log("User Account Is Active")                   //User Exists.
                    if (bcrypt.compareSync(password, user.password)) {          //Check if password match.
                        req.session.currentUser = user;                         //Save User Session.
                        // await deleteDir(path.join(__dirname,"uploadedContracts"))
                        await deleteDirectoryContent(path.join(__dirname,"uploadedContracts"))
                        await deleteDirectoryContent(path.join(__dirname,"temporaryFiles"))

                        res.redirect("/displayPendingContracts")                                       //Redirect to home.
                    }else{
                        errorMsg="Incorrect email or password."                 //Password is inccorrect.
                        formData={errorMsg:errorMsg,email:email,layout:false}
                        res.render("login-register/login",formData);            //Render Login and Error Message.
                    }
                }
            }
        }
    }catch(err){console.log("Error en Login Post:",err)}

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
    try{
        const{username, usersurname, email, repeatemail, password, repeatedpassword, role,role1,role2,role3,role4} = req.body;
        var errorMsg = [];
        // console.log("Role4: ",role4)
        roleArr = createRoleArray(role,role1,role2,role3,role4)
        // console.log("Role Array", roleArr)
        let accountActivationToken = await createToken()
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
            
            await User.create({name:username,surname:usersurname,email,password:hashPass,role:roleArr,accountActivationToken});
            let tokenLink =  path.join("https://gestordecontratos-nqx8w.ondigitalocean.app", 'activateAccount', accountActivationToken)

            emailParams={
                host:process.env.EMAIL_HOST,
                port:process.env.EMAIL_PORT,
                secure:false,
                // service:"Hotmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                from:'"Contract Manager - Account Activation [Action Required]"<estevemartinmauri@hotmail.com>',
                to:email,
                subject:"Contract Manager - Account Activation [Action Required]",
                html:getEmailBodyClickToActivateAccount(tokenLink)
                // attachments:uploadedFiles
            }
            await sendEmail(emailParams)

            formData.succesMsg="User succesfully created. Check your email to activate the account.";
            res.render("login-register/login",{formData, layout: false});
        } else{
            res.render("login-register/register",{formData, layout: false});
        }
    }   catch(err){
        console.log("Error en Register Form:",err)
    }
    
})
router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        res.redirect('/');
    })
})
router.get('/createContract',(req,res,next)=>{
    if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
        if (req.session!==undefined) {
            res.render('contracts');
        } else {
            res.redirect('/');
        }
    }
})
router.post("/uploadNewContractToDB",upload.any(), async (req,res)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
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
                            icono:"mail-unread-outline",
                            fecha: getCurrentDate(),
                            observaciones:""
                        }]


                        //Create Contract to DB
                        // console.log("!!!!!!ABOUT TO CREATE CONTRACT!!!!!")
                        await Contract.create({pq,comercial,cliente,obra,usuarioFinal,nPedido,importe,fechaStatusWon,fechaRecepcion,uploadedFiles,historico:nuevaAccion});
                        const contract= await Contract.find({pq})
                        await sendNoticeEmail("newContract",contract)
                        // // const newAlert = await Notice.findOneAndUpdate({noticeType:"newContract"},{destinatario:email,cc:cc,subject:subject,emailBody:emailBody})
                        // const noticeTemplate = await Notice.findOne({noticeType:"newContract"})
                        // console.log(noticeTemplate)
                        // emailParams={
                        //     host:process.env.EMAIL_HOST,
                        //     port:process.env.EMAIL_PORT,
                        //     secure:false,
                        //     // service:"Hotmail",
                        //     auth: {
                        //         user: process.env.EMAIL_USER,
                        //         pass: process.env.EMAIL_PASS
                        //     },
                        //     from:'"Automatic Alert from MPA Solutions"<estevemartinmauri@hotmail.com>',
                        //     to:noticeTemplate.destinatario,
                        //     cc:noticeTemplate.cc,
                        //     subject:noticeTemplate.subject,
                        //     html: noticeTemplate.emailBody,
                        //     attachments:uploadedFiles
                        // }

                        
                        // // const contractList = await Contract.find({visible:true,mainStatus:"Pending"},'pq cliente importe comercial')
                        // // console.log(contractList)
                        // // //Send Email
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
        }
    }catch(err){console.log("Error en Upload New Contract:",err)}

});

router.get("/displayClosedContracts", async (req,res)=>{
    try{
        // console.log("INSIDE DISPLAY CLOSED CONTRACTS")
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
            const contractList = await Contract.find({visible:true,mainStatus:"Closed"},'pq cliente importe comercial')
            // console.log(contractList)
            contractList.forEach(pq=>{
                pq.importe = numberToCurrency(pq.importe)
            })
            // console.log(contractList)
            formData={showClosed:true,contractList:contractList}
            res.render("contracts.hbs",{formData});
        }
    }catch(err){console.log("Error en DisplayClosedContracts Get:",err)}
})
router.get("/displayPendingContracts", async (req,res)=>{
    try{
        // console.log(req.session.currentUser)
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
        
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
        }
    }catch(err){console.log("Error en DisplayPendingContracts Get:",err)}
})
router.post("/approveContract/:id",async(req,res)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{

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
            if (fullRole.includes(" - ")){
                var dept=fullRole.split(" - ")[0]
                var splitRole=fullRole.split(" - ")[1]
            } else {
                var dept = "Dirección General"
                var splitRole = "Dirección General"
            }
            
            // console.log(dept)
            // console.log(splitRole)
            
            let personaFirma=getPersonaHistorico(currentUser[0].name,currentUser[0].surname,dept)
            // console.log(personaFirma)
            nuevaAccion={
                accion:"Aprobado",
                persona:personaFirma,
                icono:"thumbs-up-sharp",
                fecha: getCurrentDate(),
                observaciones:approveInfo
            }
            let contract = await Contract.find({_id:id})
            let historico = contract[0].historico
            let canDirectorGeneralSign = getCanDirectorGeneralsign(historico)
            // console.log("Can Dirección General Sign? ",canDirectorGeneralSign)
            let canDirectorsign = getCanDirectorSign(historico)
            // console.log("Can Directors Sign? ",canDirectorsign)
            let canThisDeptSign = await getCanThisDeptSign(historico,role,personaFirma)
            // console.log("Can This Department Sign? ",canThisDeptSign)

            // console.log(dept)
            
            errorMsg = await createErrorMsgApprove(role,canDirectorsign,canThisDeptSign,canDirectorGeneralSign)
            // console.log(errorMsg)
            // console.log("HISTORICO EN DB: ",historico)
            // console.log(nuevaAccion)
            if (errorMsg!==""){
                res.redirect('/displayPendingContracts?errorMsg='+errorMsg)
            }else{
                //Save Approve Action
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
                    case "Dirección General":
                        nuevaAccion={
                            accion:"Cerrado",
                            persona:personaFirma,
                            icono:"mail-unread-outline",
                            fecha: getCurrentDate(),
                            observaciones:approveInfo
                        }
                        historico.push(nuevaAccion)
                        await Contract.findByIdAndUpdate({"_id":id},{"historico":historico,"firmas.dirGeneral.person":personaFirma,"firmas.dirGeneral.value":true,"mainStatus":"Closed"})
                        break;
                }
                // await Contract.findByIdAndUpdate({_id:id},{historico:historico})

                let timeToScale = await mustScale(historico)
                // console.log("Time To Sacle: ",timeToScale)
                if(timeToScale===true){
                    nuevaAccion={
                        accion:"Escalado",
                        persona:personaFirma,
                        icono:"mail-unread-outline",
                        fecha: getCurrentDate(),
                        observaciones:""
                    }
                    historico.push(nuevaAccion)
                    await Contract.findByIdAndUpdate({"_id":id},{"historico":historico})

                    if (canDirectorsign){
                        await sendNoticeEmail("escaladoDG",contract)
                    } else {
                        await sendNoticeEmail("escaladoDirectores",contract)
                    }
                    
                    successMsg = "Contrato Aprobado y Escalado Correctamente"
                } else {
                    successMsg = "Contrato Aprobado Correctamente"
                }


                //Send Approve Email (if needed)
                // await sendEmail(emailParams)
                // console.log("!!!!!!!!!!ABOUT TO DISPLAY SUCCES MESSAGE!!!!!!!!!!!!!")
                // successMsg = "Contrato Aprobado Correctamente"
                res.redirect('/displayPendingContracts?successMsg='+successMsg)
            }
        }
    }catch(err){console.log("Error en Approve Contract ID Post:",err)}

})
router.get("/deleteContract/:id",async(req,res)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
            // console.log(req.params.id)
            const id=req.params.id
            // console.log("GET INSIDE ID: ", id)
            await Contract.deleteOne({_id:id})
            res.redirect("/displayPendingContracts")
        }
    }catch(err){console.log("Error en DeleteContract ID Get:",err)}
})
router.post("/rejectContract/:id",async(req,res)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
    
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
                icono:"thumbs-down-sharp",
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
                await sendNoticeEmail("reject",contract,rejectInfo)

                successMsg = "Contrato Rechazado Correctamente"
                res.redirect('/displayPendingContracts?successMsg='+successMsg)
            }

            // res.render("contracts",{errorMsg})
        }
        
    }catch(err){console.log("Error en Reject Contract ID Post:",err)}

})
router.get("/alertsContracts",async (req,res,next)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{

            let successMsg = req.query.successMsg;
            console.log("SUCCESS MESSAGE: ",successMsg)

            const notice = await Notice.find();
            notice.successMsg = successMsg
            // console.log(notice)


            res.render('alertsContracts',{notice})
        }
    }catch(err){console.log("Error en AlertsContracts Get:",err)}
});
router.post("/updateAlerts/:alertType",async(req,res)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
            const alertType=req.params.alertType;
            const {email,cc}=req.body
            // console.log(alertType,email,cc,subject,emailBody)
            const newAlert = await Notice.findOneAndUpdate({noticeType:alertType},{destinatario:email,cc:cc})
            // console.log(newAlert)
            const successMsg = "Configuración Guardada"
            res.redirect("/alertsContracts?successMsg="+successMsg)
        }
    }catch(err){console.log("Error en UpdatAlerts AlertType Post:",err)}
})
router.get("/editContracts/:id",async(req,res,next)=>{
    try{
        // console.log("entered the edit contract function")
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
                const id = req.params.id
            // console.log(id)
            const selectedContract = await Contract.findOne({_id:id})
            // console.log(selectedContract)
            const uploadedFiles = getFiles(selectedContract.uploadedFiles)
            const showeditButons = getshoweditButons(selectedContract.mainStatus)

            // console.log(uploadedFiles)
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
        }
    }catch(err){console.log("Error en EditContracts ID Get:",err)}

})
router.get("/deleteFiles/:pq/:fileName",async(req,res,next)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{

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
        }
    }catch(err){console.log("Error en DeleteFiles PQ Get:",err)}
})
router.get("/profile",async(req,res,next)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
                //Obtener info del Usuario actual (sesion iniciada)
            const sesionEmail = req.session.currentUser.email
            let currentUser = await User.find({email:sesionEmail})
            user = currentUser[0]
            // console.log(currentUser)
            res.render('profile', {user})
        }
    }catch(err){console.log("Error en Profile Get:",err)}
});
router.post("/profile/addRoles/:email",async(req,res,next)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{

            const{role,role1,role2,role3,role4} = req.body;
            const email = req.params.email
            let currentUser = await User.find({email:email})
            let roleArr = createRoleArray(role,role1,role2,role3,role4)
            let currentRoles = currentUser[0].role
            // console.log(roleArr)
            // console.log(currentRoles)
            let rolesToUpdate=currentRoles
            // console.log(rolesToUpdate)

            for (i=0;i<roleArr.length;i++){
                if (!currentRoles.includes(roleArr[i])){
                    rolesToUpdate.push(roleArr[i])
                }
            }
            // console.log(rolesToUpdate)

            await User.findOneAndUpdate({email:email},{role:rolesToUpdate})
            res.redirect("/profile")
        }
    }catch(err){console.log("Error en Profile Add Roles Post:",err)}
    
})
router.post("/editContracts/uploadFiles/:pq/",upload.any(),async(req,res)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
                if (req.files.length===0){
                errorMsg="No file selected.";
                // res.render("contracts.hbs",{noFileSelected});
                res.redirect("/displayPendingContracts?errorMsg="+errorMsg)
            }else {
                let pq = req.params.pq
                pqFolderName = editPQ(pq)
                pqPath = path.join(__dirname,"contracts",pq)
                const contract = await Contract.findOne({ pq: pq });
                // console.log(contract)
                pqId = contract._id
                newUploadedFiles = contract.uploadedFiles
                for (i=0;i<req.files.length;i++){
                    let uploadedFile=req.files[i]
                    let fileToSave = path.join(pqPath,uploadedFile.originalname)
                    await saveFile(uploadedFile.path,fileToSave)
                    newUploadedFiles.push(fileToSave)
                }
                await Contract.findOneAndUpdate({pq:pq},{uploadedFiles:newUploadedFiles})
                res.redirect("/editContracts/"+pqId)
            }
        }
    }catch(err){console.log("Error en Edit Contracts UploadFiles PQ Post:",err)}
})
router.get("/deleteRole/:role",async(req,res)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
            const email = req.session.currentUser.email
            const roleToDelete = req.params.role
            let currentUser = await User.find({email:email})
            let currentRoles = currentUser[0].role
            let newRoleList=[]
            for (i=0;i<currentRoles.length;i++){
                if(currentRoles[i]!==roleToDelete){
                    newRoleList.push(currentRoles[i])
                }
            }
            await User.findOneAndUpdate({email:email},{role:newRoleList})
            res.redirect("/profile")
        }
    }catch(err){console.log("Error en deleteRole Role Get:",err)}
})
router.get("/profile/changePassword",async(req,res,next)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
            console.log(req.query)
            let successMsg=req.query.successMsg
            let errorMsg = req.query.errorMsg
            console.log("Inside profile Change password")
            console.log("Success Message: ", successMsg)
            console.log("Error Message: ", errorMsg)

            if (successMsg !== undefined){
                res.render('resetPassword',{successMsg})
            } else if (errorMsg !== undefined){
                res.render('resetPassword',{errorMsg})
            } else{
                res.render('resetPassword')
            }
        }
        
    }catch(err){console.log("Error en /Profile/changePassword Get:",err)}
})
router.post("/profile/uploadNewPassword",async(req,res,next)=>{
    try{
        if (!req.session.currentUser || req.session.currentUser===undefined ){res.redirect("/")}else{
            const {currentPass,newPass,repeatedPass}=req.body
            const sesionEmail = req.session.currentUser.email
            let currentUser = await User.find({email:sesionEmail})
            console.log("Current Pass: ",currentPass,"  |  New Pass: ",newPass,"  | Repeated Pass:",repeatedPass)
            errorMsg = createChangePasswordErrorMsg(currentPass,newPass,repeatedPass)
            if (errorMsg.length===0){
                if (bcrypt.compareSync(currentPass, currentUser[0].password)) {          //Check if password match.
                    const bcryptSalt = 10;
                    const salt = bcrypt.genSaltSync(bcryptSalt);
                    const hashPass = bcrypt.hashSync(newPass, salt);
                    await User.findByIdAndUpdate({"_id":currentUser[0].id},{password:hashPass})
                    successMsg="Password Succesfully Changed."
                    res.redirect('/profile/changePassword?successMsg='+successMsg)
                }else{
                    errorMsg="Incorrect password."
                    res.redirect('/profile/changePassword?errorMsg='+errorMsg)

                }
            } else{
                formData={
                    errorMsg:errorMsg,
                    currentPass:currentPass,
                    newPass:newPass,
                    repeatedPass:repeatedPass
                }
                res.render('resetPassword',{formData})
            }
        }
    }catch(err){console.log("Error en /profile/uploadNewPAssword: ",err)}
})

router.get("/forgotPassword",async(req,res,next)=>{
    try{
        let template = {
            layout: false
        }
        res.render('login-register/forgotPass',template)
    } catch(err){
        console.log("Error en /forgotPassword Get: ", err)
    }
    
})
router.post("/forgotPassword",async(req,res,next)=>{
    try {

        let userEmail = req.body.email
        // console.log("User Email: ",userEmail)
        let token = await createToken()
        // console.log("Token: ",token)
        const user = await User.findOne({ email: userEmail });
        // console.log("User: ", user)

        if (!user){
            errorMsg="This email doesn't exist."                        //User doesn't exists.
            formData={errorMsg:errorMsg,email:userEmail,layout:false}
            res.render("login-register/forgotPass",formData);
        } else{
            var tokenExpireDate = new Date();
            tokenExpireDate.setHours(tokenExpireDate.getHours() + 1);

            // console.log(tokenExpireDate)
            await User.findOneAndUpdate({email:userEmail},{resetPasswordToken:token,resetPasswordExpires:tokenExpireDate})
            let tokenLink =  path.join("https://gestordecontratos-nqx8w.ondigitalocean.app", 'resetPassword', token)
            // console.log("Token Link: ",tokenLink)
            emailParams={
                host:process.env.EMAIL_HOST,
                port:process.env.EMAIL_PORT,
                secure:false,
                // service:"Hotmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                from:'"Contract Manager - Password Reset"<estevemartinmauri@hotmail.com>',
                to:userEmail,
                subject:"Contract Manager - Password Reset",
                html:getEmailBodyClickToChangePassword(tokenLink)
                // attachments:uploadedFiles
            }

            await sendEmail(emailParams)
            let template = {
                layout: false,
                successMsg:"Password recovery email has been sent."
            }
            res.render('login-register/forgotPass',template)
        }
    }catch(err){
        console.log("Error en /forgotPassword Post: ", err)
    }
})

router.get("/resetPassword/:token",async(req,res,next)=>{
    try{
        // res.render("forgotPassNewPass")
        let token = req.params.token
        // console.log("GET Token: ",token)
        let formData = {
            layout: false,
            thistoken:token
        }
        res.render('login-register/forgotPassNewPass',formData)
    } catch(err){
        console.log("Error en /resetPassword/:token Get: ", err)

    }
    

})
router.post("/resetPassword/:token",async(req,res,next)=>{
    // console.log("INSIDE RESETPASSWORD/:TOKEN")
    try{

        let newPass = req.body.newPassword
        let newPassRepeat = req.body.newPasswordRepeat
        let token = req.params.token
        // console.log("newPass:",newPass)
        // console.log("newPassRepeat:",newPassRepeat)
        // console.log("Token inside ResetPassword: ",token)
        let errorMsg = await createErrorMsgUploadNewPassword(newPass,newPassRepeat)
        // console.log(errorMsg)
        if (errorMsg.length>0){
            let formData = {
                layout: false,
                errorMsg:errorMsg,
                thistoken:token
            }
            res.render('login-register/forgotPassNewPass',formData)
        } else {
            // console.log("Errors: 0")
            const user = await User.findOne({ resetPasswordToken: token });
            // console.log(user)
            if (!user){
                console.log("User not found")
                let formData = {
                    layout: false,
                    thistoken:token,
                    errorMsg:"This link has already been used."
                }
                res.render('login-register/forgotPassNewPass',formData)
            } else{
                // console.log("User found")
                const currentTime = new Date();
                const tokenExpirationDate = user.resetPasswordExpires
                // console.log("Current Time:",currentTime )
                // console.log("Expiration Time: ",tokenExpirationDate)
                if(currentTime.getTime()>tokenExpirationDate.getTime()){
                    // console.log("Token already expired")
                    await User.findOneAndUpdate({resetPasswordToken:token},{resetPasswordToken:undefined,resetPasswordExpires:undefined})
                    let formData = {
                        layout: false,
                        thistoken:token,
                        errorMsg:"This link has expired."
                    }
                    res.render('login-register/forgotPassNewPass',formData)
                }
                // console.log("Token still valid")

                const bcryptSalt = 10;
                const salt = bcrypt.genSaltSync(bcryptSalt);
                const hashPass = bcrypt.hashSync(newPass, salt);
                await User.findOneAndUpdate({resetPasswordToken:token},{resetPasswordToken:undefined,resetPasswordExpires:undefined,password:hashPass})
                const webLink = "https://gestordecontratos-nqx8w.ondigitalocean.app/"
                // console.log("User Password Updated")
                emailParams={
                    host:process.env.EMAIL_HOST,
                    port:process.env.EMAIL_PORT,
                    secure:false,
                    // service:"Hotmail",
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    from:'"Contract Manager - Password Reset"<estevemartinmauri@hotmail.com>',
                    to:user.email,
                    subject:"Contract Manager - Password has been reseted",
                    html:getEmailBodyPasswordHasBeenReset(webLink)
                    // attachments:uploadedFiles
                }
                await sendEmail(emailParams)
                console.log("Confirmation Password Reset - Email Sent")
                let formData = {
                    layout: false,
                    thistoken:token,
                    succesMsg:"Password Successfully Changed."
                }
                res.render("login-register/login",formData)
            }
        }
    } catch(err){
        console.log("Error en /resetPassword/:token Post: ", err)
    }
})

router.get("/activateAccount/:token",async(req,res,next)=>{
    try{
        let token = req.params.token
        const user = await User.findOne({ accountActivationToken: token });
        if(!user){
            res.render("login-register/accountActivated",{layout: false,errorMsg:"This email doesn't exists."})
        } else{
            await User.findOneAndUpdate({accountActivationToken:token},{accountStatus:true})
            res.render("login-register/accountActivated",{layout: false,successMsg:"Account Successfully Activated."})
        }
    }catch(err){
        console.log("Error en /activateAccount/:token Get: ", err)
    }
})



function getEmailBodyEscaladoDG(pq,client,comercial,work,amount,finalUser,wonDate,receptionDate,appCreationDate,nPedido){
    const emailBody=`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract</title>
        <style>
            
            *{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            html,body, input, button{
                font-family: calibri, sans-serif;
            }
            body{
                height: 100%;
                padding:20px;
                color:#303030;
            }
            .container{
                /* background-color: aqua; */
            }
            h1{
                text-align: center;
                margin:20px 0px 0px 0px;
                color:#00A2D1;
                font-weight: 700;
            }
            h2{
                text-align: center;
                color:#00A2D1;
                font-weight: 200;
                margin:0px;
            }
            h3{
                color:#303030;
                margin: 20px 0px;
            }
            h4{
                font-size: 18pt;
                padding-left:2%;
            }
            p{
                padding-bottom:20px;
                margin-left:0px;
            }
            a{
                
                /* margin-left:20px; */
                /* margin:40px; */
                /* margin:40px 0px; */
            }
             .link{
                /* padding:15px; */
                color: #00A2D1;
                /* border-radius: 5px; */
                text-decoration: none;
                /* margin:50px; */
                border:none;
                outline: none;
    
            } 
            .link-container{
                padding:15px;
                background-color: #00A2D1;
                border-radius: 5px; 
                width: 140px;
                text-align: center;
            }
            .row-after-link{
                margin-top:20px;
                /* padding:0px; */
            }
            .row-before-link{
                margin-bottom: 5px;
                            padding:0px;
    
            }
            .name{
                font-weight: 500;
                font-size: 16pt;
                margin-bottom:0px;
                padding:0px;
                font-family: arial;
            }
            .small{
                font-size: 10pt;
                margin:0px;
                padding: 0px;
                /* height: 12px; */
                /* margin-bottom:45px; */
                line-height: 16px;
            }
            img{
                margin-top:15px;
            }
            a{
                text-decoration: none;
            }
            table,tr{
                /* border:solid black 1px;
                border-collapse: collapse; */
                padding:10px;
                margin-top:-20px;
            }
            td{
                padding:10px 40px 10px 0px;
            }
            @media (max-width:400px){
                td{
                    padding:10px 20px 10px 0px;
                }
            }
            
        </style>
    </head>
    <body>
        
            <div class="container">
                <h1>ASSA ABLOY</h1>
                <h2>Contract Manager</h2>
                <h3>Contract Signature Required (Order Number: `+nPedido+`)</h3>
                <p>The following contract needs to be accepted or rejected in the <b>Contract Manager</b> Platform.</p>
                <table>
                    <tr>
                        <td><b>PQ: </b>`+pq+`</td>
                        <td><b>Work: </b>`+work+`</td>
                        <td><b>WON Date: </b>`+wonDate+`</td>
                    </tr>
                    <tr>
                        <td><b>Client: </b>`+client+`</td>
                        <td><b>Amount: </b>`+amount+`</td>
                        <td><b>Reception Date: </b>`+receptionDate+`</td>
                    </tr>
                    <tr>
                        <td><b>Commercial: </b>`+comercial+`</td>
                        <td><b>Final User: </b>`+finalUser+`</td>
                        <td><b>App Creation Date: </b>`+appCreationDate+`</td>
                    </tr>
                </table>
                <p>Please, find all the documents related to this contract attached to this email.</p>
                <p class="row-before-link"> Click on the following link to accept or reject the contract:</p>
                <h4><a class="link" href="https://gestordecontratos-nqx8w.ondigitalocean.app/">Manage Contract</a></h4>
                <p class="row-after-link">Thank you.</p>
                <p>Best regards,</p>
                <p class="name">Esteve Martín</p>
                <p class="small"><i><u>CEO & Founder at MPA Solutions</u><br>
                    Phone: +34 60 60 148<br>
                    Email: <a href="mailto:esteve.martin@mpasolutions.es">esteve.martin@mpasolutions.es</a><br>
                    <a href="http://www.mpasolutions.es">www.mpasolutions.es</a></i></p>
    
                <img src="http://www.mpasolutions.es/logo_high_resolution.png" height="47"/>
            </div>
          
    </body>
    </html>`

    return emailBody
}
function getEmailBodyEscaladoDirectores(pq,client,comercial,work,amount,finalUser,wonDate,receptionDate,appCreationDate,nPedido){
    const emailBody=`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract</title>
        <style>
            
            *{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            html,body, input, button{
                font-family: calibri, sans-serif;
            }
            body{
                height: 100%;
                padding:20px;
                color:#303030;
            }
            .container{
                /* background-color: aqua; */
            }
            h1{
                text-align: center;
                margin:20px 0px 0px 0px;
                color:#00A2D1;
                font-weight: 700;
            }
            h2{
                text-align: center;
                color:#00A2D1;
                font-weight: 200;
                margin:0px;
            }
            h3{
                color:#303030;
                margin: 20px 0px;
            }
            h4{
                font-size: 18pt;
                padding-left:2%;
            }
            p{
                padding-bottom:20px;
                margin-left:0px;
            }
            a{
                
                /* margin-left:20px; */
                /* margin:40px; */
                /* margin:40px 0px; */
            }
             .link{
                /* padding:15px; */
                color: #00A2D1;
                /* border-radius: 5px; */
                text-decoration: none;
                /* margin:50px; */
                border:none;
                outline: none;
    
            } 
            .link-container{
                padding:15px;
                background-color: #00A2D1;
                border-radius: 5px; 
                width: 140px;
                text-align: center;
            }
            .row-after-link{
                margin-top:20px;
                /* padding:0px; */
            }
            .row-before-link{
                margin-bottom: 5px;
                            padding:0px;
    
            }
            .name{
                font-weight: 500;
                font-size: 16pt;
                margin-bottom:0px;
                padding:0px;
                font-family: arial;
            }
            .small{
                font-size: 10pt;
                margin:0px;
                padding: 0px;
                /* height: 12px; */
                /* margin-bottom:45px; */
                line-height: 16px;
            }
            img{
                margin-top:15px;
            }
            a{
                text-decoration: none;
            }
            table,tr{
                /* border:solid black 1px;
                border-collapse: collapse; */
                padding:10px;
                margin-top:-20px;
            }
            td{
                padding:10px 40px 10px 0px;
            }
            @media (max-width:400px){
                td{
                    padding:10px 20px 10px 0px;
                }
            }
            
        </style>
    </head>
    <body>
        
            <div class="container">
                <h1>ASSA ABLOY</h1>
                <h2>Contract Manager</h2>
                <h3>Contract Signature Required (Order Number: `+nPedido+`)</h3>
                <p>The following contract needs to be accepted or rejected in the <b>Contract Manager</b> Platform.</p>
                <table>
                    <tr>
                        <td><b>PQ: </b>`+pq+`</td>
                        <td><b>Work: </b>`+work+`</td>
                        <td><b>WON Date: </b>`+wonDate+`</td>
                    </tr>
                    <tr>
                        <td><b>Client: </b>`+client+`</td>
                        <td><b>Amount: </b>`+amount+`</td>
                        <td><b>Reception Date: </b>`+receptionDate+`</td>
                    </tr>
                    <tr>
                        <td><b>Commercial: </b>`+comercial+`</td>
                        <td><b>Final User: </b>`+finalUser+`</td>
                        <td><b>App Creation Date: </b>`+appCreationDate+`</td>
                    </tr>
                </table>
                <p>Please, find all the documents related to this contract attached to this email.</p>
                <p class="row-before-link"> Click on the following link to accept or reject the contract:</p>
                <h4><a class="link" href="https://gestordecontratos-nqx8w.ondigitalocean.app/">Manage Contract</a></h4>
                <p class="row-after-link">Thank you.</p>
                <p>Best regards,</p>
                <p class="name">Esteve Martín</p>
                <p class="small"><i><u>CEO & Founder at MPA Solutions</u><br>
                    Phone: +34 60 60 148<br>
                    Email: <a href="mailto:esteve.martin@mpasolutions.es">esteve.martin@mpasolutions.es</a><br>
                    <a href="http://www.mpasolutions.es">www.mpasolutions.es</a></i></p>
    
                <img src="http://www.mpasolutions.es/logo_high_resolution.png" height="47"/>
            </div>
          
    </body>
    </html>`

    return emailBody
}
function getEmailBodyContractRejected(pq,client,comercial,work,amount,finalUser,wonDate,receptionDate,appCreationDate,nPedido,info){
    const emailBody=`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract Rejected</title>
        <style>
            
            *{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            html,body, input, button{
                font-family: calibri, sans-serif;
            }
            body{
                height: 100%;
                padding:20px;
                color:#303030;
            }
            .container{
                /* background-color: aqua; */
            }
            h1{
                text-align: center;
                margin:20px 0px 0px 0px;
                color:#00A2D1;
                font-weight: 700;
            }
            h2{
                text-align: center;
                color:#00A2D1;
                font-weight: 200;
                margin:0px;
            }
            h3{
                color:#303030;
                margin: 20px 0px;
            }
            h4{
                font-size: 18pt;
                padding-left:2%;
            }
            p{
                padding-bottom:20px;
                margin-left:0px;
            }
            a{
                
                /* margin-left:20px; */
                /* margin:40px; */
                /* margin:40px 0px; */
            }
             .link{
                /* padding:15px; */
                color: #00A2D1;
                /* border-radius: 5px; */
                text-decoration: none;
                /* margin:50px; */
                border:none;
                outline: none;
    
            } 
            .link-container{
                padding:15px;
                background-color: #00A2D1;
                border-radius: 5px; 
                width: 140px;
                text-align: center;
            }
            .row-after-link{
                margin-top:20px;
                /* padding:0px; */
            }
            .row-before-link{
                margin-bottom: 5px;
                            padding:0px;
    
            }
            .name{
                font-weight: 500;
                font-size: 16pt;
                margin-bottom:0px;
                padding:0px;
                font-family: arial;
            }
            .small{
                font-size: 10pt;
                margin:0px;
                padding: 0px;
                /* height: 12px; */
                /* margin-bottom:45px; */
                line-height: 16px;
            }
            img{
                margin-top:15px;
            }
            a{
                text-decoration: none;
            }
            table,tr{
                /* border:solid black 1px;
                border-collapse: collapse; */
                padding:10px;
                margin-top:-20px;
            }
            td{
                padding:10px 40px 10px 0px;
            }
            @media (max-width:400px){
                td{
                    padding:10px 20px 10px 0px;
                }
            }
            
        </style>
    </head>
    <body>
        
            <div class="container">
                <h1>ASSA ABLOY</h1>
                <h2>Contract Manager</h2>
                <h3 style="color:crimson;">Contract Rejected (Order Number: `+nPedido+`)</h3>
                <p>The following contract <span  style="color:crimson;">has been rejected</span> in the <b>Contract Manager</b> Platform.</p>
                <table>
                    <tr>
                        <td><b>PQ: </b>`+pq+`</td>
                        <td><b>Work: </b>`+work+`</td>
                        <td><b>WON Date: </b>`+wonDate+`</td>
                    </tr>
                    <tr>
                        <td><b>Client: </b>`+client+`</td>
                        <td><b>Amount: </b>`+amount+`</td>
                        <td><b>Reception Date: </b>`+receptionDate+`</td>
                    </tr>
                    <tr>
                        <td><b>Commercial: </b>`+comercial+`</td>
                        <td><b>Final User: </b>`+finalUser+`</td>
                        <td><b>App Creation Date: </b>`+appCreationDate+`</td>
                    </tr>
                </table>
                <p><u>Rejection aditional information:</u> `+info+`</p>
                <p>Please, find all the documents related to this contract attached to this email.</p>
                <p class="row-before-link"> Click on the following link to modify and update the contract:</p>
                <h4><a class="link" href="https://gestordecontratos-nqx8w.ondigitalocean.app/">Manage Contract</a></h4>
                <p class="row-after-link">Thank you.</p>
                <p>Best regards,</p>
                <p class="name">Esteve Martín</p>
                <p class="small"><i><u>CEO & Founder at MPA Solutions</u><br>
                    Phone: +34 60 60 148<br>
                    Email: <a href="mailto:esteve.martin@mpasolutions.es">esteve.martin@mpasolutions.es</a><br>
                    <a href="http://www.mpasolutions.es">www.mpasolutions.es</a></i></p>
    
                <img src="http://www.mpasolutions.es/logo_high_resolution.png" height="47"/>
            </div>
          
    </body>
    </html>`

    return emailBody
}
function getEmailBodyNewContractCreated(pq,client,comercial,work,amount,finalUser,wonDate,receptionDate,appCreationDate,nPedido){
    const emailBody=`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
        <style>
            
            *{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            html,body, input, button{
                font-family: calibri, sans-serif;
            }
            body{
                height: 100%;
                padding:20px;
                color:#303030;
            }
            .container{
                /* background-color: aqua; */
            }
            h1{
                text-align: center;
                margin:20px 0px 0px 0px;
                color:#00A2D1;
                font-weight: 700;
            }
            h2{
                text-align: center;
                color:#00A2D1;
                font-weight: 200;
                margin:0px;
            }
            h3{
                color:#303030;
                margin: 20px 0px;
            }
            h4{
                font-size: 18pt;
                padding-left:2%;
            }
            p{
                padding-bottom:20px;
                margin-left:0px;
            }
            a{
                
                /* margin-left:20px; */
                /* margin:40px; */
                /* margin:40px 0px; */
            }
             .link{
                /* padding:15px; */
                color: #00A2D1;
                /* border-radius: 5px; */
                text-decoration: none;
                /* margin:50px; */
                border:none;
                outline: none;
    
            } 
            .link-container{
                padding:15px;
                background-color: #00A2D1;
                border-radius: 5px; 
                width: 140px;
                text-align: center;
            }
            .row-after-link{
                margin-top:20px;
                /* padding:0px; */
            }
            .row-before-link{
                margin-bottom: 5px;
                            padding:0px;
    
            }
            .name{
                font-weight: 500;
                font-size: 16pt;
                margin-bottom:0px;
                padding:0px;
                font-family: arial;
            }
            .small{
                font-size: 10pt;
                margin:0px;
                padding: 0px;
                /* height: 12px; */
                /* margin-bottom:45px; */
                line-height: 16px;
            }
            img{
                margin-top:15px;
            }
            a{
                text-decoration: none;
            }
            table,tr{
                /* border:solid black 1px;
                border-collapse: collapse; */
                padding:10px;
                margin-top:-20px;
            }
            td{
                padding:10px 40px 10px 0px;
            }
            @media (max-width:400px){
                td{
                    padding:10px 20px 10px 0px;
                }
            }
            
        </style>
    </head>
    <body>
        
            <div class="container">
                <h1>ASSA ABLOY</h1>
                <h2>Contract Manager</h2>
                <h3>New Contract Created (Order Number: `+nPedido+`)</h3>
                <p>The following contract has been created in the <b>Contract Manager</b> Platform.</p>
                <table>
                    <tr>
                        <td><b>PQ: </b>`+pq+`</td>
                        <td><b>Work: </b>`+work+`</td>
                        <td><b>WON Date: </b>`+wonDate+`</td>
                    </tr>
                    <tr>
                        <td><b>Client: </b>`+client+`</td>
                        <td><b>Amount: </b>`+amount+`</td>
                        <td><b>Reception Date: </b>`+receptionDate+`</td>
                    </tr>
                    <tr>
                        <td><b>Commercial: </b>`+comercial+`</td>
                        <td><b>Final User: </b>`+finalUser+`</td>
                        <td><b>App Creation Date: </b`+appCreationDate+`</td>
                    </tr>
                </table>
                <p>Please, find all the documents related to this contract attached to this email.</p>
                <p class="row-before-link"> Click on the following link to accept or reject the contract:</p>
                <h4><a class="link" href="https://gestordecontratos-nqx8w.ondigitalocean.app/">Manage Contract</a></h4>
                <p class="row-after-link">Thank you.</p>
                <p>Best regards,</p>
                <p class="name">Esteve Martín</p>
                <p class="small"><i><u>CEO & Founder at MPA Solutions</u><br>
                    Phone: +34 60 60 148<br>
                    Email: <a href="mailto:esteve.martin@mpasolutions.es">esteve.martin@mpasolutions.es</a><br>
                    <a href="http://www.mpasolutions.es">www.mpasolutions.es</a></i></p>
    
                <img src="http://www.mpasolutions.es/logo_high_resolution.png" height="47"/>
            </div>
          
    </body>
    </html>`

    return emailBody
}
function getEmailBodyClickToActivateAccount(tokenLink){
    const emailBody=`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Activation</title>
        <style>
            
            *{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            html,body, input, button{
                font-family: calibri, sans-serif;
            }
            body{
                height: 100%;
                padding:20px;
                color:#303030;
            }
            .container{
                /* background-color: aqua; */
            }
            h1{
                text-align: center;
                margin:20px 0px 0px 0px;
                color:#00A2D1;
                font-weight: 700;
            }
            h2{
                text-align: center;
                color:#00A2D1;
                font-weight: 200;
                margin:0px;
            }
            h3{
                color:#303030;
                margin: 20px 0px;
            }
            h4{
                font-size: 18pt;
                padding-left:2%;
            }
            p{
                padding-bottom:20px;
                margin-left:0px;
            }
            a{
                
                /* margin-left:20px; */
                /* margin:40px; */
                /* margin:40px 0px; */
            }
            .link{
                /* padding:15px; */
                color: #00A2D1;
                /* border-radius: 5px; */
                text-decoration: none;
                /* margin:50px; */
                border:none;
                outline: none;
    
            } 
            .link-container{
                padding:15px;
                background-color: #00A2D1;
                border-radius: 5px; 
                width: 140px;
                text-align: center;
            }
            .row-after-link{
                margin-top:20px;
                /* padding:0px; */
            }
            .row-before-link{
                margin-bottom: 5px;
                            padding:0px;
    
            }
            .name{
                font-weight: 500;
                font-size: 16pt;
                margin-bottom:0px;
                padding:0px;
                font-family: arial;
            }
            .small{
                font-size: 10pt;
                margin:0px;
                padding: 0px;
                /* height: 12px; */
                /* margin-bottom:45px; */
                line-height: 16px;
            }
            img{
                margin-top:15px;
            }
            a{
                text-decoration: none;
            }
            
        </style>
    </head>
    <body>
        
            <div class="container">
                <h1>ASSA ABLOY</h1>
                <h2>Contract Manager</h2>
                <h3>Account Activation</h3>
                <p>This is a confirmation that your account has been created in the <b>Contract Manager</b> Platform.</p>
                <p class="row-before-link"> Please click on the following link to activate your account:</p>
                <h4><a class="link" href="`+tokenLink+`">Activate Account</a></h4>
                <p class="row-after-link">Thank you.</p>
                <p>Best regards,</p>
                <p class="name">Esteve Martín</p>
                <p class="small"><i><u>CEO & Founder at MPA Solutions</u><br>
                    Phone: +34 60 60 148<br>
                    Email: <a href="mailto:esteve.martin@mpasolutions.es">esteve.martin@mpasolutions.es</a><br>
                    <a href="http://www.mpasolutions.es">www.mpasolutions.es</a></i></p>
    
                <img src="http://www.mpasolutions.es/logo_high_resolution.png" height="47"/>
            </div>
        
    </body>
    </html>`

    return emailBody
}
function getEmailBodyPasswordHasBeenReset(webLink){
    const emailBody = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password has been reseted</title>
        <style>
            
            *{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            html,body, input, button{
                font-family: calibri, sans-serif;
            }
            body{
                height: 100%;
                padding:20px;
                color:#303030;
            }
            .container{
                /* background-color: aqua; */
            }
            h1{
                text-align: center;
                margin:20px 0px 0px 0px;
                color:#00A2D1;
                font-weight: 700;
            }
            h2{
                text-align: center;
                color:#00A2D1;
                font-weight: 200;
                margin:0px;
            }
            h3{
                color:#303030;
                margin: 20px 0px;
            }
            h4{
                font-size: 18pt;
                padding-left:2%;
            }
            p{
                padding-bottom:20px;
                margin-left:0px;
            }
            a{
                
                /* margin-left:20px; */
                /* margin:40px; */
                /* margin:40px 0px; */
            }
            .link{
                /* padding:15px; */
                color: #00A2D1;
                /* border-radius: 5px; */
                text-decoration: none;
                /* margin:50px; */
                border:none;
                outline: none;
    
            } 
            .link-container{
                padding:15px;
                background-color: #00A2D1;
                border-radius: 5px; 
                width: 140px;
                text-align: center;
            }
            .row-after-link{
                margin-top:20px;
                /* padding:0px; */
            }
            .row-before-link{
                margin-bottom: 5px;
                            padding:0px;
    
            }
            .name{
                font-weight: 500;
                font-size: 16pt;
                margin-bottom:0px;
                padding:0px;
                font-family: arial;
            }
            .small{
                font-size: 10pt;
                margin:0px;
                padding: 0px;
                /* height: 12px; */
                /* margin-bottom:45px; */
                line-height: 16px;
            }
            img{
                margin-top:15px;
            }
            a{
                text-decoration: none;
            }
            
        </style>
    </head>
    <body>
        
            <div class="container">
                <h1>ASSA ABLOY</h1>
                <h2>Contract Manager</h2>
                <h3>Password Successfully Reseted</h3>
                <p>This is a confirmation that your password has been changed in the <b>Contract Manager</b> Platform.</p>
                <p class="row-before-link"> Please click on the following link to go to the platform.</p>
                <h4><a class="link" href="`+webLink+`">Go to Contract Manager</a></h4>
                <p class="row-after-link">Thank you.</p>
                <p>Best regards,</p>
                <p class="name">Esteve Martín</p>
                <p class="small"><i><u>CEO & Founder at MPA Solutions</u><br>
                    Phone: +34 60 60 148<br>
                    Email: <a href="mailto:esteve.martin@mpasolutions.es">esteve.martin@mpasolutions.es</a><br>
                    <a href="http://www.mpasolutions.es">www.mpasolutions.es</a></i></p>
    
                <img src="http://www.mpasolutions.es/logo_high_resolution.png" height="47"/>
            </div>
        
    </body>
    </html>`
    return emailBody
}
function getEmailBodyClickToChangePassword(tokenLink){
    const emailBody=`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
        <style>
            
            *{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            html,body, input, button{
                font-family: calibri, sans-serif;
            }
            body{
                height: 100%;
                padding:20px;
                color:#303030;
            }
            .container{
                /* background-color: aqua; */
            }
            h1{
                text-align: center;
                margin:20px 0px 0px 0px;
                color:#00A2D1;
                font-weight: 700;
            }
            h2{
                text-align: center;
                color:#00A2D1;
                font-weight: 200;
                margin:0px;
            }
            h3{
                color:#303030;
                margin: 20px 0px;
            }
            h4{
                font-size: 18pt;
                padding-left:2%;
            }
            p{
                padding-bottom:20px;
                margin-left:0px;
            }
            a{
                
                /* margin-left:20px; */
                /* margin:40px; */
                /* margin:40px 0px; */
            }
            .link{
                /* padding:15px; */
                color: #00A2D1;
                /* border-radius: 5px; */
                text-decoration: none;
                /* margin:50px; */
                border:none;
                outline: none;
    
            } 
            .link-container{
                padding:15px;
                background-color: #00A2D1;
                border-radius: 5px; 
                width: 140px;
                text-align: center;
            }
            .row-after-link{
                margin-top:20px;
                /* padding:0px; */
            }
            .row-before-link{
                margin-bottom: 5px;
                            padding:0px;
    
            }
            .name{
                font-weight: 500;
                font-size: 16pt;
                margin-bottom:0px;
                padding:0px;
                font-family: arial;
            }
            .small{
                font-size: 10pt;
                margin:0px;
                padding: 0px;
                /* height: 12px; */
                /* margin-bottom:45px; */
                line-height: 16px;
            }
            img{
                margin-top:15px;
            }
            a{
                text-decoration: none;
            }
            
        </style>
    </head>
    <body>
        
            <div class="container">
                <h1>ASSA ABLOY</h1>
                <h2>Contract Manager</h2>
                <h3>Password Resset</h3>
                <p>You are receiving this because you (or someone else) have requested to reset the password for your account in the <b>Contract Manager</b> Platform.</p>
                <p class="row-before-link"> Please click on the following link to complete the process:</p>
                <h4><a class="link" href="`+tokenLink+`">Reset Password</a></h4>
                <p class="row-after-link">If you did not request this, please ignore this email and your password will remain unchanged.</p>
                <p>Best regards,</p>
                <p class="name">Esteve Martín</p>
                <p class="small"><i><u>CEO & Founder at MPA Solutions</u><br>
                    Phone: +34 60 60 148<br>
                    Email: <a href="mailto:esteve.martin@mpasolutions.es">esteve.martin@mpasolutions.es</a><br>
                    <a href="http://www.mpasolutions.es">www.mpasolutions.es</a></i></p>
    
                <img src="http://www.mpasolutions.es/logo_high_resolution.png" height="47"/>
            </div>
        
    </body>
    </html>`

    return emailBody
}
async function createErrorMsgUploadNewPassword(newPass, newPassRepeated){
    let resultErrorMsg=[]
    
    //INSERT ERRORS  (Validates that the fields are not empty).
    let insertErrorMsg = []
    let insertErrorMsgOutPut=''
    if (newPass=== ""){insertErrorMsg.push('new password')}

    // console.log(insertErrorMsg)
    switch (insertErrorMsg.length){
        case 1:
            insertErrorMsgOutPut = "You forgot to fill the " + insertErrorMsg[0] + "."
            break;
    }
    if (insertErrorMsgOutPut!==''){
        resultErrorMsg.push(insertErrorMsgOutPut)
    }

    //REPEAT ERRORS (Validates that you repeated the password).
    let repeatErrorMsgOutPut=''
    let repeatErrorMsg=[]
    if (newPassRepeated=== "" && !insertErrorMsgOutPut.includes('new password')){repeatErrorMsg.push('new password')}
    switch (repeatErrorMsg.length){
        case 1:
            repeatErrorMsgOutPut = "You forgot to repeat the " + repeatErrorMsg[0] + "."
            break;
    }
    if (repeatErrorMsgOutPut!==''){
        resultErrorMsg.push(repeatErrorMsgOutPut)
    }

    //MATCH ERRORS (Validdates email and passwords match).
    let matchErrorMsgOutPut=''
    let matchErrorMsg=[]
    if (newPass!==newPassRepeated && !repeatErrorMsgOutPut.includes('new password') && !insertErrorMsgOutPut.includes('new password')){matchErrorMsg.push('new passwords')}
    switch (matchErrorMsg.length){
        case 1:
            matchErrorMsgOutPut = "The " + matchErrorMsg[0] + " doesn't match."
            break;
    }
    if (matchErrorMsgOutPut!==''){
        resultErrorMsg.push(matchErrorMsgOutPut)
    }
    if (newPass.length<6  && !repeatErrorMsgOutPut.includes('password') && !insertErrorMsgOutPut.includes('password') && resultErrorMsg.length===0){resultErrorMsg.push("The password must have at least 6 characters.")}
    return resultErrorMsg

}
async function createToken(){
    let token = crypto.randomBytes(20)
    let result = token.toString('hex')
    return result
}
async function sendNoticeEmail(noticetype,contract,info=''){
    // console.log(contract[0])
    const {pq,comercial,cliente,obra,usuarioFinal,nPedido,importe,fechaStatusWon,fechaRecepcion,fechaCreaccionApp} = contract[0]
    // console.log(pq)
    switch(noticetype){
        case "newContract":
            htmlEmailBody = getEmailBodyNewContractCreated(pq,cliente,comercial,obra,importe,usuarioFinal,fechaStatusWon,fechaRecepcion,fechaCreaccionApp,nPedido)
            emailSubject = "New Contract Created"
            break;
        case "reject":
            htmlEmailBody = getEmailBodyContractRejected(pq,cliente,comercial,obra,importe,usuarioFinal,fechaStatusWon,fechaRecepcion,fechaCreaccionApp,nPedido,info)
            emailSubject = "Contract Rejected"
            break;
        case "escaladoDirectores":
            htmlEmailBody = getEmailBodyEscaladoDirectores(pq,cliente,comercial,obra,importe,usuarioFinal,fechaStatusWon,fechaRecepcion,fechaCreaccionApp,nPedido)
            emailSubject = "Contract Signature Required"
            break;
        case "escaladoDG":
            htmlEmailBody = getEmailBodyEscaladoDG(pq,cliente,comercial,obra,importe,usuarioFinal,fechaStatusWon,fechaRecepcion,fechaCreaccionApp,nPedido)
            emailSubject = "Contract Signature Required"
            break;
    }
    const noticeTemplate = await Notice.find({noticeType:noticetype})
    // console.log(noticeTemplate)
    emailParams={
        host:process.env.EMAIL_HOST,
        port:process.env.EMAIL_PORT,
        secure:false,
        // service:"Hotmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        from:'"Contract Manager Alerts System"<estevemartinmauri@hotmail.com>',
        to:noticeTemplate[0].destinatario,
        cc:noticeTemplate[0].cc,
        subject:emailSubject,
        html: htmlEmailBody,
        // attachments:uploadedFiles
    }
    
    // console.log(contractList)
    // //Send Email
    await sendEmail(emailParams)
}
function createChangePasswordErrorMsg(currentPass,newPass,repeatedPass){
    // let insertErrorMsg = "You forgot to write the "
    // if (currentPass === "" && newPass === "" && repeatedPass === ""){
    //     insertErrorMsg = "You forgot to write the current password, the new password and to repeat the new password."
    // } else if(currentPass === "" && newPass === "" && repeatedPass === ""){
    //     insertErrorMsg = "You forgot to write the current password, the new password and to repeat the new password."
    // }
    let resultErrorMsg=[]
    
    //INSERT ERRORS  (Validates that the fields are not empty).
    let insertErrorMsg = []
    let insertErrorMsgOutPut=''
    if (currentPass=== ""){insertErrorMsg.push('current password')}
    if (newPass=== ""){insertErrorMsg.push('new passowrd')}

    // console.log(insertErrorMsg)
    switch (insertErrorMsg.length){
        case 1:
            insertErrorMsgOutPut = "You forgot to fill the " + insertErrorMsg[0] + "."
            break;
        case 2:
            insertErrorMsgOutPut = "You forgot to fill the " + insertErrorMsg[0] + " and the " + insertErrorMsg[1] + "."
            break;
    }
    if (insertErrorMsgOutPut!==''){
        resultErrorMsg.push(insertErrorMsgOutPut)
    }

    //REPEAT ERRORS (Validates that you repeated email and password).
    let repeatErrorMsgOutPut=''
    let repeatErrorMsg=[]
    if (repeatedPass=== "" && !insertErrorMsgOutPut.includes('new password')){repeatErrorMsg.push('new password')}
    switch (repeatErrorMsg.length){
        case 1:
            repeatErrorMsgOutPut = "You forgot to repeat the " + repeatErrorMsg[0] + "."
            break;
    }
    if (repeatErrorMsgOutPut!==''){
        resultErrorMsg.push(repeatErrorMsgOutPut)
    }

    //MATCH ERRORS (Validdates email and passwords match).
    let matchErrorMsgOutPut=''
    let matchErrorMsg=[]
    if (newPass!==repeatedPass && !repeatErrorMsgOutPut.includes('new password') && !insertErrorMsgOutPut.includes('new password')){matchErrorMsg.push('new passwords')}
    switch (matchErrorMsg.length){
        case 1:
            matchErrorMsgOutPut = "The " + matchErrorMsg[0] + " doesn't match."
            break;
    }
    if (matchErrorMsgOutPut!==''){
        resultErrorMsg.push(matchErrorMsgOutPut)
    }
    if (newPass.length<6  && !repeatErrorMsgOutPut.includes('password') && !insertErrorMsgOutPut.includes('password')){resultErrorMsg.push("The password must have at least 6 characters.")}
    return resultErrorMsg
}
function getCanDirectorGeneralsign(historico){
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
    let numEscalados = countEscalados(historicoRelevante)
    console.log(numEscalados)
    if (numEscalados===2){return true}else{return false}
}
async function mustScale(historico){
    // console.log(historico)

    //Get the historico after the last reject
    let relevantHistorico = getRelevantHistorico(historico)
    // console.log("Historico Relevante (Posterior a Último Rechazo):",relevantHistorico)

    //Count Nº de Escalados in Historico
    let numEscalados = countEscalados(relevantHistorico)
    // console.log("Número de Escalados:",numEscalados)

    //Get historico after the last escalado.
    if (numEscalados!==0){
        var historicoLastEscalado = getLastEscaladoHistorico(relevantHistorico)
    } else {
        var historicoLastEscalado = relevantHistorico
    }
    // console.log("Historico Last Escalado: --> ",historicoLastEscalado)

    //Cout num of approves
    let numApprove = countApprove(historicoLastEscalado)
    // console.log("Número de Aprobados: ",numApprove)

    if(numApprove !==4){return false}

    let histApprove = historicoLastEscalado.filter(hist=>{return hist.accion==="Aprobado"})
    // console.log("Historico de Aprobados: ",histApprove)

    let allDeptsApproved = await getAllDeptsApproved(histApprove)
    // console.log("Todos los departamentos han aprobado? ",allDeptsApproved)
    if (allDeptsApproved ===true) {result = true}else{result=false}
    // console.log("Resultado: ",result)
    return result
}
async function getAllDeptsApproved(hist){
    let comercial = false
    let operaciones = false
    let riesgos=false
    let prl = false
    // console.log(hist)
    // console.log("!!!!EMPIEZA EL LOOP!!!!")
    for(i=0;i<hist.length;i++){
        // console.log(hist[i].persona)
        if (hist[i].persona.includes("Riesgos")){riesgos=true}
        if (hist[i].persona.includes("Oper")){operaciones=true}
        if (hist[i].persona.includes("Comerc")){comercial=true}
        if (hist[i].persona.includes("PRL")){prl=true}
    }
    // console.log(comercial,operaciones,riesgos,prl)
    if(comercial===true&&operaciones===true&&riesgos===true&&prl===true){result=true}else{result=false}
    // console.log(result)
    return result
}
function countApprove(hist){
    let result = 0
    for (i=0;i<hist.length;i++){
        if(hist[i].accion === "Aprobado"){result++}
    }
    return result
}
async function getCanThisDeptSign(historico,fullRole,personaFirma){
    // console.log(historico)
    // console.log(fullRole)
    // let dept = fullRole.split(" - ")[0]
    // console.log(dept)
    // let role = fullRole.split(" - ")[1]
    if (fullRole.includes(" - ")){
        var dept=fullRole.split(" - ")[0]
        var role=fullRole.split(" - ")[1]
    } else {
        var dept = "Dirección General"
        var role = "Dirección General"
    }
    miniDept = getMiniDept(dept)
    // console.log(role)
    //Get the historico after the last reject
    let relevantHistorico = getRelevantHistorico(historico)
    // console.log(relevantHistorico)
    //Count Nº de Escalados in Historico
    let numEscalados = countEscalados(relevantHistorico)
    // console.log(numEscalados)

    //Get historico after the last escalado.
    if (numEscalados!==0){
        var historicoLastEscalado = getLastEscaladoHistorico(relevantHistorico)
    } else {
        var historicoLastEscalado = relevantHistorico
    }
    // console.log("Relevant Historico: --> ",historicoLastEscalado)
    let result = true
    for (i=0;i<historicoLastEscalado.length;i++){
        // console.log(historicoLastEscalado[i].accion)
        // console.log(historicoLastEscalado[i].persona)
        // console.log(personaFirma)
        if(historicoLastEscalado[i].accion === "Aprobado" && historicoLastEscalado[i].persona.includes(miniDept) ){
            // console.log("Result =false")
            result = false
        }
    }
    
    // console.log(result)
    return result

}
async function deleteDirectoryContent(directory){
    fs.readdir(directory, (err, files) => {
        console.log("Directory: ", directory)
        console.log("Files: ", files)
        console.log("Files in: ", directory, " = ",files.length)
        if (files.length!==0){
            if (err) throw err;
      
            for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
            }
        }
      });
}
function getCanDirectorSign(historico){
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
    // console.log(historicoRelevante)
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
        let separator =process.env.FILE_SEPARATOR
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
        // console.log(filePath.replace("\\","/"))

        let okFilePath = filePath.replace(process.env.FILE_SEPARATOR,"/").replace(process.env.FILE_SEPARATOR,"/").replace("workspace/","")

        // console.log(okFilePath)
        return {fileName:fileName,filePath:okFilePath}
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
            default:

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
    // console.log("Departamento: ",dept)
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
        if (role==="Dirección General"){
            personalHist = getPersonaHistorico(user.name,user.surname,role)
        } else {

            personalHist = getPersonaHistorico(user.name,user.surname,role.split(" - ")[0])
        }
            // console.log("Format Roles to Resumed Role: ",personalHist)
            result = personalHist.replace(" (","-").replace(")","-")+role.split(" - ")[1]
            // console.log("Format Roles to Resumed Role Result: ",result)

        return result
        // }
        
        // console.log(personalHist)
        // return personalHist
    })
    // console.log("resumedUserRole: --> ",resumedUserRole)
    return resumedUserRole
}
async function sendEmail(emailParams){
    // console.log("ENTERED EMAIL")
    // console.log(emailParams)
    let separator =process.env.FILE_SEPARATOR
    let attachmentsObj = []
    if (emailParams.attachments){
        for (i=0;i<emailParams.attachments.length;i++){
            attachmentsObj.push(
                {
                    path:emailParams.attachments[i],
                    filename:emailParams.attachments[i].split(separator)[emailParams.attachments[i].split(separator).length-1]
                }
            )
        }
    }
    
    // console.log(attachmentsObj)
    let transporter = nodemailer.createTransport({
        host: emailParams.host,
        port: emailParams.port,
        secure:false,
        // service:emailParams.service,
        auth: {
            user: emailParams.auth.user,
            pass: emailParams.auth.pass
          }
    })
    // console.log(transporter)
    let info=await transporter.sendMail({
        from: emailParams.from,
        to: emailParams.to,
        cc:emailParams.cc,
        subject: emailParams.subject,
        html: emailParams.html,
        attachments:attachmentsObj
    })
    // console.log(info)
    console.log("EMAIL SENT")
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
    // console.log("------ Convert Excel Date To JS Date -------")
    var utc_days  = Math.floor(serial - 25569);
    // console.log("UTC_Days: ",utc_days)
    var utc_value = utc_days * 86400;    
    // console.log("UTC_Value: ",utc_value)                     
    var date_info = new Date(utc_value * 1000);
    // console.log("Date Info: ",date_info)
    // console.log("Get Full Year:",date_info.getFullYear())
    // console.log("Get Month: ",date_info.getMonth())
    // console.log("Get Date:",date_info.getDate())
    // returnDate = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
    // console.log("Return Date: ",returnDate)
    // returnDate=returnDate.toLocaleString().split(' ')[0]
    // console.log("Return Date: ",returnDate)
    // var year=returnDate.split(process.env.DATE_SEPARATOR)[0]
    var year = date_info.getFullYear()
    // console.log("YEAR: ",year)
    // var month=returnDate.split(process.env.DATE_SEPARATOR)[1]
    var month =date_info.getMonth()
    // console.log("MONTH: ",month ,"Variable Type:", typeof month)

    // var day=returnDate.split(process.env.DATE_SEPARATOR)[2]
    var day  =date_info.getDate()
    // console.log("DAY: ",day)
    // console.log("Month Number Length: ",month.length)
    if (month.toString().length===1){month='0'+month}
    // console.log("Month to Wirte:", month)
    returnDate=day+"/"+month+"/"+year
    // console.log("Return Date: ",returnDate)
    // returnDate=returnDate.toLocaleString()
    // console.log("Return Date to Locale String: ",returnDate)
    // returnDate=returnDate.split(" ")
    // console.log("Return Date to Locale String Split (' '): ",returnDate.split(" "))
    // returnDate=returnDate.split(" ")[0]
    // console.log("Return Date to Locale String Split (' ')[0]: ",returnDate.split(" ")[0])
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
async function createErrorMsgApprove(role,canDirectorsign,canThisDeptSign,canDirectorGeneralSign){
    // console.log(canThisDeptSign)
    if(role === "Select your Role and Department"){
        errorMsg = "Select a role."
    } else {
        if (!canDirectorsign && role.includes("Director")){
            errorMsg="You must aprove as Autorized befor approving as Director."
        }else if(canDirectorsign && role.includes("Autorizado")){
            errorMsg="This contract only needs to be signed by Directors."
        } else if (!canDirectorGeneralSign && role.includes("General")){
            errorMsg="This contract can't be signed by the General Direction yet."
        }else if(canThisDeptSign===false){
            errorMsg="You can't approve with this role again."
        }else{
            errorMsg=""
        }
    }
    return errorMsg;
}
function numberToCurrency(number){
    // console.log("-----Convert New Number-----")
    // console.log(number)
    result = new Intl.NumberFormat("de-DE" ,{style: "currency", currency: "EUR"}).format(number)
    // console.log(result)
    result = result.slice(1)+"€"
    // console.log(result)
    result = result.replace(".","!").replace(",",".").replace("!",",").replace(",00","")
    // console.log(result)
    return result
}
function createRoleArray(role,role1,role2,role3,role4){
    const roleArr = []
    // console.log(role4)
    if (role!==undefined&&role!=="Select your Role and Department"){roleArr.push(role)}
    if (role1!==undefined&&role1!=="Select your Role and Department"){roleArr.push(role1)}
    if (role2!==undefined&&role2!=="Select your Role and Department"){roleArr.push(role2)}
    if (role3!==undefined&&role3!=="Select your Role and Department"){roleArr.push(role3)}
    if (role4!==undefined&&role4!=="Select your Role and Department"){roleArr.push(role4)}
    console.log(roleArr)
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
    
    let minidept =getMiniDept(dept)
    let result = name1 + " " + surnameInicial+". (" + minidept +")"
    
    return result
}
function getMiniDept(dept){
    let minidept = ""

    if (dept === "Comercial"){
        minidept = "Comerc."
    }else if (dept === "Control de Riesgos"){
        minidept="C. Riesgos"
    }else if (dept === "Operaciones"){
        minidept = "Oper."
    }else if (dept === "PRL"){
        minidept = "PRL"
    } else if (dept === "Dirección General"){
        minidept = "Dir. General"
    }
    return minidept
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
    if (role.indexOf("Dirección General")!==-1){roleObj.dirGeneral=true;roleCountVariable=+1}else{roleObj.dirGeneral=false}
    
    if (roleCountVariable>1){roleObj.singleRole = true}else{roleObj.singleRole = false}
    return roleObj
}

module.exports=router;