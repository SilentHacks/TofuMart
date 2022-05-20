import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {helpEmbed} from "../utils/embeds";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
// import {commands} from "../index";


export default class HelpCommand extends SlashCommand {
    constructor() {
        super("help", "Find out what the commands do.");
    }

    async exec(interaction: CommandInteraction) {
        await interaction.reply({
            embeds: [helpEmbed()]
        });
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            // .addStringOption(option => {
            //     option.setName('command')
            //         .setDescription('The command to find out more about')
            //         .setRequired(false);
            //
            //     commands.forEach((value, key) => {
            //         option.addChoice(title(key), value.description);
            //     });
            //
            //     return option;
            // })
            .toJSON();
    }
}
