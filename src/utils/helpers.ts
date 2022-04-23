import {User} from "discord.js";
import {client} from "../index";

export enum CurrencyId {
    Opals = 0,
    Gold,
    Clovers,
    Keys
}

export const currencyEmotes: Record<number, string> = {
    [CurrencyId.Opals]: ":opals:",
    [CurrencyId.Gold]: ":gold:",
    [CurrencyId.Clovers]: ":four_leaf_clover:",
    [CurrencyId.Keys]: ":key:"
}

export async function sendMessage(user: User | string, message: string) {
    try {
        if (typeof user === 'string') user = await client.users.fetch(user);
        await user.send(message);
    } catch {
    }
}
