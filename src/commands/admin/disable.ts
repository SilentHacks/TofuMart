import {Message} from "discord.js";
import PrefixCommand from "../../structures/PrefixCommand";
import {client} from "../../index";


export default class DisableCommand extends PrefixCommand {
    constructor() {
        super("disable");
    }

    async exec(message: Message, args: string[]) {
        await switchCommand(message, args, false);
    }
}


export const switchCommand = async (message: Message, args: string[], switchTo: boolean) => {
        const command = args.pop()!.toLowerCase();

        switch (command) {
            case 'bid':
                client.bidEnabled = switchTo; break;
            case 'buy':
                client.buyEnabled = switchTo; break;
            case 'claim':
                client.claimEnabled = switchTo; break;
            case 'exchange':
                client.exchangeEnabled = switchTo; break;
            case 'use':
                client.useEnabled = switchTo; break;
            default:
                return await message.reply('Command not found.');
        }

        await message.reply(`${switchTo ? 'Enabled' : 'Disabled'} the **${command}** command.`);
    }