import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import getConfig from "../utils/config";
import {Market} from "../db/tables";
import DB from "../db";
import {buyEmbed, buyKeySlotEmbed} from "../utils/embeds";
import Confirmation from "../structures/Confirmation";
import {commandDisabled, CurrencyId, currencyNames, sendMessage} from "../utils/helpers";
import {toNumber, toString} from "lodash";
import {client} from "../index";
import {maxConcurrency} from "../utils/decorators";

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


const keySlotCheckFunc = (userId: string, currency: number, price: number): () => Promise<boolean> => {
    return async (): Promise<boolean> => {
        const userInv = await DB.getInvItem(userId, currency);
        return userInv.amount >= price;
    }
}


export default class BuyCommand extends SlashCommand {
    constructor() {
        super("buy", "Buy items from TofuMart.");
    }

    async buyCard(interaction: CommandInteraction) {
        const slot = interaction.options.getInteger('slot', true);

        const card = await DB.getMarketCard(slot);
        if (card == null) return await interaction.reply({content: `There is no card in market \`slot ${slot}\`.`, ephemeral: true});

        const embed = buyEmbed(card, interaction.user.id);
        const passDesc = "You have successfully purchased that card.";
        const failDesc = "You do not have enough to purchase that card.";
        const cancelDesc = "Your purchase was canceled.";

        if (await new Confirmation(interaction, checkFunc(card, interaction.user.id), passDesc, failDesc, cancelDesc, {embed: embed}).confirm()) {
            const {fee, shop} = await DB.purchaseCard(card, interaction.user.id);
            await sendMessage(card.owner_id,
                `Congrats, your card ${card.card_details} in **Slot ${card.id}** of the market sold! 
                    A fee of \`${shop.fee}% = ${fee}\` was applied, giving you \`${card.price - fee}\` **${currencyNames[card.currency_id]}**.`
            );
        }
    }

    async buyKeySlot(interaction: CommandInteraction) {
        const type = interaction.options.getSubcommand(true) === 'key' ? CurrencyId.Keys : CurrencyId.Slots;
        const shop = await DB.getShop(type);

        const currency = toNumber(interaction.options.getString('currency', true));
        const amount = interaction.options.getInteger('amount') ?? 1;
        const price = shop.price[toString(currency)] * amount;

        const userInv = await DB.getInvItem(interaction.user.id, currency);
        if (userInv.amount < price) return await interaction.reply(`<@${interaction.user.id}>, you do not have \`${price}\` **${currencyNames[currency]}**`);

        const embed = buyKeySlotEmbed(interaction.user.id, amount, interaction.options.getSubcommand(true), currency, price);
        const passDesc = "The purchase was successful.";
        const failDesc = "You do not have enough to make that purchase.";
        const cancelDesc = "Your purchase was canceled.";

        if (await new Confirmation(interaction, keySlotCheckFunc(interaction.user.id, currency, price), passDesc, failDesc, cancelDesc, {embed: embed}).confirm()) {
            await DB.purchaseKeySlot(interaction.user.id, amount, currency, shop.id, price);
        }

    }

    @maxConcurrency
    async exec(interaction: CommandInteraction) {
        if (!client.buyEnabled) return await commandDisabled(interaction);

        switch (interaction.options.getSubcommand(true)) {
            case 'card':
                await this.buyCard(interaction); break;
            case 'key':
            case 'slot':
                await this.buyKeySlot(interaction); break;
        }
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand(subcommand =>
                subcommand
                    .setName('card')
                    .setDescription('Buy cards from the market')
                    .addIntegerOption(integer => integer.setName('slot').setDescription('Market slot number').setRequired(true).setMinValue(1).setMaxValue(config.numMarket)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('key')
                    .setDescription('Buy a key to list cards in the auctions')
                    .addStringOption(option =>
                        option.setName('currency')
                            .setDescription('The currency to use to make the purchase')
                            .setRequired(true)
                            .addChoice('Tokens', `${CurrencyId.Opals}`)
                            .addChoice('Cookies', `${CurrencyId.Gold}`)
                            .addChoice('Bricks', `${CurrencyId.Clovers}`))
                    .addIntegerOption(integer => integer.setName('amount').setDescription('The number of keys to buy').setRequired(false).setMinValue(1).setMaxValue(100)))

            .addSubcommand(subcommand =>
                subcommand
                    .setName('slot')
                    .setDescription('Buy a slot to list cards in the market')
                    .addStringOption(option =>
                        option.setName('currency')
                            .setDescription('The currency to use to make the purchase')
                            .setRequired(true)
                            .addChoice('Tokens', `${CurrencyId.Opals}`)
                            .addChoice('Cookies', `${CurrencyId.Gold}`)
                            .addChoice('Bricks', `${CurrencyId.Clovers}`))
                    .addIntegerOption(integer => integer.setName('amount').setDescription('The number of slots to buy').setRequired(false).setMinValue(1).setMaxValue(100)))
            .toJSON();
    }
}
