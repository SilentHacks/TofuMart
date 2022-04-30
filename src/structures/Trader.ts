import {CommandInteraction, Message, MessageReaction, TextBasedChannel, User} from "discord.js";
import getConfig from "../utils/config";
import {Queue} from "../db/tables";
import {delay} from "../utils/helpers";
import DB from "../db";

const config = getConfig();


const waitForColor = async (channel: TextBasedChannel, msgId: string,
                            waitFor: number = 10, compareTo: string = '#00ff00'): Promise<boolean> => {
    const endTime = new Date().getTime() + (1000 * waitFor);
    let msg: Message;
    while (new Date().getTime() < endTime) {
        try {
            msg = await channel.messages.fetch(msgId);
        } catch (e) {
            return false;
        }

        if (msg.embeds[0].hexColor?.toLowerCase() === compareTo) {
            return true;
        }

        await delay(1);
    }

    return false;
}

export default class Trader {
    private user: User;

    constructor(private interaction: CommandInteraction) {
        this.user = interaction.user;
    }

    private async getMessage(filter: (msg: Message) => boolean): Promise<Message | undefined> {
        let message: Message;

        try {
            const collected = await this.interaction.channel!.awaitMessages({
                filter,
                max: 1,
                time: 10000,
                errors: ['time']
            });
            message = collected.first()!;
        } catch (e) {
            await this.interaction.editReply({content: 'The `give` message could not be found.'});
            return;
        }

        return message;
    }

    public async claim(): Promise<void> {
        const user = await DB.getUser(this.user.id);
        if (!user || user.cards.length == 0) return await this.interaction.reply({content: 'You do not have any cards to claim.'});
        const cardCode = user.cards.pop();

        await this.interaction.deferReply();

        const check = `<@${this.user.id}>, would you like to accept \`${cardCode}\` from <@${config.botId}>?`;
        const filter = (msg: Message) => {
            return msg.channel.id == this.interaction.channel!.id && msg.author.id == config.tofuId
                && msg.content == check && msg.embeds.length == 1 && msg.embeds[0].title === 'Card Transfer';
        };

        const checkFilter = (reaction: MessageReaction, user: User) => {
            return reaction.emoji.name === '☑️' && user.id === this.user.id;
        };

        await this.interaction.channel!.send(`t!give <@${this.user.id}> ${cardCode}`);

        const message = await this.getMessage(filter);
        if (message === undefined) return;

        try {
            await message.awaitReactions({filter: checkFilter, max: 1, time: 30000, errors: ['time']});
        } catch (e) {
            return;
        }

        await delay(2);
        await message.react('✅');

        await DB.claimCard(this.user.id, user.cards.length);
    }

    public async use(): Promise<Queue | void> {
        await this.interaction.deferReply();

        const check = `<@${this.user.id}> → <@${config.botId}>`;
        const filter = (msg: Message) => {
            return msg.channel.id == this.interaction.channel!.id && msg.author.id == config.tofuId
                && msg.embeds.length == 1 && msg.embeds[0].title === 'Card Transfer' && msg.embeds[0].description!.includes(check);
        };

        const checkFilter = (reaction: MessageReaction, user: User) => {
            return reaction.emoji.name === '☑️' && user.id === this.user.id;
        };

        const message = await this.getMessage(filter);
        if (message === undefined) return;

        try {
            await message.awaitReactions({filter: checkFilter, max: 1, time: 30000, errors: ['time']});
        } catch (e) {
            return;
        }

        await delay(2);
        await message.react('✅');

        const content = message.embeds[0].description!.split('\n\n')[1];
        const splitContent = content.split(' · ');

        return {
            id: NaN,
            owner_id: this.user.id,
            card_code: splitContent[0].slice(1, -1),
            card_details: splitContent.join(' · '),
            image_url: message.embeds[0].image!.url,
            duration: null,
            currency_id: NaN,
            start_price: NaN,
            market: false
        };
    }

    public async buy(): Promise<void> {
        // First, send a t!mt message
        // Wait for the user to hit the check
        // Hit the lock first a bit after this
        // Wait until the user hits the lock
        // Verify the content of the trade message
        // If it checks out, hit the checkmark
        // Check the embed for upto 10 seconds
        // If it goes green, the purchase was successful

        // const startCheck = `<@${this.user.id}>, would you like to trade with <@${config.tofuId}>?`;
        // const startCheck = `<@${config.tofuId}>, would you like to trade with <@${this.user.id}>?`;

        const startFilter = (msg: Message) => {
            return msg.channel.id == this.interaction.channel!.id && msg.author.id == config.tofuId // && msg.content == startCheck;
        };
        let tradeMessage: Message;

        await this.interaction.reply({content: `t!mt <@${this.user.id}>`});

        try {
            const collected = await this.interaction.channel!.awaitMessages({
                filter: startFilter,
                max: 1,
                time: 30000,
                errors: ['time']
            });
            tradeMessage = collected.first()!;
        } catch (e) {
            return;
        }

        // Wait for user to hit check

        const checkFilter = (reaction: MessageReaction, user: User) => {
            return reaction.emoji.name === '☑️' && user.id === this.user.id;
        };

        try {
            await tradeMessage.awaitReactions({filter: checkFilter, max: 1, time: 30000, errors: ['time']});
        } catch (e) {
            return;
        }

        // Wait 2s and then add lock reaction
        await delay(2);
        await tradeMessage.react('🔒');

        // Wait for user to add lock
        const lockFilter = (reaction: MessageReaction, user: User) => {
            return reaction.emoji.name === '🔒' && user.id === this.user.id;
        };

        try {
            await tradeMessage.awaitReactions({filter: lockFilter, max: 1, time: 30000, errors: ['time']});
        } catch (e) {
            return;
        }

        // Verify the content
        const content = tradeMessage.embeds[0].fields[1].value;

        // Wait 2s and then add check reaction
        await delay(2);
        await tradeMessage.react('✅');

        // Wait for it to go green
        if (await waitForColor(this.interaction.channel!, tradeMessage.id)) {
            // Add the currencies
            await DB.addToInv(this.user.id, 1, 1);
        }
    }
}