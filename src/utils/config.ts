import {APIEmbed} from 'discord-api-types';
import createLogger from './logger';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const logger = createLogger('config');

export type DiscordBotConfig = {
    prefix: string,
    token: string,
    devGuild: string,
    botId: string,
    tofuId: string,
    numMarket: number,
    auctionDuration: number,
    marketDuration: number,
    admins: string[],
    embeds: {
        primary: APIEmbed
        fail: APIEmbed
        success: APIEmbed
    }
}

let configCache: DiscordBotConfig | null;
export default function getConfig(): DiscordBotConfig {
    if (configCache) return configCache;

    try {
        const configFileContents = fs.readFileSync(path.resolve(process.cwd(), 'config.yml'), 'utf8');
        const configFileYaml = yaml.load(configFileContents) as DiscordBotConfig;
        configFileYaml.token = process.env.TOKEN!;
        return configCache = configFileYaml;
    } catch (error) {
        logger.error(`Failed to load config.yml`, error);
        logger.error(`This error is fatal, and the bot will now exit.`);
        process.exit(1);
    }
}