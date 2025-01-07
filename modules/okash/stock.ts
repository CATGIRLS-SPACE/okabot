import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface Stock {
    price: number,
    price_history: Array<number>,
    holders: Array<{user_id:string,amount:number}>,
    name: string,
    id: string
}

export interface StockMarket {
    catgirl: Stock,
    doggirl: Stock,
    foxgirl: Stock
}

export enum Stocks {
    CTGL = 'catgirl',
    CATGIRL = 'catgirl',
    DOGY = 'doggirl',
    DOGGIRL = 'doggirl',
    FXGL = 'foxgirl',
    FOXGIRL = 'foxgirl'
}

// --

let DB_PATH;
let MARKET: StockMarket;

// --

/**
 * Set up and load the stocks module
 * @param dirname the __dirname variable as found in index.tr
 */
export function SetupStocks(dirname: string) {
    if (!existsSync(join(dirname, 'db'))) mkdirSync(join(dirname, 'db'));
    DB_PATH = join(dirname, 'db', 'stock.oka');
    
    if (existsSync(DB_PATH)) return MARKET = JSON.parse(readFileSync(DB_PATH, 'utf-8'));

    // the stocks have different starting prices to make some easier to enter
    // early on. however this might not stay the same because okabot
    // really likes to fuck with randomness whenever possible it seems...
    MARKET = {
        catgirl: {
            price: 500,
            price_history: [500],
            holders: [],
            name: 'Catgirl',
            id: 'CTGL'
        },
        doggirl: {
            price: 300,
            price_history: [300],
            holders: [],
            name: 'Doggirl',
            id: 'DOGY'
        },
        foxgirl: {
            price: 150,
            price_history: [150],
            holders: [],
            name: 'Foxgirl',
            id: 'FXGL'
        },
    };

    writeFileSync(DB_PATH, JSON.stringify(MARKET), 'utf-8');
}

/**
 * Get the current price of a stock
 * @param stock The stock to get the price of
 * @returns the current price
 */
export function GetSharePrice(stock: Stocks): number {
    return MARKET[stock].price;
}

