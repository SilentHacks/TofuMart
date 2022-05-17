import {Message} from "discord.js";
import DB from "../../db"
import PrefixCommand from "../../structures/PrefixCommand";
import {toNumber} from "lodash";


export default class AddAuctionTimeCommand extends PrefixCommand {
    constructor() {
        super("addauctiontime");
    }

    async exec(message: Message, args: string[]) {
        const parsedArgs = parseAddTimeArgs(args);
        if (parsedArgs === undefined) return;

        const {amount, timeUnit, auctionId} = parsedArgs;

        await DB.addTime(amount, timeUnit, false, auctionId);
        await message.reply(`Added \`${amount}\` **${timeUnit}** to auction \`${auctionId ?? 'all'}\`.`)
    }
}


export const parseAddTimeArgs = (args: string[]) => {
    let auctionId: number | undefined;
    if (args.length === 3) {
        auctionId = toNumber(args.pop());
    }

    if (args.length !== 2) return;

    const unit = args.pop()!.toLowerCase();
    let timeUnit: string;
    if (unit.includes('day')) timeUnit = 'days';
    else if (unit.includes('hour')) timeUnit = 'hours';
    else if (unit.includes('minute')) timeUnit = 'minutes';
    else if (unit.includes('second')) timeUnit = 'seconds';
    else return;

    const amount = toNumber(args.pop());
    if (amount === 0) return;

    return {
        auctionId: auctionId,
        timeUnit: timeUnit,
        amount: amount
    }
}
