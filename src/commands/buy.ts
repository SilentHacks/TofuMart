import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import Trader from "../structures/Trader";
import getConfig from "../utils/config";
import {Market} from "../db/tables";
import DB from "../db";
import {buyEmbed} from "../utils/embeds";
import Confirmation from "../structures/Confirmation";

const config = getConfig();


const checkFunc = (market: Market, userId: string): () => Promise<boolean> => {
    return async (): Promise<boolean> => {
        const newMarket = await DB.getMarketCard(market.id);

        if (newMarket == null || (market.card_code != newMarket.card_code) || (new Date() > newMarket.end_time))
            throw new Error("That card is no longer in the market.");

        if (new Date() > newMarket.end_time) throw new Error("That card has expired from the market.");

        let {amount: userAmount} = await DB.getInvItem(userId, newMarket.currency_id);
        return userAmount >= newMarket.price;
    }
}


const marketBuy = async (interaction: CommandInteraction, slot: number) => {
    const card = await DB.getMarketCard(slot);

    const embed = buyEmbed(card, interaction.user.id);
    const passDesc = "You have successfully purchased that card.";
    const failDesc = "You do not have enough to purchase that card.";
    const cancelDesc = "Your purchase was canceled.";

    if (await new Confirmation(interaction, checkFunc(card, interaction.user.id), passDesc, failDesc, cancelDesc, {embed: embed}).confirm()) {
        await DB.purchaseCard(card, interaction.user.id);
    }

}


export default class BuyCommand extends SlashCommand {
    constructor() {
        super("buy", "Convert Tofu currency to TofuMart items.");
    }

    async exec(interaction: CommandInteraction) {
        const slot = interaction.options.getInteger('slot');

        if (slot !== null) return await marketBuy(interaction, slot);

        await (new Trader(interaction)).buy();
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addIntegerOption(integer => integer.setName('slot').setDescription('Market slot number').setRequired(false).setMinValue(1).setMaxValue(config.numMarket))
            .toJSON();
    }
}
