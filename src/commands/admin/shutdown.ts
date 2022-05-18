import {Message} from "discord.js";
import DB from "../../db"
import PrefixCommand from "../../structures/PrefixCommand";
import {client} from "../../index";


export default class ShutdownCommand extends PrefixCommand {
    constructor() {
        super("shutdown");
    }

    async exec(message: Message, args: string[]) {
        await message.reply('Shutting down...')
        await DB.logShutdown();
        client.destroy();
    }

}
