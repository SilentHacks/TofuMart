import {Message} from "discord.js";
import DB from "../../db"
import PrefixCommand from "../../structures/PrefixCommand";
import {toNumber} from "lodash";
import {CurrencyId, currencyNames} from "../../utils/helpers";


export default class AddCommand extends PrefixCommand {
    constructor() {
        super("add");
    }

    async exec(message: Message, args: string[]) {
        if (args.length < 2) return;

        const amount = toNumber(args.shift());

        if (amount === 0) return;

        const itemName = args.join(' ').toLowerCase();

        let itemId: number;

        switch (itemName) {
            case 'opal':
            case 'opals':
            case 'token':
            case 'tokens':
                itemId = CurrencyId.Opals; break;

            case 'gold':
            case 'cookie':
            case 'cookies':
                itemId = CurrencyId.Gold; break;

            case 'clover':
            case 'clovers':
            case 'brick':
            case 'bricks':
                itemId = CurrencyId.Clovers; break;

            case 'key':
            case 'keys':
                itemId = CurrencyId.Keys; break;

            case 'slot':
            case 'slots':
                itemId = CurrencyId.Slots; break;

            default:
                await message.reply(`<@${message.author.id}>, **${itemName}** could not be found.`)
                return;
        }

        await DB.addToInv(message.author.id, itemId, amount);
        await message.reply(`<@${message.author.id}>, added \`${amount}\` **${currencyNames[itemId]}**.`)
    }
}
