export default class HItem extends Item {
    chatTemplate = {
        "Arme": "systems/hibern/templates/partials/arme-card.hbs",
        "Armure": "systems/hibern/templates/partials/armure-card.hbs",
        "Accessoire": "systems/hibern/templates/partials/accessoire-card.hbs",
        "Objet": "systems/hibern/templates/partials/objet-card.hbs",
    };

    async roll() {
        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };

        let cardData = {
            ...this.data,
            owner: this.actor.id
        };

        chatData.content = await renderTemplate(this.chatTemplate[this.type], cardData);
        return ChatMessage.create(chatData);
    }
}