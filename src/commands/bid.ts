import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {bidEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"
import {currencyId, sendMessage} from "../utils/helpers";
import Confirmation from "../structures/Confirmation";
import {Auctions} from "../db/tables";
import moment from "moment";


function checkFunc(auction: Auctions, userId: string, bidAmount: number): () => Promise<boolean> {
    return async (): Promise<boolean> => {
        const newAuction = await DB.getAuction(auction.id);

        if (newAuction == null) throw new Error("There are no auctions at the moment.");
        if (auction.card_code != newAuction.card_code) throw new Error("That card is no longer in the auctions.");
        if (new Date() > newAuction.end_time) throw new Error("This auction has expired.");

        let {amount: userAmount} = await DB.getInvItem(userId, newAuction.currency_id);
        if (userId == newAuction.current_bidder) userAmount += newAuction.current_bid;

        const minRaise = (moment(new Date()).add(2, 'm').toDate()) >= auction.end_time ? 9 : 0

        if (bidAmount <= newAuction.current_bid + minRaise) {
            if (minRaise == 0) throw new Error("You must bid greater than the current bid.");
            else throw new Error("You must bid greater than the current bid + minimum raise.");
        } else if (userAmount < bidAmount) return false;

        return true;
    }
}


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
        const passDesc = "Your bid has been placed successfully.";
        const failDesc = "Your bid could not be placed.";
        const cancelDesc = "Your bid was not placed.";

        if (await new Confirmation(interaction, checkFunc(auction, interaction.user.id, amount), passDesc, failDesc, cancelDesc, {embed: embed}).confirm()) {
            auction = await DB.placeBid(slot, interaction.user.id, amount);

            if (interaction.user.id != auction.current_bidder) {
                const newAuction = await DB.getAuction(slot);
                if (newAuction == null) {
                    return await interaction.reply({
                        content: `There is no card in auction \`slot ${slot}\`.`,
                        ephemeral: true
                    })
                }
                const message = (`You have been outbid by <@${newAuction.current_bidder}> with a bid of **${newAuction.current_bid} ${currencyId[newAuction.currency_id]}** on ${newAuction.card_details}!`)
                await sendMessage(auction.current_bidder, message);
            }
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
