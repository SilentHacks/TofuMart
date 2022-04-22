import {Auctions, Inventory} from "./tables";
import moment from "moment";

const {Pool} = require('pg');

export const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DB,
    password: process.env.PG_PASSWORD,
    port: 5432,
});

class DB {

    private static async fetchVal(query: string, values?: Array<any>): Promise<any> {
        const {rows: [value]} = await pool.query({
            text: query,
            values: values,
            rowMode: 'array',
        });
        return value[0];
    }

    private static async fetchRow(query: string, values?: Array<any>): Promise<any> {
        const {rows: [value]} = await pool.query(query, values);
        return value;
    }

    private static async fetch(query: string, values?: Array<any>): Promise<any> {
        const {rows} = await pool.query(query, values);
        return rows;
    }

    public static async getAuctions(quick: boolean = false): Promise<Array<Auctions>> {
        return await this.fetch('SELECT * FROM auctions');
    }

    public static async getAuction(slot: number): Promise<Auctions> {
        return await this.fetchRow('SELECT * FROM auctions WHERE id = $1', [slot]);
    }

    public static async placeBid(slot: number, userId: string, amount: number): Promise<Auctions> {
        const auction = await this.getAuction(slot);

        // Give the current bid amount back to the bidder
        const outbidInventory = await this.fetchVal(
            'UPDATE inventory SET amount = amount + $1 WHERE item_id = $2 AND user_id = $3 RETURNING amount',
            [auction.current_bid, auction.currency_id, auction.current_bidder]);

        // Remove the amount from the new bidder's inventory
        const bidInv = await this.fetchVal(
            'UPDATE inventory SET amount = amount - $1 WHERE user_id = $2 and item_id = $3 RETURNING amount',
            [amount, userId, auction.currency_id]);

        // Set the bid to the new user's bid
        await pool.query(
            'UPDATE auctions SET current_bid = $1, current_bidder = $2 WHERE card_code = $3',
            [amount, userId, auction.card_code]);

        // Extend the end_time by 2 minutes if bid made within the last 2 minutes
        let newEnd;
        if ((newEnd = moment(new Date()).add(2, 'm').toDate()) >= auction.end_time)
            await pool.query('UPDATE auctions SET end_time = $1 WHERE card_code = $2', [newEnd, auction.card_code]);

        return auction;
    }

    public static async getInv(userId: string): Promise<Array<Inventory>> {
        return await this.fetch('SELECT * FROM inventory WHERE user_id = $1', [userId]);
    }

    public static async getInvItem(userId: string, itemId: number): Promise<Inventory> {
        return await this.fetchRow('SELECT * FROM inventory WHERE user_id = $1', [userId]);
    }

}

export default DB;
