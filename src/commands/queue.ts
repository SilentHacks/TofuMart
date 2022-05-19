import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {queueEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"
import {Paginator} from "../structures/Paginator";
import {cooldown} from "../utils/decorators";


export default class QueueCommand extends SlashCommand {
    constructor() {
        super("queue", "View the queue of cards for the auctions/market.");
    }

    @cooldown(10)
    async exec(interaction: CommandInteraction) {
        const market = interaction.options.getSubcommand() == 'market';
        const queue = await DB.getQueue(market);
        if (queue.length == 0) return await interaction.reply({content: `There are no cards in the ${interaction.options.getSubcommand()} queue currently.`});

        await new Paginator(interaction, queue, undefined, undefined, undefined, queueEmbed(interaction.user.id, market)).paginate()
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand(subcommand =>
                subcommand
                    .setName('auction')
                    .setDescription('View the queue of cards to be auctioned'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('market')
                    .setDescription('View the queue of cards for the market'))
            .toJSON();
    }
}
