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

let DB_PATH: string;
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
            price_history: [500,500],
            holders: [],
            name: 'Catgirl',
            id: 'CTGL'
        },
        doggirl: {
            price: 300,
            price_history: [300,300],
            holders: [],
            name: 'Doggirl',
            id: 'DOGY'
        },
        foxgirl: {
            price: 150,
            price_history: [150,150],
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

/**
 * Updates the prices of the stocks slightly.
 * It will take note of the current trend and have a 1/8 chance of flipping the trend.
 * If the trend is no change (e.g. 150,150) then it will assume a positive trend.
 * This is so that the stock prices hopefully don't go insane rollercoaster 24/7.
 */
export function UpdateMarkets() {
    enum Trend {
        POSITIVE = 1,
        NEGATIVE = -1
    };
    let trend = Trend.POSITIVE;

    // catgirl market:
    if (MARKET.catgirl.price_history[-1] < MARKET.catgirl.price_history[-2]) trend = Trend.NEGATIVE;
    if (Math.random() < 1/8) trend = trend * -1; // flips polarity on the 1/8 chance, essentially swapping it
    let change = trend * Math.floor(Math.random() * 3);
    MARKET.catgirl.price += change;
    MARKET.catgirl.price_history.push(MARKET.catgirl.price);

    // doggirl market:
    if (MARKET.doggirl.price_history[-1] < MARKET.doggirl.price_history[-2]) trend = Trend.NEGATIVE;
    if (Math.random() < 1/8) trend = trend * -1; // flips polarity on the 1/8 chance, essentially swapping it
    change = trend * Math.floor(Math.random() * 3);
    MARKET.doggirl.price += change;
    MARKET.doggirl.price_history.push(MARKET.doggirl.price);
    
    // foxgirl market:
    if (MARKET.foxgirl.price_history[-1] < MARKET.foxgirl.price_history[-2]) trend = Trend.NEGATIVE;
    if (Math.random() < 1/8) trend = trend * -1; // flips polarity on the 1/8 chance, essentially swapping it
    change = trend * Math.floor(Math.random() * 3);
    MARKET.foxgirl.price += change;
    MARKET.foxgirl.price_history.push(MARKET.foxgirl.price);

    // write changes
    writeFileSync(DB_PATH, JSON.stringify(MARKET), 'utf-8');
}