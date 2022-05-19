import {client} from '..';
import Event from '../structures/Event';
import {discordLogger} from '../utils/logger';
import DB, {pool} from "../db";
import {currencyNames, delay, sendMessage} from "../utils/helpers";
import buildAuction from "../utils/imageBuilder";


const auctionLoop = async () => {
    if (!await DB.addShutdownTime()) return;

    const client = await pool.connect();

    // Check auction loop
    discordLogger.info('Fetching auctions...');
    const auctions = await DB.getFinishedAuctions(false, client);
    let buildImage = false;
    for (let auction of auctions) {
        try {
            client.query('BEGIN');

            // Give card to winner
            if (auction.current_bidder && !auction.sent_dm) {
                discordLogger.info(`Ending auction slot ${auction.id} - ${auction.card_code}`);
                const {fee, shop} = await DB.endAuction(auction);
                await sendMessage(auction.current_bidder,  // DM the winner
                    `Congrats, you won auction **Slot ${auction.id}**: ${auction.card_details} for \`${auction.current_bid}\` **${currencyNames[auction.currency_id]}**. Use \`/claim\` to claim it!`
                );
                await delay(1);
                await sendMessage(auction.owner_id,
                    `Congrats, your card ${auction.card_details} in **Slot ${auction.id}** of the auctions sold! 
                    A fee of \`${shop.fee}% = ${fee}\` was applied, giving you \`${auction.current_bid - fee}\` **${currencyNames[auction.currency_id]}**.`
                );
                await delay(1);
            }

            // Pop next card from queue into current auctions
            discordLogger.info('Checking queue...');
            const nextCard = await DB.getFromQueue(client);
            if (nextCard) {
                discordLogger.info(`Replacing auction with ${nextCard.card_code} from queue`);
                await DB.updateAuction(auction.id, nextCard, client);
                await sendMessage(nextCard.owner_id,
                    `Your card ${nextCard.card_details} is entering the auctions in **Slot ${nextCard.id}**!`
                );
                buildImage = true;
                discordLogger.info('Updated auction')
            } else {
                discordLogger.info('No cards found in queue')
            }

            client.query('COMMIT');
        } catch (e) {
            client.query('ROLLBACK');
            throw e;
        }
    }

    client.release();

    if (buildImage) {
        const auctions = await DB.getAuctions();
        const imageUrls = auctions.map(a => a.image_url);
        await buildAuction(imageUrls);
    }

    discordLogger.info('Finished auction loop');
}


const marketLoop = async () => {
    const numQueue = await DB.getNumQueue(true);
    if (numQueue < 1) return discordLogger.info('No cards in market queue');

    const tempCard = await DB.getMarketCard(0);
    if (tempCard && new Date() < tempCard.end_time) return discordLogger.info('Not time to refresh market');

    discordLogger.info('Refreshing market...');
    await DB.refreshMarket();
    discordLogger.info('Finished market loop');
}


export default class LoopEvent extends Event {
    constructor() {
        super('Ready', 'ready');
    };

    async exec() {
        const loopTime = 5; // Loop time in minutes

        while (client.isReady()) {
            await marketLoop();
            await auctionLoop();
            await delay(60 * loopTime);
        }
    }
}