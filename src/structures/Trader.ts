import {Collection, CommandInteraction, Message, User} from "discord.js";
import getConfig from "../utils/config";
import {Queue} from "../db/tables";

const config = getConfig();

export default class Trader {
    private interaction: CommandInteraction;
    private user: User;

    constructor(interaction: CommandInteraction) {
        this.interaction = interaction;
        this.user = interaction.user;
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

        console.log(collected);

        return {
            id: NaN,
            owner_id: this.user.id,
            card_code: 'lmao',
            card_details: 'bunch of random garble',
            image_url: collected.first()?.embeds[0].image?.url!,
            duration: 360, // minutes
            currency_id: NaN,
            start_price: NaN
        };
    }
}