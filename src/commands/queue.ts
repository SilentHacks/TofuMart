import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {invEmbed} from "../utils/embeds";
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
        // if (queue.length == 0) return await interaction.reply({content: "There are no cards in the queue currently."});

        const userInv = await DB.getInv(interaction.user.id);
        const embed = invEmbed(interaction.user.id, userInv);
        const embed2 = invEmbed(interaction.user.id, userInv);
        const embed3 = invEmbed(interaction.user.id, userInv);
        const embed4 = invEmbed(interaction.user.id, userInv);

        await new Paginator(interaction, [embed, embed2, embed3, embed4]).paginate()
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .toJSON();
    }
}
