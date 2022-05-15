import {User} from "discord.js";
import {client} from "../index";

export enum CurrencyId {
    Opals = 0,
    Gold,
    Clovers,
    Keys,
    Slots
}

export const currencyEmotes: Record<number, string> = {
    [CurrencyId.Opals]: ":fish_cake:",
    [CurrencyId.Gold]: ":cookie:",
    [CurrencyId.Clovers]: ":bricks:",
    [CurrencyId.Keys]: ":key:",
    [CurrencyId.Slots]: ":bank:"
}

export const currencyNames: Record<number, string> = {
    [CurrencyId.Opals]: "Tokens",
    [CurrencyId.Gold]: "Cookies",
    [CurrencyId.Clovers]: "Bricks",
    [CurrencyId.Keys]: "Keys",
    [CurrencyId.Slots]: "Slots"
}

export const sendMessage = async (user: User | string, message: string) => {
    try {
        if (typeof user === 'string') user = await client.users.fetch(user);
        await user.send(message);
    } catch {
    }
}

export const delay = async (s: number) => new Promise(res => setTimeout(res, 1000 * s));

export const title = (str: string) => {
    let upper = true;
    let newStr = "";
    for (let i = 0, l = str.length; i < l; i++) {
        if (str[i] == " ") {
            upper = true;
            newStr += str[i];
            continue;
        }
        newStr += upper ? str[i].toUpperCase() : str[i].toLowerCase();
        upper = false;
    }

    return newStr;
}
