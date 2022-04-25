import SlashCommand from "../structures/Command";
import {Client, CommandInteraction} from "discord.js";
import {SlashCommandBuilder} from "@discordjs/builders";
import {RESTPostAPIApplicationCommandsJSONBody} from "discord-api-types";
import Trader from "../structures/Trader";


export default class BuyCommand extends SlashCommand {
    constructor() {
        super("buy", "Convert Tofu currency to TofuMart items.");
    }

    async exec(interaction: CommandInteraction) {
        await (new Trader(interaction)).buy();
    }

    build(client: Client): SlashCommandBuilder | RESTPostAPIApplicationCommandsJSONBody {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .toJSON();
    }
}
