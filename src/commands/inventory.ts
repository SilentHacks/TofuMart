import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {invEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import DB from "../db/index"


export default class InventoryCommand extends SlashCommand {
    constructor() {
        super("inventory", "View the items in your inventory.");
    }

    async exec(interaction: CommandInteraction) {
        const userInv = await DB.getInv(interaction.user.id);

        const embed = invEmbed(interaction.user.id, userInv);

        await interaction.reply({
            embeds: [embed]
        });
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .toJSON();
    }
}
