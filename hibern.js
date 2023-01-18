import { hibern } from "./module/config.js";
import HItem from "./module/HItem.js";
import HItemSheet from "./module/sheets/HItemSheet.js";
import HCharacterSheet from "./module/sheets/HCharacterSheet.js";
import HMarchandSheet from "./module/sheets/HMarchandSheet.js";
import * as HUD from "./module/HUD.js";

async function preloadHandlebarsTemplates() {
    const templatePaths = [
        "systems/hibern/templates/partials/stat-block.hbs",
        "systems/hibern/templates/partials/inventory-block.hbs",
        "systems/hibern/templates/partials/spell-block.hbs",
        "systems/hibern/templates/partials/abilities-block.hbs",
        "systems/hibern/templates/partials/header-block.hbs",
        "systems/hibern/templates/partials/test-card.hbs",
        "systems/hibern/templates/partials/machand-armes-block.hbs",
        "systems/hibern/templates/partials/machand-armures-block.hbs",
        "systems/hibern/templates/partials/machand-accessoires-block.hbs",
        "systems/hibern/templates/partials/machand-objets-block.hbs",
        "systems/hibern/templates/partials/machand-spells-block.hbs"
    ];
    return loadTemplates(templatePaths);
}

function registerHandlebarsHelpers() {
    Handlebars.registerHelper("EditMode", function(actor, content) {
        if (actor.system.EditModeOn == true){
            return content.fn(this);
        } else {
            return content.inverse(this);
        }
    });
    Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {

        switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    });
}

function registerSystemSettings() {

}

Hooks.once("init", function() {
    console.log("Hibernation | Initialized.");

    CONFIG.hibern = hibern;
    CONFIG.Item.documentClass = HItem;

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("hibern", HItemSheet, {makeDefault:true});

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("hibern", HCharacterSheet, {types:["personnage"], makeDefault:true});
    Actors.registerSheet("hibern", HMarchandSheet, {types:["marchand"], makeDefault:true});

    preloadHandlebarsTemplates();
    registerSystemSettings();
    registerHandlebarsHelpers();

    // Pour voir les hooks balancés
    //CONFIG.debug.hooks = true;

    CONFIG.Combat.initiative.formula = '1d20+@DEX.value';
});

Hooks.once("socketlib.ready", () => {
    hibern.socket = socketlib.registerSystem("hibern");
    hibern.socket.register("RenderTracker", RenderTracker);
});

function RenderTracker() {
    let tracker = game.combats.apps[0];
    tracker.render();
}