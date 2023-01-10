export default class HMarchandSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 750,
            height: 500,
            resizable: false,
            classes: ["hibern", "sheet", "marchand"],
            tabs: [{
                navSelector: ".tabs",
                contentSelector: ".content",
                initial: "armes" }]
        });
    }
    
    get template() {
        return `systems/hibern/templates/sheets/marchand-sheet.hbs`;
    }

    getData() {
        const data = super.getData();

        const baseData = super.getData();
        let sheetData = {
            owner: this.actor.isOwner,
            editable: this.isEditable,
            actor: baseData.actor,
            system: baseData.actor.system,
            config: CONFIG.hibern,
            armes: data.items.filter(function (item) {return item.type == "Arme"}),
            armures: data.items.filter(function (item) {return item.type == "Armure"}),
            accessoires: data.items.filter(function (item) {return item.type == "Accessoire"}),
            spellcards: data.items.filter(function (item) {return item.type == "Spell Card"}),
            objets: data.items.filter(function (item) {return item.type == "Objet"})
        };

        return sheetData;
    }

    activateListeners(html) {
        if (this.actor.isOwner) {
            
        }

        super.activateListeners(html);
    }
}

//#region Hooks



//#endregion