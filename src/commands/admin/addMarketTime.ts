import {Message} from "discord.js";
import DB from "../../db"
import PrefixCommand from "../../structures/PrefixCommand";
import {parseAddTimeArgs} from "./addAuctionTime";


export default class AddMarketTimeCommand extends PrefixCommand {
    constructor() {
        super("addmarkettime");
    }

    async exec(message: Message, args: string[]) {
        const parsedArgs = parseAddTimeArgs(args);
        if (parsedArgs === undefined) return;

        const {amount, timeUnit, auctionId} = parsedArgs;

        await DB.addTime(amount, timeUnit, true, auctionId);
        await message.reply(`Added \`${amount}\` **${timeUnit}** to market \`${auctionId ?? 'all'}\`.`)
    }
}
