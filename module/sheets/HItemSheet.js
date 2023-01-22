export default class HItemSheet extends ItemSheet {
    static get defaultOptions(){
        return mergeObject(super.defaultOptions, {
            width: 600,
            height: 340,
            resizable: false,
            classes: ["hibern", "sheet", "item"]
        });
    }
    get template() {
        return `systems/hibern/templates/sheets/${this.item.type}-sheet.hbs`;
    }

    getData() {
        const baseData = super.getData();
        let sheetData;
        if (this.actor == null) {
            sheetData = {
                owner: this.item.isOwner,
                editable: this.isEditable,
                item: baseData.item,
                data: baseData.item.system,
                config: CONFIG.hibern,
            };
        } else {
            sheetData = {
                owner: this.item.isOwner,
                editable: this.isEditable,
                item: baseData.item,
                data: baseData.item.system,
                config: CONFIG.hibern,
                abilities: this.actor.items.filter(function (item) {return (item.type == "Capacité" && item.system.Actif == true)}),
            };
        }

        return sheetData;
    }
}

//#region Hooks

/*Hooks.on("updateItem", (item, system, diff, id) => {
    if (item.canUserModify(game.user, "update") && item.type == "Capacité") {
        if (diff.render == true) {
            const isActif = (item.system.PostureCustom == true) ? false : item.system.Actif
            const isUsageWhenKO = (item.system.PostureCustom == true) ? false : item.system.UsageWhenKO
            const isPostureCustom = (item.system.Actif == true || item.system.UsageWhenKO == true) ? false : item.system.PostureCustom
            item.update({
                system: {
                    Actif: isActif,
                    UsageWhenKO: isUsageWhenKO,
                    PostureCustom: isPostureCustom
                }
                }, {diff: false, render: true}
            );
        }
    }
});*/

//#endregion