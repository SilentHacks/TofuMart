import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {auctionEmbed, auctionListEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"
import {cooldown} from "../utils/decorators";

const {MessageAttachment} = require('discord.js');

export default class AuctionCommand extends SlashCommand {
    constructor() {
        super("auction", "View the list of auctions currently being held.");
    }

    @cooldown(10)
    async exec(interaction: CommandInteraction) {
        const slot = interaction.options.getInteger('slot');

        if (slot != null) {
            const auction = await DB.getAuction(slot);
            if (auction == null) {
                return await interaction.reply({
                    content: `There is no card in auction \`slot ${slot}\`.`,
                    ephemeral: true
                })
            }
            return await interaction.reply({
                embeds: [auctionEmbed(auction)]
            })
        }

        const auctions = await DB.getAuctions();
        const file = new MessageAttachment("./src/resources/auction.jpg");
        const embed = auctionListEmbed(auctions);

        await interaction.reply({
            embeds: [embed],
            files: [file]
        });
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addIntegerOption(integer => integer.setName('slot').setDescription('Slot number').setRequired(false).setMinValue(1).setMaxValue(10))
            .toJSON();
    }
}
