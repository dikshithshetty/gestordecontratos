# Contract Manager

## Description

The main goal of this web application is to allow companies a better control and comunication system that streamlines the process of signing contracts.
 
## User Stories

- **404** - As a user I want to see a nice 404 page when I go to a page that doesn't exist so that I know it was my fault.
- **500** - As a user I want to see a nice error page when the super team screws it up so that I know that is not my fault.
- **sign up** - As a user I want to sign up on the webpage so that I can register myself as a user.
- **login** - As a user I want to be able to log in on the webpage so that I can log in into my accpunt.
- **logout** - As a user I want to be able to log out from the webpage so that I can make sure no one will access my account.
- **contract list** - As a user I want to see all the contracts that need to be sign.
    - **see details** - As a user I want to see detailed information about a contract.
    - **accept contract** - As a user I want to sign a contract.
    - **reject contract** - As a user I want to reject a contract.
    - **delete contract** - As a user I want to delete a contract.
    - **update contract** - As a user I want to edit a contract.
    - **upload contract** - As a user I want to upload a contract.
    - **view contract records** - As a user I want to view all the stages that a contract has gone through.
- **edit alerts** - As a user I want to edit email templates.
- **view KPIs** - As a user I want to see different KPIs that allows me to evaluate and follow up my teams performance.

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
- KPIs:
    - View all the stages that a contract has gone through.
    - View different charts that allows the user to evaluate and follow up the team performance.


## ROUTES (PENDING):

- GET / 
  - renders the homepage
- GET /auth/signup
  - redirects to / if user logged in
  - renders the signup form (with flash msg)
- POST /auth/signup
  - redirects to / if user logged in
  - body:
    - username
    - email
    - password
- GET /auth/login
  - redirects to / if user logged in
  - renders the login form (with flash msg)
- POST /auth/login
  - redirects to / if user logged in
  - body:
    - username
    - password
- POST /auth/logout
  - body: (empty)

- GET /events
  - renders the event list + the create form
- POST /events/create 
  - redirects to / if user is anonymous
  - body: 
    - name
    - date
    - location
    - description
- GET /events/:id
  - renders the event detail page
  - includes the list of attendees
  - attend button if user not attending yet
- POST /events/:id/attend 
  - redirects to / if user is anonymous
  - body: (empty - the user is already stored in the session)


## Models (PENDING)


## WireFrames

<img src="/public/images/wireframes/login.png" alt="" heigth="200px">
<img src="/public/images/wireframes/register.png" alt="" heigth="200px">
<img src="/public/images/wireframes/register.png" alt="" heigth="200px">
<img src="/public/images/wireframes/login.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Contratos.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Approve Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Reject Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Delete Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Contract Detail.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Update Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Upload Contracts.png" alt="" heigth="200px">
<img src="/public/images/wireframes/Status Contract.png" alt="" heigth="200px">




## Links

[Trello](https://trello.com/b/jsaMC7Zi/contract-manager)

[Git Hub Repository](https://github.com/Estevemartin/gestordecontratos/tree/master)

[Deploy Link]()

[Slides Link]()

1 sec
