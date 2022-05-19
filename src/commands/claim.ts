import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import Trader from "../structures/Trader";
import {client} from "../index";
import {commandDisabled} from "../utils/helpers";


export default class ClaimCommand extends SlashCommand {
    constructor() {
        super("claim", "Claim the most recent card that you purchased/won.");
    }

    async exec(interaction: CommandInteraction) {
        if (!client.claimEnabled) return await commandDisabled(interaction);

        await (new Trader(interaction)).claim();
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .toJSON();
    }
}
