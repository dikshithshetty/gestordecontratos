function addRoleSelectorBtn(){
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
// </select>`
    addbtn = document.getElementById("addRoleSelectorBtn")
    registerForm = document.getElementById("registerForm")
    selector = document.getElementsByClassName("select")[0]
    console.log(selector)
    console.log(addbtn);
    console.log(registerForm);
    registerForm.insertBefore(selector,addbtn)
}
// document.getElementById("addRoleSelectorBtn").addEventListener('onclick',addRoleSelectorBtn());
// addbtn = document.getElementById("addRoleSelectorBtn")
// registerForm = document.getElementById("registerForm")
// console.log(addbtn);
