import {CommandInteraction, Message, MessageReaction, TextBasedChannel, User} from "discord.js";
import getConfig from "../utils/config";
import {Queue} from "../db/tables";
import {CurrencyId, currencyNames, delay} from "../utils/helpers";
import DB from "../db";
import {toNumber} from "lodash";

const config = getConfig();


const buyRegexes = {
    [`${CurrencyId.Opals}`]: /```(\d+) \bopals?\b```/i,
    [`$CurrencyId.Clovers}`]: /```(\d+) \bclovers?\b```/i,
    [`${CurrencyId.Gold}`]: /```(\d+) \bgolds?\b```/i
}


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

    private async getMessage(filter: (msg: Message) => boolean): Promise<Message | void> {
        const checkFilter = (reaction: MessageReaction, user: User) => {
            return (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === this.user.id;
        };

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

        if (message === undefined) return;

        try {
            const collected = await message.awaitReactions({filter: checkFilter, max: 1, time: 30000, errors: ['time']});
            if (collected.first()!.emoji.name === '❌') return await this.cancelTrade(message);
        } catch (e) {
            return;
        }

        await delay(2);
        message.react('✅').then();

        // Wait for it to go green
        if (!await waitForColor(this.interaction.channel!, message.id)) return await this.cancelTrade(message);

        return message;
    }

    public async claim(): Promise<void> {
        const user = await DB.getUser(this.user.id);
        if (!user || user.cards.length == 0) return await this.interaction.reply({content: 'You do not have any cards to claim.'});
        const cardCode = user.cards.pop();

        const check = `<@${this.user.id}>, would you like to accept \`${cardCode}\` from <@${config.botId}>?`;
        const filter = (msg: Message) => {
            return msg.channel.id == this.interaction.channel!.id && msg.author.id == config.tofuId
                && msg.content == check && msg.embeds.length == 1 && msg.embeds[0].title === 'Card Transfer';
        };

        await this.interaction.reply(`t!give <@${this.user.id}> ${cardCode}`);

        const message = await this.getMessage(filter);
        if (message === undefined) return;

        if (!await this.confirmTrade(message)) return;

        await DB.claimCard(this.user.id, user.cards.length);
    }

    public async use(): Promise<Queue | void> {
        await this.interaction.deferReply();

        const check = `<@${this.user.id}> → <@${config.botId}>`;
        const filter = (msg: Message) => {
            return msg.channel.id == this.interaction.channel!.id && msg.author.id == config.tofuId
                && msg.embeds.length == 1 && msg.embeds[0].title === 'Card Transfer' && msg.embeds[0].description!.includes(check);
        };

        const message = await this.getMessage(filter);
        if (message === undefined) return;

        if (!await this.confirmTrade(message)) return;

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

        const tradeMessage = await this.startTrade();
        if (tradeMessage === undefined) return;

        if (!await this.lockTrade(tradeMessage)) return;

        // Verify the content
        const content = tradeMessage.embeds[0].fields[1].value;

        const currency = toNumber(this.interaction.options.getString('currency', true));

        let amountMatch: RegExpMatchArray;
        if ((amountMatch = content.match(buyRegexes[currency])!) === null) {
            await this.interaction.followUp(`<@${this.user.id}>, please only add \`${CurrencyId[currency]}\`.`);
            await delay(1.5);
            await tradeMessage.react('❌');
            return;
        }
        const amount = amountMatch[1];

        if (!await this.confirmTrade(tradeMessage)) return;

        // Wait for it to go green
        if (await waitForColor(this.interaction.channel!, tradeMessage.id)) {
            // Add the currencies
            this.interaction.followUp(`<@${this.user.id}>, exchanged \`${amount}\` **${CurrencyId[currency]}** to \`${amount}\` **${currencyNames[currency]}**.`)
                .then(() => DB.addToInv(this.user.id, toNumber(currency), toNumber(amount[1]))).then();
        } else await this.cancelTrade(tradeMessage);
    }

    public async sell(): Promise<void> {
        const currency = toNumber(this.interaction.options.getString('currency', true));
        const amount = this.interaction.options.getInteger('amount', true);

        // Check the user has enough
        const userInv = await DB.getInvItem(this.user.id, currency);
        if (userInv.amount < amount) return await this.interaction.reply(`<@${this.user.id}>, you do not have \`${amount}\` **${currencyNames[currency]}**.`);

        const tradeMessage = await this.startTrade();
        if (tradeMessage === undefined) return;

        await delay(1.5);
        await this.interaction.channel!.send(`${amount} ${CurrencyId[currency]}`);

        if (!await this.lockTrade(tradeMessage)) return;

        // Verify the content
        const content = tradeMessage.embeds[0].fields[0].value;

        const amountMatch = content.match(buyRegexes[currency])!;
        if (amountMatch === null || toNumber(amountMatch[1]) !== amount || tradeMessage.embeds[0].fields[1].value !== "```​```") {
            return await this.cancelTrade(tradeMessage, true);
        }

        if (!await this.confirmTrade(tradeMessage)) return;

        // Wait for it to go green
        if (await waitForColor(this.interaction.channel!, tradeMessage.id)) {
            // Add the currencies
            this.interaction.followUp(`<@${this.user.id}>, exchanged \`${amount}\` **${currencyNames[currency]}** to \`${amount}\` **${CurrencyId[currency]}**.`)
                .then(() => DB.addToInv(this.user.id, currency, -amount)).then();
        } else await this.cancelTrade(tradeMessage);
    }

    // Break down functions

    private async cancelTrade(tradeMessage: Message, error: boolean = false): Promise<void> {
        const message = error ? `<@${this.user.id}>, something went wrong. This trade is being canceled, please try again.` : `<@${this.user.id}>, the trade has been canceled.`
        await this.interaction.followUp(message)
        await delay(1.5);
        await tradeMessage.react('❌');
    }

    private async startTrade(): Promise<Message | void> {
        // const startCheck = `<@${this.user.id}>, would you like to trade with <@${config.tofuId}>?`;
        // const startCheck = `<@${config.tofuId}>, would you like to trade with <@${this.user.id}>?`;

        const startFilter = (msg: Message) => {
            return msg.channel.id == this.interaction.channel!.id && msg.author.id == config.tofuId // && msg.content == startCheck;
        }
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
            return (reaction.emoji.name === '☑️' || reaction.emoji.name === '❌') && user.id === this.user.id;
        };

        try {
            const collected = await tradeMessage.awaitReactions({filter: checkFilter, max: 1, time: 30000, errors: ['time']});
            if (collected.first()!.emoji.name === '❌') return await this.cancelTrade(tradeMessage);
        } catch (e) {
            return;
        }

        return tradeMessage;
    }

    private async lockTrade(tradeMessage: Message): Promise<boolean | void> {
        // Wait 2s and then add lock reaction
        await delay(1.5);
        await tradeMessage.react('🔒');

        // Wait for user to add lock
        const lockFilter = (reaction: MessageReaction, user: User) => {
            return (reaction.emoji.name === '🔒' || reaction.emoji.name === '❌') && user.id === this.user.id;
        };

        try {
            const collected = await tradeMessage.awaitReactions({filter: lockFilter, max: 1, time: 30000, errors: ['time']});
            if (collected.first()!.emoji.name === '❌') return await this.cancelTrade(tradeMessage);
        } catch (e) {
            return;
        }

        return true;
    }

    private async confirmTrade(tradeMessage: Message): Promise<boolean | void> {
        const confirmFilter = (reaction: MessageReaction, user: User) => {
            return (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && user.id === this.user.id;
        };

        try {
            const collected = await tradeMessage.awaitReactions({filter: confirmFilter, max: 1, time: 30000, errors: ['time']});
            if (collected.first()!.emoji.name === '❌') return await this.cancelTrade(tradeMessage);
        } catch (e) {
            return;
        }

        // Wait 2s and then add check reaction
        await delay(2);
        tradeMessage.react('✅').then();

        return true;
    }
}