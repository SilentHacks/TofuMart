import {Auctions, Inventory, Market, Queue, Shop, Users} from "./tables";
import moment from "moment";
import getConfig from "../utils/config";
import {floor} from "lodash";
import {calcFee, CurrencyId} from "../utils/helpers";
import {bidLog, buyLog, claimLog, LogTypes, useLog} from "../utils/commandLogger";

const config = getConfig();
const {Pool} = require('pg');

export const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DB,
    password: process.env.PG_PASSWORD,
    port: 5432,
});

export default class DB {

    private static async fetchVal(query: string, values?: Array<any>, conn: any = pool): Promise<any> {
        const {rows: [value]} = await conn.query({
            text: query,
            values: values,
            rowMode: 'array',
        });
        return value[0];
    }

    private static async fetchRow(query: string, values?: Array<any>, conn: any = pool): Promise<any> {
        const {rows: [value]} = await conn.query(query, values);
        return value;
    }

    private static async fetch(query: string, values?: Array<any>, conn: any = pool): Promise<any> {
        const {rows} = await conn.query(query, values);
        return rows;
    }

    public static async getUser(userId: string): Promise<Users> {
        return await this.fetchRow('SELECT * FROM users WHERE user_id = $1', [userId]);
    }

    public static async getAuctions(): Promise<Array<Auctions>> {
        return await this.fetch('SELECT * FROM auctions ORDER BY id');
    }

    public static async getFinishedAuctions(quick: boolean = false, conn: any = pool): Promise<Array<Auctions>> {
        return await this.fetch('SELECT * FROM auctions WHERE CURRENT_TIMESTAMP >= end_time ORDER BY id', undefined, conn);
    }

    public static async getAuction(slot: number): Promise<Auctions> {
        return await this.fetchRow('SELECT * FROM auctions WHERE id = $1', [slot]);
    }

    public static async getFromQueue(conn: any = pool): Promise<Queue> {
        return await this.fetchRow('SELECT * FROM queue ORDER BY id LIMIT 1', undefined, conn);
    }

    public static async addProfit(amount: number, currencyId: number, conn: any = pool) {
        const column = CurrencyId[currencyId].toLowerCase().replace('s', '');
        await conn.query(`UPDATE bot_info SET ${column}_profit = ${column}_profit + $1`, [amount]);
    }

    public static async endAuction(auction: Auctions, conn: any = pool) {
        const shop: Shop = await this.fetchRow('SELECT * FROM shop WHERE id = $1', [CurrencyId.Keys]);
        const fee = calcFee(auction, shop);

        await conn.query('UPDATE users SET cards = array_append(cards, $1) WHERE user_id = $2', [auction.card_code, auction.current_bidder]);
        await conn.query('UPDATE inventory SET amount = amount + $1 WHERE user_id = $2 AND item_id = $3', [auction.current_bid - fee, auction.owner_id, auction.currency_id]);

        await this.addProfit(fee, auction.currency_id, conn);
        await conn.query('UPDATE auctions SET sent_dm = TRUE WHERE id = $1', [auction.id]);

        return {
            fee: fee,
            shop: shop
        }
    }

    public static async updateAuction(slot: number, nextCard: Queue, conn: any = pool) {
        await conn.query(
            "UPDATE auctions SET card_code = $1, currency_id = $2, current_bid = $3, " +
            "current_bidder = $4, end_time = $5, " +
            "image_url = $6, card_details = $7, owner_id = $8 WHERE id = $9",
            [nextCard.card_code, nextCard.currency_id, nextCard.start_price,
                config.botId, moment(new Date()).add(nextCard.duration, 'm').toDate(),
                nextCard.image_url, nextCard.card_details, nextCard.owner_id, slot]);
        await conn.query('DELETE FROM queue WHERE id = $1', [nextCard.id]);
    }

    public static async placeBid(slot: number, userId: string, guildId: string | null, amount: number): Promise<Auctions> {
        const client = await pool.connect();
        const auction = await this.fetchRow('SELECT * FROM auctions WHERE id = $1', [slot], client);

        try {
            await client.query('BEGIN')

            // Give the current bid amount back to the bidder
            await client.query(
                'UPDATE inventory SET amount = amount + $1 WHERE item_id = $2 AND user_id = $3 RETURNING amount',
                [auction.current_bid, auction.currency_id, auction.current_bidder]);

            // Remove the amount from the new bidder's inventory
            const bidInv = await this.fetchVal(
                'UPDATE inventory SET amount = amount - $1 WHERE user_id = $2 and item_id = $3 RETURNING amount',
                [amount, userId, auction.currency_id],
                client);

            // Set the bid to the new user's bid
            await client.query(
                'UPDATE auctions SET current_bid = $1, current_bidder = $2 WHERE card_code = $3',
                [amount, userId, auction.card_code]);

            // Extend the end_time by 2 minutes if bid made within the last 2 minutes
            let newEnd;
            if ((newEnd = moment(new Date()).add(2, 'm').toDate()) >= auction.end_time)
                await client.query('UPDATE auctions SET end_time = $1 WHERE card_code = $2', [newEnd, auction.card_code]);

            const desc = bidLog(slot, auction.card_code, amount, auction.currency_id, bidInv + amount, bidInv);
            await this.insertLog(userId, guildId, LogTypes.Bid, desc, client);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        return auction;
    }

    public static async getInv(userId: string): Promise<Array<Inventory>> {
        return await this.fetch('SELECT * FROM inventory WHERE user_id = $1 ORDER BY amount DESC', [userId]);
    }

    public static async getInvItem(userId: string, itemId: number): Promise<Inventory> {
        let inv: Inventory = await this.fetchRow('SELECT * FROM inventory WHERE user_id = $1 AND item_id = $2', [userId, itemId]);
        inv ??= {user_id: userId, item_id: itemId, amount: 0};

        return inv;
    }

    public static async getQueue(market: boolean): Promise<Array<Queue>> {
        return await this.fetch('SELECT * FROM queue WHERE market = $1 ORDER BY id', [market]);
    }

    public static async getNumQueue(market: boolean = false): Promise<number> {
        return await this.fetchVal('SELECT COUNT(*) FROM queue WHERE market = $1', [market]);
    }

    public static async queueCard(card: Queue, guildId: string) {
        await pool.query(
            'INSERT INTO queue(owner_id, card_code, card_details, image_url, duration, currency_id, start_price, market) ' +
            'VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
            [card.owner_id, card.card_code, card.card_details, card.image_url, card.duration, card.currency_id, card.start_price, card.market]);

        const desc = useLog(card.market, card.card_code, card.start_price, card.currency_id);
        await this.insertLog(card.owner_id, guildId, LogTypes.Use, desc);
    }

    public static async getMarket(): Promise<Array<Market>> {
        return await this.fetch('SELECT * FROM market ORDER BY id');
    }

    public static async getMarketCard(id: number): Promise<Market> {
        return await this.fetchRow('SELECT * FROM market WHERE id = $1', [id]);
    }

    public static async purchaseCard(card: Market, userId: string) {
        const client = await pool.connect();
        let fee: number;
        let shop: Shop;

        try {
            await client.query('BEGIN');

            await client.query('UPDATE market SET sold = TRUE WHERE id = $1', [card.id]);
            await client.query('INSERT INTO users(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [userId]);
            await client.query('UPDATE users SET cards = array_append(cards, $1) WHERE user_id = $2', [card.card_code, userId]);
            await client.query('UPDATE inventory SET amount = amount - $1 WHERE item_id = $2 AND user_id = $3', [card.price, card.currency_id, userId]);

            shop = await this.fetchRow('SELECT * FROM shop WHERE id = $1', [CurrencyId.Slots]);
            fee = calcFee(card, shop);
            await client.query('UPDATE inventory SET amount = amount + $1 WHERE item_id = $2 AND user_id = $3', [card.price - fee, card.currency_id, card.owner_id]);
            await this.addProfit(fee, card.currency_id, client);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        return {
            fee: fee,
            shop: shop
        };
    }

    public static async purchaseKeySlot(userId: string, guildId: string | null, amount: number, currencyId: number, itemId: number, price: number): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const amount: number = await this.fetchVal('UPDATE inventory SET amount = amount - $1 WHERE item_id = $2 AND user_id = $3 RETURNING amount',
                [price, currencyId, userId], client);
            await client.query('UPDATE inventory SET amount = amount + $1 WHERE item_id = $2 AND user_id = $3', [amount, itemId, userId]);

            const desc = buyLog(CurrencyId[itemId], amount, price, currencyId, amount + price, amount);
            await this.insertLog(userId, guildId, LogTypes.Buy, desc, client);

            await this.addProfit(price, currencyId, client);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    public static async refreshMarket(): Promise<void> {
        const client = await pool.connect();
        const nextRefresh = moment(new Date()).add(config.marketDuration, 'm').toDate();

        try {
            await client.query('BEGIN');

            await client.query('DELETE FROM market');
            await client.query('ALTER TABLE market ALTER COLUMN id RESTART');
            await client.query(
                'INSERT INTO market(card_code, currency_id, end_time, image_url, card_details, owner_id, price) ' +
                'SELECT card_code, currency_id, $1, image_url, card_details, owner_id, start_price FROM queue ' +
                'WHERE market = TRUE ORDER BY id LIMIT $2', [nextRefresh, config.numMarket]
            );
            await client.query('DELETE FROM queue WHERE card_code = ANY(SELECT card_code FROM market)');

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    public static async claimCard(userId: string, guildId: string, cardCode: string, index: number): Promise<void> {
        await pool.query('UPDATE users SET cards = cards[1:$1] WHERE user_id = $2', [index, userId]);

        const desc = claimLog(cardCode, index);
        await this.insertLog(userId, guildId, LogTypes.Claim, desc);
    }

    public static async addToInv(userId: string, itemId: number, amount: number): Promise<void> {
        await pool.query(
            'INSERT INTO inventory(user_id, item_id, amount) VALUES($1, $2, $3) ' +
            'ON CONFLICT(user_id, item_id) DO UPDATE ' +
            'SET amount = inventory.amount + EXCLUDED.amount', [userId, itemId, amount]);
    }

    public static async multipleAddToInv(userId: string, itemIds: Array<number>, amounts: Array<number>): Promise<void> {
        await pool.query(
            'INSERT INTO inventory(user_id, item_id, quantity) VALUES($1, unnest($2::int[]), unnest($3::int[])) ' +
            'ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity',
            [userId, itemIds, amounts]);
    }

    public static async getShop(shopId: number): Promise<Shop> {
        return await this.fetchRow('SELECT * FROM shop WHERE id = $1', [shopId]);
    }

    public static async addTime(amount: number, unit: string, market: boolean, auctionId?: number): Promise<void> {
        const timeToAdd = `'${amount} ${unit}'`;
        const table = market ? 'market' : 'auctions'
        if (auctionId === undefined) await pool.query(`UPDATE ${table} SET end_time = end_time + INTERVAL ${timeToAdd}`);
        else await pool.query(`UPDATE ${table} SET end_time = end_time + INTERVAL ${timeToAdd} WHERE id = $1`, [auctionId]);
    }

    public static async logShutdown(): Promise<void> {
        await pool.query('UPDATE bot_info SET shutdown_time = CURRENT_TIMESTAMP WHERE id = 0');
    }

    public static async addShutdownTime(): Promise<boolean> {
        const lastShutdown: Date | null = await this.fetchVal('SELECT shutdown_time FROM bot_info WHERE id = 0');
        if (lastShutdown === null) return false;

        const timeNow = new Date()
        if (timeNow > lastShutdown) {
            await pool.query('UPDATE bot_info SET shutdown_time = NULL WHERE id = 0');
            const minutesDiff = floor((timeNow.getTime() - lastShutdown.getTime()) / 60000);
            await pool.query(`UPDATE auctions SET end_time = end_time + INTERVAL '${minutesDiff} minutes'`);
        }

        return true;
    }

    public static async insertLog(userId: string, guildId: string | null, logType: LogTypes, description: any, conn: any = pool): Promise<void> {
        await conn.query('INSERT INTO logs(user_id, guild_id, type, description) VALUES($1, $2, $3, $4)', [userId, guildId, logType, description]);
    }

}
