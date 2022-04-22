export interface Auctions {
    id: number,
    card_code: string,
    currency_id: number,
    current_bid: number,
    current_bidder: string,
    end_time: Date,
    quick: boolean,
    image_url: string,
    card_details: string,
    owner_id: string,
    start_bid: number
}

export interface Inventory {
    user_id: string,
    item_id: number,
    amount: number
}