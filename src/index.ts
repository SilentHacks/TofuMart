import Discord from 'discord.js';
import CustomClient from "./structures/CustomClient";
import getConfig from './utils/config';
import * as dotenv from 'dotenv';
const nodeCleanup = require('node-cleanup');

dotenv.config();
const config = getConfig();

export const client = new CustomClient({
    intents: [
        'GUILD_MESSAGE_REACTIONS',
        'GUILD_MESSAGES',
        'GUILD_EMOJIS_AND_STICKERS',
        'GUILD_INTEGRATIONS',
        'DIRECT_MESSAGES',
        'GUILDS',
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    restTimeOffset: 0
});

import fs from 'fs';
import path from 'path';
import {discordLogger} from './utils/logger';

discordLogger.info('Loading all events...');
import Event from './structures/Event'

const eventsLoading = (async function loadEvents(dir = path.resolve(__dirname, "./events")) {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
        const fileDesc = fs.statSync(`${dir}/${file}`);

        if (fileDesc.isDirectory()) {
            await loadEvents(`${dir}/${file}`);
            continue;
        }

        const imported = await import(`${dir}/${file}`);
        const event: Event = new imported.default();
        event.register(client);
        discordLogger.info(`Loaded event ${event.name} (${event.event})`);
    }
})();

discordLogger.info("Loading all commands...");
import Command from './structures/Command';
import PrefixCommand from "./structures/PrefixCommand";

export const commands = new Discord.Collection<string, Command>();
export const adminCommands = new Discord.Collection<string, PrefixCommand>();
const cmdsLoading = (async function loadCommands(dir = path.resolve(__dirname, "./commands"), admin= false) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = `${dir}/${file}`
        const fileDesc = fs.statSync(filePath);

        if (fileDesc.isDirectory()) {
            await loadCommands(filePath, true);
            continue;
        }

        const loadedCommand = await import(filePath);
        const command: Command | PrefixCommand = new loadedCommand.default();

        if (admin) adminCommands.set(command.name, command as PrefixCommand);
        else commands.set(command.name, command as Command);

        discordLogger.info(`Loaded command ${command.name} from ${file}`);
    }
})();

nodeCleanup((exitCode?: number, signal?: string) => {
    if (signal === 'SIGINT')
        discordLogger.info('Shutting down...');
});

Promise.all([eventsLoading, cmdsLoading]).then(() => {
    discordLogger.info("Finished loading commands and events.");
    discordLogger.info(`Connecting to Discord...`);
    client.login(config.token).then();
});