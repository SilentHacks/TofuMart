import {Client, ClientOptions, Collection} from "discord.js";

export default class CustomClient extends Client {
    public exchangeEnabled = true;
    public buyEnabled = true;
    public useEnabled = true;
    public bidEnabled = true;
    public claimEnabled = true;

    public commandCache: {[k: string]: Collection<string, number | boolean>} = {};

    constructor(options: ClientOptions) {
        super(options);
    }
}