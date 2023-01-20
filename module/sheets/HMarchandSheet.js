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
            new ContextMenu(html, ".InventoryItem", this.itemContextMenuOwner);
        } else {
            //new ContextMenu(html, ".InventoryItem", this.itemContextMenu);
        }

        html.find(".open-item").click(this._onOpenItem.bind(this));

        super.activateListeners(html);
    }

    //#region Listeners

    async _onOpenItem(event) {
        const itemId = event.currentTarget.closest(".open-item").dataset.itemid;
        let item = this.actor.items.get(itemId);
        item.sheet.render(true);
    }

    //#endregion

    //#region Context Menus

    itemContextMenuOwner = [
        {
            name: game.i18n.localize("hibern.ContextMenu.Editer"),
            icon: '<i class="fas fa-edit"></i>',
            callback: element => {
                const item = this.actor.items.get(element.data("item-id"));
                item.sheet.render(true);
            }
        },
        {
            name: game.i18n.localize("hibern.ContextMenu.Supprimer"),
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

    itemContextMenu = [
        {
            name: game.i18n.localize("hibern.ContextMenu.Details"),
            icon: '<i class="fas fa-book"></i>',
            callback: element => {
                const item = this.actor.items.get(element.data("item-id"));
                item.sheet.render(true);
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

    //#region method overrides

    _canDragStart(selector) {
        return true;
    }
    
    _canDragDrop(selector) {
        return true;
    }

    /*_onDragStart(event) {
        if (!event.currentTarget.classList.contains("InventoryItem")) {
            super._onDragStart(event);
        }

        const dragData = this.actor.items.get(event.currentTarget.dataset.itemId).toDragData();

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }*/

    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        const item = await Item.implementation.fromDropData(data);

        if (item.parent?._id == this.actor._id || item.parent == undefined) {
            super._onDrop(event);
        } else {
            CONFIG.hibern.socket.executeAsGM("CreateGMItem", item.parent._id, this.actor._id, item._id);
            CONFIG.hibern.socket.executeAsGM("DeleteGMItem", item.parent, item);
        }
    }

    //#endregion
}

//#region Hooks



//#endregion