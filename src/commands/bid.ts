import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {bidEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"
import {client} from "../index";
import {currencyId} from "../utils/helpers";


export default class BidCommand extends SlashCommand {
    constructor() {
        super("bid", "Bid on a card in the auctions.");
    }

    async exec(interaction: CommandInteraction) {
        const slot = interaction.options.getInteger('slot')!;
        const amount = interaction.options.getInteger('amount')!;

        let auction = await DB.getAuction(slot);
        if (auction == null) {
            return await interaction.reply({
                content: `There is no card in auction \`slot ${slot}\`.`,
                ephemeral: true
            })
        }

        const embed = bidEmbed(auction, interaction.user.id, amount);

        await interaction.reply({
            embeds: [embed]
        });

        auction = await DB.placeBid(slot, interaction.user.id, amount);

        if (interaction.user.id != auction.current_bidder) {
            const user = await client.users.fetch(auction.current_bidder);
            const newAuction = await DB.getAuction(slot);
            if (newAuction == null) {
                return await interaction.reply({
                    content: `There is no card in auction \`slot ${slot}\`.`,
                    ephemeral: true
                })
            }
            const message = (`You have been outbid by <@${newAuction.current_bidder}> with a bid of **${newAuction.current_bid} ${currencyId[newAuction.currency_id]}** on ${newAuction.card_details}!`)
            await user.send(message);
        }
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addIntegerOption(integer => integer.setName('slot').setDescription('Slot number').setRequired(true).setMinValue(1).setMaxValue(10))
            .addIntegerOption(integer => integer.setName('amount').setDescription('Bid amount').setRequired(true).setMinValue(1).setMaxValue(10_000_000))
            .toJSON();
    }
}
