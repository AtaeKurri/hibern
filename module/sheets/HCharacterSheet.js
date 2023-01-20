export default class HCharacterSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 700,
            height: 750,
            scrollY: [".scroll-container", ".content"],
            resizable: false,
            classes: ["hibern", "sheet", "personnage"],
            tabs: [{
                navSelector: ".tabs",
                contentSelector: ".content",
                initial: "description" }]
        });
    }
    
    get template() {
        const char = (this.actor.isOwner) ? "character" : "Ncharacter";
        return `systems/hibern/templates/sheets/${char}-sheet.hbs`;
    }

    //#region Context Menus

    itemContextMenu = [
        {
            name: game.i18n.localize("hibern.ContextMenu.Editer"),
            icon: '<i class="fas fa-edit"></i>',
            callback: element => {
                const item = this.actor.items.get(element.data("item-id"));
                item.sheet.render(true);
            }
        },
        {
            name:game.i18n.localize("hibern.ContextMenu.Supprimer"),
            icon: '<i class="fas fa-trash"></i>',
            callback: element => {
                this.actor.deleteEmbeddedDocuments("Item", [element.data("item-id")]);
            }
        }
    ];

    //#endregion

    getData() {
        const data = super.getData();

        const baseData = super.getData();
        let sheetData = {
            owner: this.actor.isOwner,
            //modifier editable en true, ou alors voir pour modifier les permissions de drag and drop sur la fiche (modifier les permissions internes ?)
            editable: this.isEditable,
            actor: baseData.actor,
            system: baseData.actor.system,
            config: CONFIG.hibern,
            armes: data.items.filter(function (item) {return item.type == "Arme"}),
            armures: data.items.filter(function (item) {return item.type == "Armure"}),
            accessoires: data.items.filter(function (item) {return item.type == "Accessoire"}),
            spellcards: data.items.filter(function (item) {return item.type == "Spell Card"}),
            abilities: data.items.filter(function (item) {return item.type == "Capacité"}),
            objets: data.items.filter(function (item) {return item.type == "Objet"})
        };

        return sheetData;
    }

    activateListeners(html) {
        if (this.actor.isOwner) {
            html.find(".item-create").click(this._onItemCreate.bind(this));
            html.find(".item-delete").click(this._onItemDelete.bind(this));
            html.find(".inline-edit").change(this._onInlineEdit.bind(this));
            html.find(".item-edit").click(this._onItemEdit.bind(this));
            html.find(".stats-test").click(this._onStatTest.bind(this));
            html.find(".use-spellcard").click(this._useSpellCard.bind(this));
            html.find(".use-ability").click(this._useAbility.bind(this));
            html.find(".roll-weapon").click(this._useWeapon.bind(this));
            html.find(".roll-baseatk").click(this._rollBasicAtk.bind(this));
        
            new ContextMenu(html, ".InventoryItem", this.itemContextMenu);
        }

        super.activateListeners(html);
    }

    //#region Dialogs

    async GetDiffRollOptions(needFatigue) {
        const template = "systems/hibern/templates/partials/diff-dialog.hbs";
        const htmlParams = {
            difficulties: CONFIG.hibern.rolldiff,
            NeedFatigue: needFatigue
        };
        const html = await renderTemplate(template, htmlParams);

        return new Promise(resolve => {
            const data = {
                title: game.i18n.localize(`hibern.rolls.Difficulty`),
                content: html,
                buttons: {
                    normal: {
                        label: game.i18n.localize(`hibern.Divers.Accepter`),
                        callback: html => resolve(_processDiffOptions(html[0].querySelector("form")))
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

    async GetWeaponRollOptions() {
        const template = "systems/hibern/templates/partials/weapon-dialog.hbs";
        const htmlParams = {
            difficulties: CONFIG.hibern.rolldiff,
            actor: this.actor
        };
        const html = await renderTemplate(template, htmlParams);

        return new Promise(resolve => {
            const data = {
                title: game.i18n.localize(`hibern.rolls.Difficulty`),
                content: html,
                buttons: {
                    normal: {
                        label: game.i18n.localize(`hibern.Divers.Accepter`),
                        callback: html => resolve(_processWeaponOptions(html[0].querySelector("form")))
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

    //#region Item related

    _onItemCreate(event) {
        event.preventDefault();
        let element = event.currentTarget;

        let itemData = {
            name: element.dataset.itemname,
            type: element.dataset.type
        }

        return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    async _onItemDelete(event) {
        event.preventDefault();
        let element = event.currentTarget;
        let itemid = element.closest(".item-delete").dataset.itemid;

        let checkOptions = await this.GetDeletionConfirmation(this.actor.items.get(itemid).name);
        if (checkOptions.cancelled) {
            return;
        }

        return this.actor.deleteEmbeddedDocuments("Item", [itemid]);
    }

    _onInlineEdit(event) {
        event.preventDefault();
        let element = event.currentTarget;
        let itemid = element.closest(".item").dataset.itemid;
        let item = this.actor.items.get(itemid);
        let field = element.dataset.field;

        return item.update({[field]: element.value});
    }

    async _onItemEdit(event) {
        const itemId = event.currentTarget.closest(".item-edit").dataset.itemid;
        let item = this.actor.items.get(itemId);
        item.sheet.render(true);
    }

    checkIfHasItemType(type) {
        let items = this.actor.items.filter(function (item) {return item.type == type});
        return (items.length == 0) ? false : true;
    }

    //#endregion

    //#region Stat related

    async _onStatTest(event) {
        const statName = event.currentTarget.closest(".stats-test").dataset.statname;
        const testStat = event.currentTarget.closest(".stats-test").dataset.stat;

        let checkOptions = await this.GetDiffRollOptions(false);
        if (checkOptions.cancelled) {
            return;
        }

        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };

        let rollResult = new Roll(`1d20`);
        rollResult = await rollResult.evaluate({async:true});

        let successtype;
        let localRes;
        if (rollResult._total == 20) {
            successtype = "CritSuccess";
        } else if (rollResult._total+Number(testStat) >= checkOptions.Diff) {
            successtype = "Success";
        } else if (rollResult._total == 1) {
            successtype = "CritFailure";
        } else {
            successtype = "Failure";
        }
        localRes = successtype;

        let rollResult2 = rollResult._total + Number(testStat);
        let cardData = {
            StatName: statName,
            rollResult: rollResult2,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`),
        };

        chatData.content = await renderTemplate("systems/hibern/templates/partials/test-card.hbs", cardData);
        return rollResult.toMessage(chatData);
    }

    //#endregion

    //#region Spell related

    async _useSpellCard(event, newThisBase) {
        const newThis = (newThisBase === undefined) ? this : newThisBase;
        const itemId = event.currentTarget.closest(".use-spellcard").dataset.itemid;
        const item = newThis.actor.items.get(itemId);
        const rollStat = newThis.actor.system[item.system.stat].value;
        let RollBonus = 0;
        if (item.system.Composante != "None") {
            RollBonus = newThis.actor.items.get(item.system.Composante).system.Spécialisation;
            if (RollBonus >= newThis.actor.system.MAG.value)
                RollBonus = newThis.actor.system.MAG.value;
        }
        const AdditionnalManaCost = (RollBonus == 0) ? 0 : 1;

        let checkOptions = await this.GetDiffRollOptions(true);
        if (checkOptions.cancelled) {
            return;
        }
        const newDiff = getAdjustedDiff(checkOptions.Diff, item.system.Fatigue);

        if (checkOptions.AffectFatigue == true) {
            const ftg = item.system.Fatigue += (IsCharInAS(newThis.actor)) ? 2 : 1;
            item.update({
                system: {
                    Fatigue: ftg
                }
            }, {diff: false, render: true});
            lowerAllOtherFatigue(item.type, newThis.actor, item._id);
        }
        
        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };

        let rollResult = new Roll(`1d20`);
        let damageRoll = new Roll(item.system.Degats);
        rollResult = await rollResult.evaluate({async:true});
        damageRoll = await damageRoll.evaluate({async:true});

        let successtype;
        let localRes;
        if (rollResult._total == 20) {
            successtype = "CritSuccess";
        } else if (rollResult._total + rollStat + RollBonus >= newDiff) {
            successtype = "Success";
        } else if (rollResult._total == 1) {
            successtype = "CritFailure";
        } else {
            successtype = "Failure";
        }
        localRes = successtype;
        
        let rollResult2 = rollResult._total + rollStat + RollBonus;
        let cardData = {
            isAS: IsSpellAS(newThis.actor, item),
            Degats: damageRoll._total,
            spell: item,
            rollResult: rollResult2,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`),
            Cost: parseInt(item.system.Cout)+AdditionnalManaCost
        }

        chatData.content = await renderTemplate("systems/hibern/templates/partials/spell-card.hbs", cardData);
        return rollResult.toMessage(chatData);
    }
    
    //#endregion

    //#region Ability related

    async _useAbility(event, newThisBase) {
        const newThis = (newThisBase === undefined) ? this : newThisBase;
        const capaID = event.currentTarget.closest(".use-ability").dataset.itemid;
        const ability = newThis.actor.items.get(capaID);
        const IsActive = ability.system.Actif;
        let rollResult;
        let rollResult2;
        let localRes;
        let successtype;

        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };

        if (IsActive) {
            let checkOptions = await this.GetDiffRollOptions(true);
            if (checkOptions.cancelled) {
                return;
            }
            const newDiff = getAdjustedDiff(checkOptions.Diff, ability.system.Fatigue);

            if (checkOptions.AffectFatigue == true) {
                const ftg = ability.system.Fatigue += (IsCharInAS(newThis.actor)) ? 2 : 1;
                ability.update({
                    system: {
                        Fatigue: ftg
                    }
                }, {diff: false, render: true});
                lowerAllOtherFatigue(ability.type, newThis.actor, ability._id);
            }

            rollResult = new Roll(`1d20`);
            rollResult = await rollResult.evaluate({async:true});

            if (rollResult._total == 20) {
                successtype = "CritSuccess";
            } else if (rollResult._total+ability.system.Spécialisation >= newDiff) {
                successtype = "Success";
            } else if (rollResult._total == 1) {
                successtype = "CritFailure";
            } else {
                successtype = "Failure";
            }
            localRes = successtype;
            rollResult2 = rollResult._total+ability.system.Spécialisation;
        }

        let cardData = {
            ability: ability,
            isActive: IsActive,
            rollResult: rollResult2,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`),
        }

        chatData.content = await renderTemplate("systems/hibern/templates/partials/ability-card.hbs", cardData);
        if (IsActive == true) {
            return rollResult.toMessage(chatData);
        } else {
            return ChatMessage.create(chatData);
        }
    }

    //#endregion

    //#region Weapon related
    
    async _useWeapon(event) {
        const weaponID = event.currentTarget.closest(".roll-weapon").dataset.itemid;
        const weapon = this.actor.items.get(weaponID);
        let checkOptions = await this.GetWeaponRollOptions();
        if (checkOptions.cancelled) {
            return;
        }
        const Modifier = checkOptions.Stat;

        let rollResult = new Roll(`1d20`);
        rollResult = await rollResult.evaluate({async:true});
        let damageRoll = new Roll(weapon.system.Damage);
        damageRoll = await damageRoll.evaluate({async:true});

        let successtype;
        let localRes;
        if (rollResult._total == 20) {
            successtype = "CritSuccess";
        } else if (rollResult._total+Modifier >= checkOptions.Diff) {
            successtype = "Success";
        } else if (rollResult._total == 1) {
            successtype = "CritFailure";
        } else {
            successtype = "Failure";
        }
        localRes = successtype;
        
        let rollResult2 = rollResult._total + Modifier;
        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };
        let cardData = {
            Degats: damageRoll._total,
            Weapon: weapon,
            rollResult: rollResult2,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`)
        }

        chatData.content = await renderTemplate("systems/hibern/templates/partials/weapon-card.hbs", cardData);
        return rollResult.toMessage(chatData);
    }
    
    //#endregion

    //#region Basic attacks

    async _rollBasicAtk(event) {
        const atkType = event.currentTarget.closest(".roll-baseatk").dataset.type;
        const context = event.currentTarget.closest(".roll-baseatk").dataset.ctx;
        let stat;
        let localAtk;
        let checkOptions;
        if (context == "Atk") {
            localAtk = game.i18n.localize(`hibern.chars.atk${atkType}`);
            checkOptions = await this.GetDiffRollOptions(true);
            if (checkOptions.cancelled) {
                return;
            }
        }
        else {
            localAtk = game.i18n.localize(`hibern.chars.dmg${atkType}`);
        }

        stat = (atkType == "Magic") ? this.actor.system.MAG.value : this.actor.system.FOR.value;

        if (context == "Atk" && checkOptions.AffectFatigue == true) {
            lowerAllOtherFatigue("Spell Card", this.actor, null);
            lowerAllOtherFatigue("Capacité", this.actor, null);
        }

        let rollResult;
        if (context == "Atk") {
            rollResult = new Roll(`1d20`);
            rollResult = await rollResult.evaluate({async:true});
        }
        let damageRoll = new Roll(`1d4+3`);
        damageRoll = await damageRoll.evaluate({async:true});

        let successtype;
        let localRes;
        if (context == "Atk") {
            if (rollResult._total == 20) {
                successtype = "CritSuccess";
            } else if (rollResult._total+stat >= checkOptions.Diff) {
                successtype = "Success";
            } else if (rollResult._total == 1) {
                successtype = "CritFailure";
            } else {
                successtype = "Failure";
            }
            localRes = successtype;
        }
        
        let rollResult2;
        if (context == "Atk")
            rollResult2 = rollResult._total + stat;

        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };
        let cardData = {
            context: context,
            Degats: damageRoll._total,
            rollResult: rollResult2,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`),
            localizeAtk: localAtk
        }

        chatData.content = await renderTemplate("systems/hibern/templates/partials/basicatk-card.hbs", cardData);
        if (context == "Atk")
            return rollResult.toMessage(chatData);
        else
            return damageRoll.toMessage(chatData);
    }

    //#endregion

    //#region DragDrop

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

Hooks.on("renderActorSheet", (app, html, data) => {
    let actor = game.actors.get(data.actor._id);
    if (actor.isOwner) {
        let title = html.find(".window-title");

        let EditModeButton = $(`<a id="edit-mode"><i class="fas fa-cog"></i>${game.i18n.localize("hibern.chars.EditMode")}</a>`);
        EditModeButton.click(function() {
            actor.update({system: {EditModeOn: !actor.system.EditModeOn}});
            app.render();
        });
        title.after(EditModeButton);
    }
});

// Faire des calculs sur les stats modifiées automatiquement.
Hooks.on("updateActor", (actor, sysdiff, diffrender, id) => {
    if (actor.canUserModify(game.user, "update") && actor.type == "personnage") {
        if (diffrender.diff == true) {
            actor.update({
                system: {
                    PV: {
                        max: Math.floor((actor.system.CON.value+30))
                    },
                    WillPoints: {
                        max: actor.system.CON.value
                    },
                    lwready: (actor.system.PV.value <= actor.system.PV.max-CONFIG.hibern.ASSeuil)
                }
            }, {diff: false, render: true});
        }
    }
});

Hooks.on("renderTokenHUD", (app, html, data) => {
    const token = app?.object?.document;
    if (!token) return; 

    const far_right = $(`<div class="col far-right"></div>`);
    html.append(far_right);

    _addHudButton(html, token, game.i18n.localize("hibern.chars.Esquive"), 'wing', "far-right",
    (event)=>{ _rollEsq("Esquive", token) });

    _addHudButton(html, token, game.i18n.localize("hibern.chars.Parade"), 'sword', "far-right",
    (event)=>{ _rollEsq("Parade", token) });
});

//#endregion

//#region Proccessors

function _processDiffOptions(form) {
    try {
        return {
            Diff: parseInt(form.Diff.value),
            AffectFatigue: form.AffectFatigue.checked
        }
    } catch(err) {
        return {
            Diff: parseInt(form.Diff.value)
        }
    }
}

function _processWeaponOptions(form) {
    return {
        Diff: parseInt(form.Diff.value),
        Stat: parseInt(form.Stat.value)
    }
}

function _processEsquiveOptions(form) {
    return {
        Seuil: parseInt(form.Seuil.value)
    }
}

//#endregion

//#region fonctions pratiques

function _addHudButton(html, selectedToken, title, icon, position, clickEvent) {
    if (!selectedToken) return;
    const button = $(`<div class="control-icon" title="${title}"><img src="icons/svg/${icon}.svg" width="36" height="36"></div>`);
    button.click(clickEvent);
    const column = `.col.${position}`;
    html.find(column).append(button);
}

function IsSpellAS(actor, spell) {
    if (IsCharInAS(actor) && spell.system.AS == true)
        return true;
    return false;
}

function IsCharInAS(actor) {
    return (actor.system.PV.value <= actor.system.PV.max-CONFIG.hibern.ASSeuil);
}

// type, actor, item_id
function lowerAllOtherFatigue(type, actor, item_id) {
    let object_array = actor.items.filter(function (item) {return item.type == type});

    object_array.filter(obj => obj._id != item_id).forEach(object => {
        if (object.system.Fatigue <= 0)
            return;
        const ftg = object.system.Fatigue -= 1;
        object.update({
            system: {
                Fatigue: ftg
            }
        }, {diff: false, render: true});
    });
}

function getAdjustedDiff(baseDiffNum, ftg) {
    let newDiff = baseDiffNum;
    const diffKey = getKeyByValue(CONFIG.hibern.rolldiff, newDiff);
    if (ftg >= 7) {
        switch (diffKey) {
            case "veryeasy":
                newDiff += CONFIG.hibern.rolldiff.hard - CONFIG.hibern.rolldiff.veryeasy;
                break;
            case "easy":
                newDiff += CONFIG.hibern.rolldiff.veryhard - CONFIG.hibern.rolldiff.easy;
                break;
            default:
                newDiff = CONFIG.hibern.rolldiff.veryhard;
                break;
        }
    } else if (ftg >= 5) {
        switch (diffKey) {
            case "veryeasy":
                newDiff += CONFIG.hibern.rolldiff.normal - CONFIG.hibern.rolldiff.veryeasy;
                break;
            case "hard":
                newDiff = CONFIG.hibern.rolldiff.veryhard;
                break;
            case "veryhard":
                break;
            default:
                newDiff += CONFIG.hibern.rolldiff.hard - CONFIG.hibern.rolldiff.easy;
                break;
        }
    } else if (ftg >= 3) {
        switch (diffKey) {
            case "veryeasy":
                newDiff += CONFIG.hibern.rolldiff.easy - CONFIG.hibern.rolldiff.veryeasy;
                break;
            case "veryhard":
                break;
            default:
                newDiff += CONFIG.hibern.rolldiff.normal - CONFIG.hibern.rolldiff.easy;
                break;
        }
    }
    return newDiff;
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

//#endregion

//#region Esquive et autre

async function GetEsquiveRollOptions(type) {
    const template = "systems/hibern/templates/partials/esquive-dialog.hbs";
    const html = await renderTemplate(template);

    return new Promise(resolve => {
        const data = {
            title: game.i18n.localize(`hibern.chars.${type}`),
            content: html,
            buttons: {
                normal: {
                    label: game.i18n.localize(`hibern.Divers.Accepter`),
                    callback: html => resolve(_processEsquiveOptions(html[0].querySelector("form")))
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

async function _rollEsq(type, token) {
    const actor = token._actor;
    const checkOptions = await GetEsquiveRollOptions(type);
    if (checkOptions.cancelled)
        return;
    const stat = (type == "Esquive") ? actor.system.DEX.value : actor.system.CON.value;

    let rollResult = new Roll(`1d20`);
    rollResult = await rollResult.evaluate({async:true});

    let successtype;
    let localRes;
    if (rollResult._total == 20) {
        successtype = "CritSuccess";
    } else if (rollResult._total+stat >= checkOptions.Seuil-stat) {
        successtype = "Success";
    } else if (rollResult._total == 1) {
        successtype = "CritFailure";
    } else {
        successtype = "Failure";
    }
    localRes = successtype;
    
    let rollResult2 = rollResult._total+stat;

    let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker()
    };
    let cardData = {
        rollResult: rollResult2,
        Successtype: successtype,
        localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`),
        type: game.i18n.localize(`hibern.chars.${type}`)
    }

    chatData.content = await renderTemplate("systems/hibern/templates/partials/esquive-card.hbs", cardData);
    return rollResult.toMessage(chatData);
}

//#endregion

//#region combat tracker

Hooks.on("renderCombatTracker", async (tracker, html, data) => {
    let currentToken;
    let currentCombatant;
    try {
        currentToken = game.scenes.get(data.combat._source.scene).tokens.get(data.combat.current.tokenId);
        currentCombatant = tracker.viewed.combatants.get(tracker.viewed.current.combatantId);
    } catch(err) {}
    if (data.combat == null || currentCombatant == null) {return;}
    const currentActor = game.actors.get(currentCombatant.actorId);

    if (currentActor.system.posture == "Normal" || currentActor.system.posture == "Aucune") {
        if (currentActor.canUserModify(game.user, "update")) {
            currentActor.update({system: {posture: "Base"}});
            CONFIG.hibern.socket.executeForEveryone("RenderTracker");
        }
    }

    if (currentActor.system.actionsUsed.Reaction == null)
    {
        if (currentActor.canUserModify(game.user, "update")) {
            await currentActor.update({
                system: {
                    actionsUsed: {
                        "Action": true,
                        "ActionSE": true,
                        "Move": true,
                        "ChangePosture": true,
                        "Esquiver": true,
                        "Parer": true,
                        "Reaction": true
                    }
                }
            });
            CONFIG.hibern.socket.executeForEveryone("RenderTracker");
        }
    }

    let sheetData = mergeObject(data, {
        actor: currentActor,
        token: currentToken,
        posturetooltip: game.i18n.localize(`hibern.chars.tooltipPosture${currentActor.system.posture}`),
        localPosture: game.i18n.localize(`hibern.chars.posture${currentActor.system.posture}`),
        currentPosture: currentActor.system.posture,
        usedActions: currentActor.system.actionsUsed
    });

    let RenderedHtml = await renderTemplate("systems/hibern/templates/partials/combat-tracker.hbs", sheetData);
    html.find("#combat-controls").before(RenderedHtml);

    html.find("#change-posture").change(async (event) => {
        const postureInput = event.currentTarget.closest("#change-posture").value;
        if (currentActor.canUserModify(game.user, "update")) {
            await currentActor.update({system: {posture: postureInput}});
        } 
        CONFIG.hibern.socket.executeForEveryone("RenderTracker");
    });

    html.find(".use-action").click(async (event) => {
        const actionUsed = event.currentTarget.closest(".use-action").dataset.type;
        if (currentActor.canUserModify(game.user, "update")) {
            await currentActor.update({system: {actionsUsed: {[actionUsed]: !currentActor.system.actionsUsed[actionUsed]}}});
        }
        CONFIG.hibern.socket.executeForEveryone("RenderTracker");
    });
});

// Reset les actions de tout les tokens présents dans le combat ainsi que leur posture à la base
Hooks.on("preDeleteCombat", (combat, rendering, id) => {
    combat.combatants.forEach(resetCombatant);
});

Hooks.on("combatRound", (combat, roundInfo, data) => {
    combat.combatants.forEach(resetCombatant);
});

async function resetCombatant(fighter) {
    let currentActor = game.actors.get(fighter.actorId);
    if (currentActor.canUserModify(game.user, "update")) {
        await currentActor.update({
            system: {
                actionsUsed: {
                    "Action": true,
                    "ActionSE": true,
                    "Move": true,
                    "ChangePosture": true,
                    "Esquiver": true,
                    "Parer": true,
                    "Reaction": true
                },
                posture: "Base"
            }
        });
        CONFIG.hibern.socket.executeForEveryone("RenderTracker");
    }
}

//#endregion