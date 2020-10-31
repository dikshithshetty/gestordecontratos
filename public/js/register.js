function addRoleSelectorBtn(addButton){
    console.log(addButton);
    const selector =`<select name="role"  value="{{#if formData.role}}{{formData.role}}{{/if}}">
    <option hidden selected>Select Your Role</option>
    <option value="comercial-autorizado">Comercial - Autorizado</option>
    <option value="comercial-director">Comercial - Director</option>
    <option value="control-de-riesgos-autorizado">Control de Riesgos - Autorizado</option>
    <option value="control-de-riesgos-director">Control de Riesgos - Director</option>
    <option value="operaciones-autorizado">Operaciones - Autorizado</option>
    <option value="operaciones-director">Operaciones - Director</option>
    <option value="prl-autorizado">PRL - Autorizado</option>
    <option value="prl-director">PRL - Director</option>
</select>`
    addButton.insertBefore(selector)
}
document.getElementById(addRoleSelectorBtn).addEventListener('onclick',addRoleSelector(this));