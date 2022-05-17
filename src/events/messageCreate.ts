import {Message} from "discord.js";
import {adminCommands} from '..';
import Event from '../structures/Event';
import getConfig from "../utils/config";
import createLogger from '../utils/logger';

const config = getConfig();


export default class PrefixCommandHandler extends Event {
    constructor() {
        super('PrefixCommand', 'messageCreate');
    };

    async exec(message: Message) {
        if (
            message.author.bot ||
            !message.guild ||
            !config.admins.includes(message.author.id) ||
            !message.content.toLowerCase().startsWith(config.prefix)
        )
            return;

        const [cmd, ...args] = message.content
            .slice(config.prefix.length)
            .trim()
            .split(/ +/g);

        const command = adminCommands.get(cmd.toLowerCase());

        if (!command) return;

        try {
            command.exec(args);
        } catch (error) {
            const cmdLogger = createLogger(command.name);
            cmdLogger.error(`Failed to run command ${command.name}:`, error);
            cmdLogger.error(`Command ran by ${message.author.tag} (${message.author.id}) in ${message.guild?.name ?? 'Not in guild'} (${message.guild?.id ?? 'N/A'})`);
        }
    }
}