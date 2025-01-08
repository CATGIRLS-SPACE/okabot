import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { Logger } from "okayulogger";
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
    NEKO = 'catgirl',
    CATGIRL = 'catgirl',
    DOGY = 'doggirl',
    DOGGIRL = 'doggirl',
    FXGL = 'foxgirl',
    FOXGIRL = 'foxgirl'
}

// --

let DB_PATH: string;
let MARKET: StockMarket;
const L = new Logger('stocks');

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
            price: 25000,
            price_history: [25000,25000],
            holders: [],
            name: 'Catgirl',
            id: 'NEKO'
        },
        doggirl: {
            price: 5000,
            price_history: [5000,5000],
            holders: [],
            name: 'Doggirl',
            id: 'DOGY'
        },
        foxgirl: {
            price: 1000,
            price_history: [1000,1000],
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
    return Math.round(MARKET[stock].price);
}

/**
 * Check how many shares a user has of a given stock
 * @param user_id ID of the user to check
 * @param stock The stock to check
 */
export function CheckUserShares(user_id: string, stock: Stocks): number {
    let count = 0;

    switch (stock) {
        case Stocks.CATGIRL:
            const neko_holder = MARKET.catgirl.holders.find(holder => holder.user_id == user_id);
            count = neko_holder?.amount || 0;
            break;

        case Stocks.DOGGIRL:
            const dogy_holder = MARKET.doggirl.holders.find(holder => holder.user_id == user_id);
            count = dogy_holder?.amount || 0;
            break;

        case Stocks.FOXGIRL:
            const fxgl_holder = MARKET.foxgirl.holders.find(holder => holder.user_id == user_id);
            count = fxgl_holder?.amount || 0;
            break;
    
        default:
            return 0;
    }

    return count;
}

/**
 * Updates the prices of the stocks slightly.
 * It will take note of the current trend and have a 1/8 chance of flipping the trend.
 * If the trend is no change (e.g. 150,150) then it will assume a positive trend.
 * This is so that the stock prices hopefully don't go insane rollercoaster 24/7.
 */
export function UpdateMarkets() {
    L.info('updating markets...');

    enum Trend {
        POSITIVE = 1,
        NEGATIVE = -1
    };
    let trend = Trend.POSITIVE;

    // catgirl market:
    if (MARKET.catgirl.price_history[-1] < MARKET.catgirl.price_history[-2]) trend = Trend.NEGATIVE;
    if (Math.random() <= 1/8) trend = trend * -1; // flips polarity on the 1/8 chance, essentially swapping it
    let change = trend * Math.round((Math.random() * 10) * 100) / 100;
    MARKET.catgirl.price += change;
    if (MARKET.catgirl.price < 0) MARKET.catgirl.price = 0;
    MARKET.catgirl.price_history.push(MARKET.catgirl.price);

    // doggirl market:
    if (MARKET.doggirl.price_history[-1] < MARKET.doggirl.price_history[-2]) trend = Trend.NEGATIVE;
    if (Math.random() <= 1/8) trend = trend * -1; // flips polarity on the 1/8 chance, essentially swapping it
    change = trend * Math.round((Math.random() * 5) * 100) / 100;
    MARKET.doggirl.price += change;
    if (MARKET.doggirl.price < 0) MARKET.doggirl.price = 0;
    MARKET.doggirl.price_history.push(MARKET.doggirl.price);
    
    // foxgirl market:
    if (MARKET.foxgirl.price_history[-1] < MARKET.foxgirl.price_history[-2]) trend = Trend.NEGATIVE;
    if (Math.random() <= 1/8) trend = trend * -1; // flips polarity on the 1/8 chance, essentially swapping it
    change = trend * Math.round((Math.random() * 2) * 100) / 100;
    MARKET.foxgirl.price += change;
    if (MARKET.foxgirl.price < 0) MARKET.foxgirl.price = 0;
    MARKET.foxgirl.price_history.push(MARKET.foxgirl.price);

    // write changes
    writeFileSync(DB_PATH, JSON.stringify(MARKET), 'utf-8');
    L.info(`Done. New market prices are [NEKO: ${MARKET.catgirl.price}] [DOGY: ${MARKET.doggirl.price}] [FXGL: ${MARKET.foxgirl.price}]`);
}

/**
 * Buy an amount of shares of a stock
 * @param user_id ID of user who is buying
 * @param stock The stock that the user wants to buy
 * @param amount The amount of shares to buy
 */
export async function BuyShares(user_id: string, stock: Stocks, amount: number) {
    L.info(`${user_id} is buying ${amount} share(s) of ${stock}`);

    switch (stock) {
        case Stocks.CATGIRL: case Stocks.NEKO:
            // check if they dont hold any shares yet
            const neko_holder = MARKET.catgirl.holders.find((holder) => holder.user_id == user_id);
            if (neko_holder == undefined) {MARKET.catgirl.holders.push({user_id, amount}); break;}
            // they already hold shares
            // store where it was located because we can't use indexOf after modifying it
            const neko_where = MARKET.catgirl.holders.indexOf(neko_holder);
            neko_holder.amount += amount;
            // update the record
            MARKET.catgirl.holders[neko_where] = neko_holder;
            break;

        case Stocks.DOGGIRL: case Stocks.DOGY:
            const dogy_holder = MARKET.doggirl.holders.find((holder) => holder.user_id == user_id);
            if (dogy_holder == undefined) {MARKET.doggirl.holders.push({user_id, amount}); break;}
            const dogy_where = MARKET.doggirl.holders.indexOf(dogy_holder);
            dogy_holder.amount += amount;
            MARKET.doggirl.holders[dogy_where] = dogy_holder;
            break;

        case Stocks.FOXGIRL: case Stocks.FXGL:
            const fxgl_holder = MARKET.foxgirl.holders.find((holder) => holder.user_id == user_id);
            if (fxgl_holder == undefined) {MARKET.foxgirl.holders.push({user_id, amount}); break;}
            const fxgl_where = MARKET.foxgirl.holders.indexOf(fxgl_holder);
            fxgl_holder.amount += amount;
            MARKET.foxgirl.holders[fxgl_where] = fxgl_holder;
            break;
    
        default:
            return L.error(`unknown case ${stock}?`);
    }

    // write the database
    writeFileSync(DB_PATH, JSON.stringify(MARKET), 'utf-8');
}


/**
 * Sell an amount of shares of a stock.
 * @param user_id ID of user who is selling
 * @param stock The stock that the user wants to sell
 * @param amount The amount of shares to sell
 */
export async function SellShares(user_id: string, stock: Stocks, amount: number) {
    L.info(`${user_id} is selling ${amount} share(s) of ${stock}`);

    switch (stock) {
        case Stocks.CATGIRL: case Stocks.NEKO:
            const neko_holder = MARKET.catgirl.holders.find((holder) => holder.user_id == user_id);
            if (neko_holder == undefined) return;
            // store where it was located because we can't use indexOf after modifying it
            const neko_where = MARKET.catgirl.holders.indexOf(neko_holder);
            neko_holder.amount -= amount;
            // update the record
            if (neko_holder.amount != 0)
                MARKET.catgirl.holders[neko_where] = neko_holder;
            else
                MARKET.catgirl.holders.splice(neko_where, 1); // remove them if they don't hold any shares;
            break;

        case Stocks.DOGGIRL: case Stocks.DOGY:
            const dogy_holder = MARKET.doggirl.holders.find((holder) => holder.user_id == user_id);
            if (dogy_holder == undefined) return;
            const dogy_where = MARKET.doggirl.holders.indexOf(dogy_holder);
            dogy_holder.amount -= amount;
            if (dogy_holder.amount != 0)
                MARKET.catgirl.holders[dogy_where] = dogy_holder;
            else
                MARKET.catgirl.holders.splice(dogy_where, 1); // remove them if they don't hold any shares;
            break;

        case Stocks.FOXGIRL: case Stocks.FXGL:
            const fxgl_holder = MARKET.foxgirl.holders.find((holder) => holder.user_id == user_id);
            if (fxgl_holder == undefined) return;
            const fxgl_where = MARKET.foxgirl.holders.indexOf(fxgl_holder);
            fxgl_holder.amount -= amount;
            if (fxgl_holder.amount != 0)
                MARKET.catgirl.holders[fxgl_where] = fxgl_holder;
            else
                MARKET.catgirl.holders.splice(fxgl_where, 1); // remove them if they don't hold any shares;
            break;
    
        default:
            return L.error(`unknown case ${stock}?`);
    }

    // write the database
    writeFileSync(DB_PATH, JSON.stringify(MARKET), 'utf-8');
}