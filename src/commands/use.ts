import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {invEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"
import {CurrencyId} from "../utils/helpers";
import Trader from "../structures/Trader";


export default class UseCommand extends SlashCommand {
    constructor() {
        super("use", "Use a key to list your card.");
    }

    async exec(interaction: CommandInteraction) {
        const currencyId = parseInt(interaction.options.getString('currency', true));
        const startBid = (interaction.options.getInteger('start bid') ?? 1) - 1;

        const {amount: userInv} = await DB.getInvItem(interaction.user.id, CurrencyId.Keys);
        if (userInv < 1) return await interaction.reply({content: "You do not have any keys.", ephemeral: true});

        const card = await (new Trader(interaction)).use();
        if (!card) return;
        card.currency_id = currencyId;
        card.start_price = startBid;

        await DB.queueCard(card);
        await interaction.editReply({content: "Your card has been listed."});
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand(subcommand =>
                subcommand
                    .setName('key')
                    .setDescription('Use a key to add a card to the auctions')
                    .addStringOption(option =>
                        option.setName('currency')
                            .setDescription('The currency to list the card for')
                            .setRequired(true)
                            .addChoice('Opals', `${CurrencyId.Opals}`)
                            .addChoice('Gold', `${CurrencyId.Gold}`)
                            .addChoice('Clovers', `${CurrencyId.Clovers}`))
                    .addIntegerOption(integer => integer.setName('start').setDescription('The minimum bid for the auction').setRequired(false).setMinValue(0).setMaxValue(1_000_000)))
            .toJSON();
    }
}
