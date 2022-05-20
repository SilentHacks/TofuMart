import {CurrencyId, currencyNames} from "./helpers";

export enum LogTypes {
    Exchange = 0,
    Buy,
    Bid,
    Use,
    Claim
}


export const exchangeLog = (buy: boolean, currencyId: CurrencyId, amount: number, previousInv: number, newInv: number) => {
    let type: string, item: string;

    if (buy) {
        type = 'buy';
        item = `${CurrencyId[currencyId]} -> ${currencyNames[currencyId]}`
    } else {
        type = 'sell';
        item = `${currencyNames[currencyId]} -> ${CurrencyId[currencyId]}`
    }

    return {
        'type': type,
        'currency': item,
        'amount': amount,
        'previous_inv': previousInv,
        'new_inv': newInv
    }
}

export const bidLog = (slot: number, cardCode: string, bidAmount: number, bidCurrency: CurrencyId, previousInv: number, newInv: number) => {
    return {
        'slot': slot,
        'card_code': cardCode,
        'amount': bidAmount,
        'currency': currencyNames[bidCurrency],
        'previous_inv': previousInv,
        'new_inv': newInv
    }
}

export const buyLog = (item: string, amount: number, price: number, currencyId: CurrencyId, previousInv: number, newInv: number) => {
    return {
        'item': item,
        'amount': amount,
        'price': price,
        'currency': currencyId,
        'previous_inv': previousInv,
        'new_inv': newInv
    }
}

export const claimLog = (cardCode: string, numCards: number) => {
    return {
        'card_code': cardCode,
        'num_cards': numCards
    }
}

export const useLog = (market: boolean, cardCode: string, price: number, currencyId: CurrencyId) => {
    return {
        'type': market ? 'market' : 'auction',
        'card_code': cardCode,
        'price': price,
        'currency': currencyNames[currencyId]
    }
}