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
    sent_dm: boolean
}

export interface Inventory {
    user_id: string,
    item_id: number,
    amount: number
}

export interface Queue {
    id: number,
    owner_id: string,
    card_code: string,
    card_details: string,
    image_url: string,
    duration: number | null, // minutes
    currency_id: number,
    start_price: number,
    market: boolean
}

export interface Users {
    user_id: string,
    cards: Array<string>,
    blacklisted: boolean
}

export interface Market {
    id: number,
    card_code: string,
    price: number,
    currency_id: number,
    end_time: Date,
    image_url: string,
    card_details: string,
    owner_id: string,
    sold: boolean
}