import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {marketEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"
import {Paginator} from "../structures/Paginator";


export default class MarketCommand extends SlashCommand {
    constructor() {
        super("market", "View the current market.");
    }

    async exec(interaction: CommandInteraction) {
        const market = await DB.getMarket();
        if (market.length == 0) return await interaction.reply({content: "There are no cards in the market currently."});

        await new Paginator(interaction, market, undefined, undefined, undefined, marketEmbed(interaction.user.id)).paginate()
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .toJSON();
    }
}
