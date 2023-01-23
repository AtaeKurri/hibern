export default class character_rack_HUD extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: game.i18n.localize("hibern.Divers.CharacterRack"),
            template: "systems/hibern/templates/partials/character-rack.hbs",
            classes: ["dialog"],
            width: 250,
            height: 640,
            top: 65,
            left: 120,
            resizable: false,
            tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "Spells"}]
        });
    }

    selected_token = undefined;
    actor = undefined;

    static show({inFocus = true, tab = "Spells"}={}) {
        let activeApp;
        for (let app of Object.values(ui.windows)) {
            if (app instanceof this) {
                activeApp = app;
                break;
            }
        }
        if (activeApp) {
            if (activeApp._tabs[0].active !== tab) {
                activeApp.render(true, {focus: inFocus});
            }
        } else {
            activeApp = new this();
            activeApp.render(true, {focus: inFocus});
        }

        Hooks.callAll("hibern.char_rack_show", this.selected_token, this.actor);
        return activeApp.setTab(tab);
    }

    setTab(tab){
        this._tabs[0].active = tab;
        return this;
    }

    getData() {
        let sheetData;
        try {
            sheetData = {
                actor: this.selected_token.document._actor,
                tokenData: this.selected_token,
                spellcards: this.selected_token.document._actor.items.filter(function (item) {return item.type == "Spell Card"}),
                abilities: this.selected_token.document._actor.items.filter(function (item) {return item.type == "Capacité"})
            };
        } catch (err) {
            sheetData = {
                actor: undefined,
                tokenData: this.selected_token,
                spellcards: [],
                abilities: []
            };
        }

        return sheetData;
    }

    activateListeners(html) {
        Hooks.once("controlToken", (tokenData, selected) => {
            if (tokenData.document._actor.type == "marchand") {return;}

            this.selected_token = (selected) ? tokenData : undefined;
            this.actor = (selected) ? this.selected_token.document._actor : undefined;
            this.render();
        });

        Hooks.on("updateItem", (item, system, diff, id) => {
            if (item.parent == null || item.parent._type == "marchand") {return;}
            
            if (this.selected_token.document._actor._id == item.parent._id)
                this.render();
        });

        html.find(".use-spellcard").click(this._useSpell.bind(this));
        html.find(".use-ability").click(this._useAbility.bind(this));

        super.activateListeners(html);
    }

    //#region listeners

    async _useSpell(event) {
        await this.actor.sheet._useSpellCard(event, this);
    }

    async _useAbility(event) {
        await this.actor.sheet._useAbility(event, this);
    }

    //#endregion
}

//#region Hooks

Hooks.on("getSceneControlButtons", (controls) => {
    const CharacterRack = {
        icon: "fas fa-list",
        name: "hibernrack",
        title: game.i18n.localize("hibern.Divers.ShowCharacterRack"),
        button: true,
        visible: true,
        onClick: () => {
            character_rack_HUD.show({inFocus: true, tab: "Spells"});
        }
    };

    const bar = controls.find(c => c.name === "token");
    bar.tools.push(CharacterRack);
});

//#endregion
