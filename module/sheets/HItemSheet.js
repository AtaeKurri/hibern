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
                abilities: this.actor.items.filter(function (item) {return item.type == "Capacité"}),
            };
        }

        return sheetData;
    }
}