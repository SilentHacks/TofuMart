import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import Trader from "../structures/Trader";
import {commandDisabled, CurrencyId} from "../utils/helpers";
import {client} from "../index";
import {maxConcurrency} from "../utils/decorators";


export default class ExchangeCommand extends SlashCommand {
    constructor() {
        super("exchange", "Exchange Tofu currency for TofuMart currency.");
    }

    @maxConcurrency
    async exec(interaction: CommandInteraction) {
        if (!client.exchangeEnabled) return await commandDisabled(interaction);

        const command = interaction.options.getSubcommand() as keyof Trader;
        await new Trader(interaction)[command]();
    }


    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand(subcommand =>
                subcommand
                    .setName('buy')
                    .setDescription('Convert Tofu currency into TofuMart currency')
                    .addStringOption(option =>
                        option.setName('currency')
                            .setDescription('The currency to buy')
                            .setRequired(true)
                            .addChoice('Tokens', `${CurrencyId.Opals}`)
                            .addChoice('Cookies', `${CurrencyId.Gold}`)
                            .addChoice('Bricks', `${CurrencyId.Clovers}`)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('sell')
                    .setDescription('Convert TofuMart currency into Tofu currency')
                    .addStringOption(option =>
                        option.setName('currency')
                            .setDescription('The currency to sell')
                            .setRequired(true)
                            .addChoice('Tokens', `${CurrencyId.Opals}`)
                            .addChoice('Cookies', `${CurrencyId.Gold}`)
                            .addChoice('Bricks', `${CurrencyId.Clovers}`))
                    .addIntegerOption(integer => integer.setName('amount').setDescription('The amount to sell').setRequired(true).setMinValue(1).setMaxValue(10_000_000)))
            .toJSON();
    }
}
