import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"
import {CurrencyId} from "../utils/helpers";
import Trader from "../structures/Trader";


export default class UseCommand extends SlashCommand {
    constructor() {
        super("use", "List your card in the auctions/market.");
    }

    async exec(interaction: CommandInteraction) {
        const currencyId = parseInt(interaction.options.getString('currency', true));
        let start = interaction.options.getInteger('start bid') ?? 1;
        const market = interaction.options.getSubcommand() == 'slot';

        if (!market) start--;

        const {amount: userInv} = await DB.getInvItem(interaction.user.id, CurrencyId.Keys);
        if (userInv < 1) return await interaction.reply({content: `You do not have any ${interaction.options.getSubcommand()}s.`, ephemeral: true});

        const card = await (new Trader(interaction)).use();
        if (!card) return;
        card.currency_id = currencyId;
        card.start_price = start;
        card.market = market;

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
                    .addIntegerOption(integer => integer.setName('start').setDescription('The minimum bid for the auction').setRequired(false).setMinValue(1).setMaxValue(1_000_000)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('slot')
                    .setDescription('Use a slot to add a card to the market')
                    .addStringOption(option =>
                        option.setName('currency')
                            .setDescription('The currency to list the card for')
                            .setRequired(true)
                            .addChoice('Opals', `${CurrencyId.Opals}`)
                            .addChoice('Gold', `${CurrencyId.Gold}`)
                            .addChoice('Clovers', `${CurrencyId.Clovers}`))
                    .addIntegerOption(integer => integer.setName('price').setDescription('The price to purchase the card').setRequired(true).setMinValue(1).setMaxValue(10_000_000)))
            .toJSON();
    }
}
