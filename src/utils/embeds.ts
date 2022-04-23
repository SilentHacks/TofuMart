import Discord from 'discord.js';
import getConfig from './config';
import {Auctions, Inventory} from "../db/tables";
import {currencyEmotes, CurrencyId} from "./helpers";

const config = getConfig();


export const errorEmbed = (title = "", description = "") =>
    new Discord.MessageEmbed({...config.embeds.fail, title, description})

const makeAuctionDesc = (auction: Auctions) => {
    const char = auction.quick ? "a" : auction.id;
    const currency = CurrencyId[auction.currency_id];
    const emote = currencyEmotes[auction.currency_id];
    const unixTime = Math.floor(auction.end_time.getTime() / 1000);
    let endTime = new Date() > auction.end_time ? "**Ended**" : `<t:${unixTime}:R>`;

    return `${emote} **${char}** · \`${auction.current_bid} ${currency}\` by <@${auction.current_bidder}> - ${endTime}\n`;
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

export const invEmbed = (userId: string, userInv: Array<Inventory>) => {
    let description = `Showing <@${userId}>'s inventory\n\n`;
    for (let row of userInv) {
        description += `${currencyEmotes[row.item_id]} · **${row.amount}** · \`${CurrencyId[row.item_id]}\`\n`
    }

    return new Discord.MessageEmbed({
        ...config.embeds.primary,
        title: "Inventory",
        description: description
    })
}
