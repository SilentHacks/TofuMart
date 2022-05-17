import {Message} from "discord.js";

export default class PrefixCommand {
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    exec(message: Message, args?: string[]) {
        throw new Error("Method not implemented.");
    }
}