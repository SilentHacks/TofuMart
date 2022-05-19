import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {marketCardEmbed, marketEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"
import {Paginator} from "../structures/Paginator";
import getConfig from "../utils/config";
import {cooldown} from "../utils/decorators";

const config = getConfig();


export default class MarketCommand extends SlashCommand {
    constructor() {
        super("market", "View the current market.");
    }

    @cooldown(10)
    async exec(interaction: CommandInteraction) {
        const slot = interaction.options.getInteger('slot');
        if (slot !== null) {
            const market = await DB.getMarketCard(slot);
            if (market == null) {
                return await interaction.reply({
                    content: `There is no card in market \`slot ${slot}\`.`,
                    ephemeral: true
                })
            }
            return await interaction.reply({
                embeds: [marketCardEmbed(market)]
            })
        }

        const market = await DB.getMarket();
        if (market.length == 0) return await interaction.reply({content: "There are no cards in the market currently."});

        await new Paginator(interaction, market, undefined, undefined, undefined, marketEmbed(interaction.user.id,)).paginate()
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addIntegerOption(integer => integer.setName('slot').setDescription('Slot number').setRequired(false).setMinValue(1).setMaxValue(config.numMarket))
            .toJSON();
    }
}
