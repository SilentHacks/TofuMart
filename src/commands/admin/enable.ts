import {Message} from "discord.js";
import PrefixCommand from "../../structures/PrefixCommand";
import {switchCommand} from "./disable";


export default class EnableCommand extends PrefixCommand {
    constructor() {
        super("enable");
    }

    async exec(message: Message, args: string[]) {
        await switchCommand(message, args, true);
    }
}