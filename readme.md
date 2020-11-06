# Contract Manager

## Description

The main goal of this web application is to allow companies a better control and communication system that streamlines the process of signing contracts.
 
## User Stories

- **404** - As a user I want to see a nice 404 page when I go to a page that doesn't exist so that I know it was my fault.
- **sign up** - As a user I want to sign up on the webpage so that I can register myself as a user.
- **log in** - As a user I want to be able to log in on the webpage so that I can log in into my accpunt.
- **logout** - As a user I want to be able to log out from the webpage so that I can make sure no one will access my account.
- **contract list** - As a user I want to see all the contracts that need to be sign.
    - **see details** - As a user I want to see detailed information about a contract.
    - **accept contract** - As a user I want to sign a contract.
    - **reject contract** - As a user I want to reject a contract.
    - **delete contract** - As a user I want to delete a contract.
    - **update contract** - As a user I want to edit a contract.
    - **upload contract** - As a user I want to upload a contract.
- **edit alerts** - As a user I want to edit email templates.

## MVP

- Register, Login and Logout.
- Add new contracts.
- View a list of pending contracts.
- Accept, reject, edit and delete contracts.
- Set up email templates.


## Backlog

List of other features outside of the MVPs scope

- Send email whenever a user creates, accepts, deletes, updates or rejects a contract.
- If a user doesn't sign a contract 3 days after an email was sent, another email is sent to that user every 3 days until he accepts or rejects the contract.
- Recover Forgotten Password.
- Send Confirmation Email for Account Activation.
- Change Password in User Profile.
- KPIs:
    - View all the stages that a contract has gone through.
    - View different charts that allows the user to evaluate and follow up the team performance.


## ROUTES

**/** 
- GET: 
  - renders the contract list (if user register)
  - renders the login

**/register**
- GET: 
  - renders the register with signup form (with flash msg)

- POST:
  - create new users in database
  - redirects to login (with flash msg)
  
**/login**
- GET: 
  - renders the login

- POST:
  - check if email and passwords matches
  - redirects to Contract list

**/logout**
- GET: 
  - destroy session
  - redirects to login

**/displayPendingContracts**
- GET:
  - list pending contracts from database
  - check which contracts can be signed by the current user

**/displayClosedContracts**
- GET:
  - list closed contracts from database

**/uploadNewContractToDB**
- POST:
  - check files integrity
  - save input files
  - create new contract to database
  - add first action to contract history 

**/approveContract/:id**
- POST:
  - add user signature to contract
  - add approve action to contract history
  - send new contract alert

**/deleteContract/:id**
- GET:
  - remove contracts from database

**/rejectContract/:id** 
- POST:
  - remove all contract signatures
  - add reject action to contract history

**/alertsContracts**
- GET:
  - display current alerts configuration

**/updateAlerts/:alertType**
- POST:
  - save new alerts configuration to database

**/editContracts/:id**
- GET:
  - display contract details, signatures, files and history

**/editContracts/uploadFiles/:pq/**
- POST:
  - upload files to contract

**/deleteFiles/:pq/:fileName**
- GET:
  - delete selected file from PQ folder

**/profile**
- GET:
  - show user information

**/profile/addRoles/:email**
- POST:
  - add new roles to current user

**/deleteRole/:role**
- GET:
  - delete role from current user

## Models
**User Models**
```
{
    name:{type:String,required:true},
    surname:{type:String,required:true},
    email:{type:String,required:true, unique:true},
    password:{type:String,required:true},
    role:{type:Array,required:true},
    usertype:{type:String, default: 'user'},
},
{
  timestamps: true
}
```

**Contract Models**
```
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
      }
    },
    historico:{type:Array,default:[]},
    uploadedFiles:{type:Array,default:[]}
}
```
**Notice Models**
```
{
    noticeType:{type:String,required:true},
    destinatario:{type:String,required:true},
    cc:{type:String},
    subject:{type:String,required:true},
    emailBody:{type:String,required:true},
    attachments:[String],
    periodicidad:{type:String}
    }
```

## WireFrames

<img src="/public/images/wireframes/register.png" alt="" heigth="200px">
<img src="/public/images/wireframes/login.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Contratos.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Approve Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Reject Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Delete Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Update Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Upload Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Status Contract.png" alt="" heigth="200px">



## Links

[Trello](https://trello.com/b/jsaMC7Zi/contract-manager)

[Git Hub Repository](https://github.com/Estevemartin/gestordecontratos/tree/master)

[Deploy Link]()

[Slides Link]()
