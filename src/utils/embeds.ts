import Discord from 'discord.js';
import getConfig from './config';
import {Auctions, Inventory, Market, Queue} from "../db/tables";
import {currencyEmotes, CurrencyId} from "./helpers";

const config = getConfig();


export const errorEmbed = (title = "", description = "") =>
    new Discord.MessageEmbed({...config.embeds.fail, title, description})

const makeAuctionDesc = (auction: Auctions) => {
    const char = auction.quick ? "a" : auction.id;
    const currency = CurrencyId[auction.currency_id];
    const emote = currencyEmotes[auction.currency_id];
    const unixTime = Math.floor(auction.end_time.getTime() / 1000);
    const endTime = new Date() > auction.end_time ? "**Ended**" : `<t:${unixTime}:R>`;

    return `${emote} **${char}** · \`${auction.current_bid} ${currency}\` by <@${auction.current_bidder}> - ${endTime}\n`;
}

const makeMarketDesc = (market: Market) => {
    const currency = CurrencyId[market.currency_id];
    const emote = currencyEmotes[market.currency_id];
    const unixTime = Math.floor(market.end_time.getTime() / 1000);
    const endTime = new Date() > market.end_time ? "**Ended**" : `<t:${unixTime}:R>`;
    const sold = market.sold ? "**SOLD**" : endTime;

    return `${emote} **${market.id}** · Price: \`${market.price} ${currency}\` - ${sold}\n`;
}

export const auctionListEmbed = (auctions: Array<Auctions>, imageUrl = "auction.jpg") => {
    let description = "";

    for (let auction of auctions) {
        description += makeAuctionDesc(auction);
    }

    return new Discord.MessageEmbed({
        ...config.embeds.primary,
        title: "Auction List",
        description: description,
        image: {
            url: `attachment://${imageUrl}`,
        }
    })
}

export const auctionEmbed = (auction: Auctions) => {
    return new Discord.MessageEmbed({
        ...config.embeds.primary,
        title: `Auction - Slot ${auction.id}`,
        fields: [
            {
                name: "Owner",
                value: `Showing card owned by <@${auction.owner_id}>`,
                inline: false
            },
            {
                name: "Card",
                value: auction.card_details,
                inline: false
            },
            {
                name: "Bids",
                value: makeAuctionDesc(auction),
                inline: false
            }
        ],
        image: {
            url: auction.image_url,
        }
    })
}

export const bidEmbed = (auction: Auctions, userId: string, bidAmount: number) => {
    const description = `<@${userId}>, would you like to place a bid?\n
    Card: ${auction.card_details}
    Bid: ${currencyEmotes[auction.currency_id]} \`${bidAmount} ${CurrencyId[auction.currency_id]}\`\n\n`;

    return new Discord.MessageEmbed({
        ...config.embeds.primary,
        title: "Place bid",
        description: description,
        thumbnail: {
            url: auction.image_url
        }
    })
}

export const buyEmbed = (card: Market, userId: string) => {
    const description = `<@${userId}>, would you like to buy this card?\n
    Card: ${card.card_details}
    Price: ${currencyEmotes[card.currency_id]} \`${card.price} ${CurrencyId[card.currency_id]}\`\n\n`;

    return new Discord.MessageEmbed({
        ...config.embeds.primary,
        title: "Purchase bid",
        description: description,
        thumbnail: {
            url: card.image_url
        }
    })
}

export const invEmbed = (userId: string, userInv: Array<Inventory>) => {
    let description = `Items carried by <@${userId}>\n\n`;
    if (userInv.length == 0) description += "This inventory is empty";
    else
        for (let row of userInv) {
            description += `${currencyEmotes[row.item_id]} · **${row.amount}** · \`${CurrencyId[row.item_id]}\`\n`
        }

    return new Discord.MessageEmbed({
        ...config.embeds.primary,
        title: "Inventory",
        description: description
    })
}

export const queueEmbed = (userId: string, market: boolean) => {
    return (queue: Array<Queue>) => {
        let description = `Showing Queued ${market ? 'Market' : 'Auction'} Cards In Order\n\n`;
        let index = 1;
        for (let row of queue) {
            description += `**${index++}** · ${row.card_details} · ${market ? 'Price' : 'Staring bid'}: ` +
                `${row.start_price} ${currencyEmotes[row.currency_id]}${row.owner_id == userId ? ` · **OWNED**` : ''}\n`
        }

        return new Discord.MessageEmbed({
            ...config.embeds.primary,
            title: "Auction Queue",
            description: description
        })
    }
}

export const marketCardEmbed = (market: Market) => {
    return new Discord.MessageEmbed({
        ...config.embeds.primary,
        title: `Market - Slot ${market.id}`,
        fields: [
            {
                name: "Owner",
                value: `Showing card owned by <@${market.owner_id}>`,
                inline: false
            },
            {
                name: "Card",
                value: market.card_details,
                inline: false
            },
            {
                name: `Price`,
                value: makeMarketDesc(market),
                inline: false
            }
        ],
        image: {
            url: market.image_url,
        }
    })
}

export const marketEmbed = (userId: string) => {
    return (market: Array<Market>) => {
        const ended = new Date() > market[0].end_time;
        let description = "";
        let index = 1;
        for (let row of market) {
            description += `**${index++}** · ${row.card_details} · Price: ` +
                `${row.price} ${currencyEmotes[row.currency_id]}${row.sold ? " · **SOLD**" : ""}` +
                `${row.owner_id == userId ? ` · **OWNED**` : ''}\n`
        }

        return new Discord.MessageEmbed({
            ...config.embeds.primary,
            title: `Marketplace${ended ? " - Ended" : ""}`,
            description: description
        })
    }
}
