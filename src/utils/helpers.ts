import {User} from "discord.js";
import {client} from "../index";

export enum currencyId {
    Opals,
    Gold,
    Clovers
}

export const currencyEmotes: Record<number, string> = {
    [currencyId.Opals]: ":opals:",
    [currencyId.Gold]: ":gold:",
    [currencyId.Clovers]: ":four_leaf_clover:"
}

export async function sendMessage(user: User | string, message: string) {
    try {
        if (typeof user === 'string') user = await client.users.fetch(user);
        await user.send(message);
    } catch {}
}
