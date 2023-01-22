Hooks.on("renderCombatTracker", async (tracker, html, data) => {
    $("#combat-popout").css("height", "initial");
    $("#combat-popout").css("max-height", "650px");

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

    const cusPost = currentActor.items.filter(function (item) {return (item.type == "Capacité" && item.system.PostureCustom == true)});
    const currentCustomPost = currentActor.items.filter(function (item) {return (item._id == currentActor.system.posture)})[0];
    let isCustomPosture = (CONFIG.hibern.corePostures.includes(currentCustomPost?.name)) ? false : true;
    if (currentCustomPost?.name == undefined) {isCustomPosture = false;}

    let sheetData = mergeObject(data, {
        actor: currentActor,
        token: currentToken,
        posturetooltip: (isCustomPosture) ? currentCustomPost.system.Description : game.i18n.localize(`hibern.chars.tooltipPosture${currentActor.system.posture}`),
        localPosture: (isCustomPosture) ? currentCustomPost.name : game.i18n.localize(`hibern.chars.posture${currentActor.system.posture}`),
        currentPosture: currentActor.system.posture,
        usedActions: currentActor.system.actionsUsed,
        PosturesCustom: cusPost
    });

    let RenderedHtml = await renderTemplate("systems/hibern/templates/partials/combat-tracker.hbs", sheetData);
    html.find("#combat-tracker").after(RenderedHtml);

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

// Reset aussi mais à la fin du round au lieu de quand le combat se termine.
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