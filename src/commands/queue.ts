import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {queueEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"
import {Paginator} from "../structures/Paginator";


export default class QueueCommand extends SlashCommand {
    constructor() {
        super("queue", "View the queue of cards to be auctioned.");
    }

    async exec(interaction: CommandInteraction) {
        const queue = await DB.getQueue();
        if (queue.length == 0) return await interaction.reply({content: "There are no cards in the queue currently."});

        await new Paginator(interaction, queue, undefined, undefined, undefined, queueEmbed(interaction.user.id)).paginate()
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .toJSON();
    }
}
