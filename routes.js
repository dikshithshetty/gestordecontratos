const express = require('express');
const router = express.Router();
// const User=require('../models/user-model')
// BCrypt to encrypt passwords
const bcrypt = require("bcryptjs");
// const { read } = require('fs');
const { findOne } = require("./models/user-model");
const User = require('./models/user-model');

router.get('/',(req,res,next)=>{
    // console.log(req.session)
    if (req.session.currentUser) {
        res.render('contracts');
    } else {
        res.render('login-register/login');
    }
})

router.get('/register',(req,res,next)=>{
    // if (req.session!==undefined) {
    //     res.render('contracts');
    // } else {
        res.render('login-register/register');
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
        res.render("login-register/register",{formData});
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
                console.log(formData)
                res.render("login-register/login",formData);

            }
        } catch(error){
            next(error);
        }
    }
})
//SESSION NOT WORKING


router.get('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        res.redirect('/')
    })
})


module.exports=router;

function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}