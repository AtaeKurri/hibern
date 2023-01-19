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
            new ContextMenu(html, ".InventoryItem", this.itemContextMenu);
        }

        super.activateListeners(html);
    }

    //#region Context Menus

    itemContextMenu = [
        {
            name: "Editer",
            icon: '<i class="fas fa-edit"></i>',
            callback: element => {
                const item = this.actor.items.get(element.data("item-id"));
                item.sheet.render(true);
            }
        },
        {
            name: "Supprimer",
            icon: '<i class="fas fa-trash"></i>',
            callback: async (element) => {
                const itemid = element.data("item-id");
                let checkOptions = await this.GetDeletionConfirmation(this.actor.items.get(itemid).name);
                if (checkOptions.cancelled) {
                    return;
                }
                this.actor.deleteEmbeddedDocuments("Item", [itemid]);
            }
        }
    ];

    //#endregion

    //#region Dialogs

    async GetDeletionConfirmation(ObjectName) {
        const template = "systems/hibern/templates/partials/deletion-confirm.hbs";
        const htmlParams = {
            objName: ObjectName
        };
        const html = await renderTemplate(template, htmlParams);

        return new Promise(resolve => {
            const data = {
                title: game.i18n.localize(`hibern.Divers.Deletion`),
                content: html,
                buttons: {
                    normal: {
                        label: game.i18n.localize(`hibern.Divers.Accepter`),
                        callback: html => resolve({cancelled: false})
                    },
                    cancel: {
                        label: game.i18n.localize(`hibern.Divers.Annuler`),
                        callback: html => resolve({cancelled: true})
                    }
                },
                default: "normal",
                close: () => resolve({cancelled: true})
            }
            new Dialog(data, null).render(true);
        });
    }

    //#endregion
}

//#region Hooks



//#endregion