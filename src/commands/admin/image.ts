import {Message} from "discord.js";
import PrefixCommand from "../../structures/PrefixCommand";
import buildAuction from "../../utils/imageBuilder";


export default class ImageCommand extends PrefixCommand {
    constructor() {
        super("image");
    }

    async exec(message: Message, args: string[]) {
        await buildAuction();
        await message.reply('Rebuilt auction image.')
    }

}
