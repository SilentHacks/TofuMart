import {Client, ClientOptions} from "discord.js";

export default class CustomClient extends Client {
    constructor(
        options: ClientOptions,
        public exchangeEnabled = true,
        public buyEnabled = true,
        public useEnabled = true,
        public bidEnabled = true,
        public claimEnabled = true
        ) {
        super(options);
    }
}