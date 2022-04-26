import {Collection, CommandInteraction, Message, MessageReaction, User} from "discord.js";
import getConfig from "../utils/config";
import {Queue} from "../db/tables";
import {delay} from "../utils/helpers";

const config = getConfig();

export default class Trader {
    private user: User;

    constructor(private interaction: CommandInteraction) {
        this.user = interaction.user;
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
        const startCheck = `<@${config.tofuId}>, would you like to trade with <@${this.user.id}>?`;

        const startFilter = (msg: Message) => {
            return msg.channel.id == this.interaction.channel!.id && msg.author.id == config.tofuId // && msg.content == startCheck;
        };
        let tradeMessage: Message;

        await this.interaction.reply({content: `t!mt <@${this.user.id}>`});

        try {
            const collected = await this.interaction.channel!.awaitMessages({filter: startFilter, max: 1, time: 30000, errors: ['time']});
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
    }

    public async use(): Promise<Queue | void> {
        await this.interaction.deferReply();

        const filter = (msg: Message) => {
            return msg.channel.id == this.interaction.channel!.id && msg.author.id == config.tofuId;
        };

        let collected: Collection<string, Message>;
        try {
            collected = await this.interaction.channel!.awaitMessages({filter, max: 1, time: 30000, errors: ['time']});
        } catch (e) {
            return;
        }

        // console.log(collected);

        return {
            id: NaN,
            owner_id: this.user.id,
            card_code: Buffer.from(Math.random().toString()).toString("base64").substring(10, 5),
            card_details: 'bunch of random garble',
            image_url: collected.first()?.embeds[0].image?.url!,
            duration: null,
            currency_id: NaN,
            start_price: NaN,
            market: false
        };
    }
}