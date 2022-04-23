import {Auctions, Inventory, Queue} from "./tables";
import moment from "moment";
import getConfig from "../utils/config";

const config = getConfig();
const {Pool} = require('pg');

export const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DB,
    password: process.env.PG_PASSWORD,
    port: 5432,
});

class DB {

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

    public static async getAuctions(quick: boolean = false): Promise<Array<Auctions>> {
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

    public static async endAuction(auction: Auctions, conn: any = pool) {
        await conn.query('UPDATE users SET cards = array_append(cards, $1) WHERE user_id = $2', [auction.card_code, auction.current_bidder]);
        await conn.query('UPDATE auctions SET sent_dm = TRUE WHERE id = $1', [auction.id]);
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

    public static async placeBid(slot: number, userId: string, amount: number): Promise<Auctions> {
        const client = await pool.connect();
        const auction = await this.fetchRow('SELECT * FROM auctions WHERE id = $1', [slot], client);

        try {
            await client.query('BEGIN')

            // Give the current bid amount back to the bidder
            const outbidInventory = await this.fetchVal(
                'UPDATE inventory SET amount = amount + $1 WHERE item_id = $2 AND user_id = $3 RETURNING amount',
                [auction.current_bid, auction.currency_id, auction.current_bidder],
                client);

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

    public static async getQueue(): Promise<Array<Queue>> {
        return await this.fetch('SELECT * FROM queue ORDER BY id');
    }

    public static async queueCard(card: Queue) {
        await pool.query(
            'INSERT INTO queue(owner_id, card_code, card_details, image_url, duration, currency_id, start_price) ' +
            'VALUES($1, $2, $3, $4, $5, $6, $7)',
            [card.owner_id, card.card_code, card.card_details, card.image_url, card.duration, card.currency_id, card.start_price]);
    }

}

export default DB;
