import {SlashCommandBuilder} from '@discordjs/builders';
import {client, commands} from '..';
import Event from '../structures/Event';
import {discordLogger} from '../utils/logger';
import SlashCommand from '../structures/Command';
import {RESTPostAPIApplicationCommandsJSONBody} from 'discord-api-types';
import {ApplicationCommandData} from 'discord.js';
import getConfig from "../utils/config";
import DB, {pool} from "../db";
import {sendMessage} from "../utils/helpers";

const truthyFilter = <T>(x: T | false | undefined | "" | 0): x is T => !!x;
const config = getConfig();


function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function loop() {
    while (client.isReady()) {
        await auctionLoop();
        await delay(300000);
    }
}

async function auctionLoop() {
    console.log('Entered')
    const client = await pool.connect();

    // Check auction loop
    discordLogger.info('Fetching auctions...');
    const auctions = await DB.getFinishedAuctions(false, client);
    for (let auction of auctions) {
        try {
            client.query('BEGIN');

            // Give card to winner
            if (auction.current_bidder) {
                discordLogger.info(`Ending auction slot ${auction.id} - ${auction.card_code}`);
                await DB.endAuction(auction);
                await sendMessage(auction.current_bidder, 'Congrats you won the auction :smile:')
                await new Promise(r => setTimeout(r, 3000)); // Sleep 3 seconds
            }

            // Pop next card from queue into current auctions
            discordLogger.info('Checking queue...');
            const nextCard = await DB.getFromQueue(client);
            if (nextCard) {
                discordLogger.info(`Replacing auction with ${nextCard.card_code} from queue`);
                await DB.updateAuction(auction.id, nextCard, client);
                discordLogger.info('Updated auction')
            } else {
                discordLogger.info('No cards found in queue')
            }

            client.query('COMMIT');
        } catch (e) {
            client.query('ROLLBACK');
            throw e;
        }
    }

    client.release();
    discordLogger.info('Finished auction loop');
}

export default class ReadyEvent extends Event {
    constructor() {
        super('Ready', 'ready');
    };

    async exec() {
        discordLogger.info(`🤖 Logged in as ${client?.user?.tag}!`);
        discordLogger.info(`📊 Currently in ${client?.guilds.cache.size} guilds.`);

        if (['deploy', 'register', 'edit'].includes(process.argv[2])) {
            discordLogger.debug(`Fetching application...`);
            await client.application?.commands.fetch();
            discordLogger.debug(`Fetched ${client.application?.commands.cache.size} commands.`);
        }

        if (process.argv[2] === "deploy" || process.argv[2] === "register") {
            const deploy = process.argv[2] === "deploy";

            discordLogger.info(`${deploy ? "Deploying" : "Registering"} ${commands.size} commands...`);

            const commandsToDeploy =
                !deploy ? commands.filter(c => client.application?.commands.cache.some(cmd => cmd.name === c.name) === false).values()
                    : commands.values();

            for (const command of commandsToDeploy) {
                discordLogger.debug(`${deploy ? "Deploying" : "Registering"} command ${command.name}...`);
                await client.application?.commands.create(buildSlashCommand(command), config.devGuild);
                discordLogger.debug(`${deploy ? "Deployed" : "Registered"} command ${command.name}.`);
            }

            discordLogger.info(`${deploy ? "Deployed" : "Registered"} ${commands.size} commands.`);
        }

        if (process.argv[2] === 'edit') {
            const commandNames = process.argv.slice(3).map(cmd => cmd.toLowerCase());
            const commandsToEdit = commandNames.map(c => commands.get(c)).filter(truthyFilter);

            if (!commandsToEdit.length) {
                discordLogger.warn(`Edit option requires at least one valid command to edit.`);
                return;
            }

            discordLogger.info(`Editing ${commandsToEdit.length} commands...`);
            discordLogger.debug(commandsToEdit.map(cmd => cmd.name).join(', '));

            const dataForCommands = commandsToEdit.map(cmd => client.application?.commands.cache.find(c => c.name === cmd.name));

            for (const command of commandsToEdit) {
                const commandData = dataForCommands.find(c => c?.name === command.name);
                if (!commandData) {
                    discordLogger.warn(`Could not find command ${command.name}, registering it instead.`);
                    await client.application?.commands.create(buildSlashCommand(command));
                    discordLogger.info(`Registered command ${command.name}.`);
                } else {
                    discordLogger.debug(`Editing command ${command.name}...`);
                    await commandData.edit(buildSlashCommand(command) as ApplicationCommandData);
                    discordLogger.debug(`Edited command ${command.name}.`);
                }
            }
        }

        loop().then();
        // setInterval(loop, 300000);
    }
}

function buildSlashCommand(command: SlashCommand): RESTPostAPIApplicationCommandsJSONBody {
    let data = command.build(client);
    if (data instanceof SlashCommandBuilder) data = data.toJSON();

    return data;
}