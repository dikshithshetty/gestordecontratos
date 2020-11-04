// function addRoleSelectorBtn(){
//     const selector =`<select name="role"  value="{{#if formData.role}}{{formData.role}}{{/if}}">
//     <option hidden selected>Select Your Role</option>
//     <option value="comercial-autorizado">Comercial - Autorizado</option>
//     <option value="comercial-director">Comercial - Director</option>
//     <option value="control-de-riesgos-autorizado">Control de Riesgos - Autorizado</option>
//     <option value="control-de-riesgos-director">Control de Riesgos - Director</option>
//     <option value="operaciones-autorizado">Operaciones - Autorizado</option>
//     <option value="operaciones-director">Operaciones - Director</option>
//     <option value="prl-autorizado">PRL - Autorizado</option>
//     <option value="prl-director">PRL - Director</option>
//     </select>`
//     addbtn = document.getElementById("addRoleSelectorBtn")
//     registerForm = document.getElementById("registerForm")
//     selector = document.getElementsByClassName("select")[0]
//     console.log(selector)
//     console.log(addbtn);
//     console.log(registerForm);
//     registerForm.insertBefore(selector,addbtn)
// }
// document.getElementById("addRoleSelectorBtn").addEventListener('onclick',addRoleSelectorBtn());
// addbtn = document.getElementById("addRoleSelectorBtn")
// registerForm = document.getElementById("registerForm")
// console.log(addbtn);


async function getAlertId(element){
    const Notice = require('../models/notice-model.js')
        //import Notice from "../models/notice-model.js"

    let id = element.id
    let form = document.getElementsByClassName("mess-container")[0].getElementsByTagName("form")[0]
    //console.log(document.getElementsByClassName("mess-container"))
    document.getElementsByClassName("mess-container")[0].style.visibility="visible"
    form.action="/updateAlerts/"+id

    //console.log(alert)
    form.getElementsByTagName("input")[0].value = "test Email"
    form.getElementsByTagName("input")[1].value = "test cc"
    form.getElementsByTagName("input")[2].value = "test subject"
    form.getElementsByTagName("textarea")[0].value = "test message"
}

var header = document.getElementById("myDIV");
var btns = header.getElementsByClassName("department-btn");
for (var i = 0; i < btns.length; i++) {
  btns[i].addEventListener("click", function() {
  var current = document.getElementsByClassName("btn-blue");
  current[0].className = current[0].className.replace(" btn-blue", "");
  this.className += " btn-blue";
  });
}
