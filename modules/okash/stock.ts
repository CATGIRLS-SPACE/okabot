/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "fs";
import {Logger} from "okayulogger";
import {join} from "path";
import {DEV} from "../../index";
import {Client, TextChannel} from "discord.js";

// import { WSS_SendStockUpdate, WSSStockMessage } from "../http/server";

export interface Stock {
    price: number,
    price_history: Array<number>,
    holders: Array<{user_id:string,amount:number}>,
    name: string,
    id: string,
    shares: {
        total: number,
        available: number,
        max_holdable: number
    }
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
 * @param dirname the __dirname variable as found in index.ts
 */
export function SetupStocks(dirname: string) {
    if (!existsSync(join(dirname, 'db'))) mkdirSync(join(dirname, 'db'));
    DB_PATH = join(dirname, 'db', 'stock.oka');
    
    if (existsSync(DB_PATH)) return MARKET = JSON.parse(readFileSync(DB_PATH, 'utf-8'));

    L.info('stock.oka does not exist, creating...');

    // the stocks have different starting prices to make some easier to enter
    // early on. however this might not stay the same because okabot
    // really likes to fuck with randomness whenever possible it seems...
    MARKET = {
        catgirl: {
            price: 100000,
            price_history: [100000,100000],
            holders: [],
            name: 'Catgirl',
            id: 'NEKO',
            shares: {
                total: 100,
                available: 100,
                max_holdable: 20,
            }
        },
        doggirl: {
            price: 50000,
            price_history: [50000,50000],
            holders: [],
            name: 'Doggirl',
            id: 'DOGY',
            shares: {
                total: 100,
                available: 100,
                max_holdable: 10,
            }
        },
        foxgirl: {
            price: 25000,
            price_history: [25000,25000],
            holders: [],
            name: 'Foxgirl',
            id: 'FXGL',
            shares: {
                total: 100,
                available: 100,
                max_holdable: 5,
            }
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
    if (MARKET[stock].price <= 0) MARKET[stock].price = 1;
    return Math.round(MARKET[stock].price);
}


/**
 * Get the current status of the stock market
 * @returns All market prices and the latest event (or undefined if an event hasn't happened yet)
 */
export function GetMarketStatus(): {
    neko: number,
    dogy: number,
    fxgl: number,
    last_event: StockEvent | undefined
} {
    return {
        neko: Math.round(MARKET[Stocks.CATGIRL].price),
        dogy: Math.round(MARKET[Stocks.DOGGIRL].price),
        fxgl: Math.round(MARKET[Stocks.FOXGIRL].price),
        last_event: LastEvent
    }
}

export function GetLastPrices(): {
    neko: number,
    dogy: number,
    fxgl: number,
} {
    return {
        neko: Math.round(MARKET[Stocks.CATGIRL].price_history.at(-2)!),
        dogy: Math.round(MARKET[Stocks.DOGGIRL].price_history.at(-2)!),
        fxgl: Math.round(MARKET[Stocks.FOXGIRL].price_history.at(-2)!),
    };
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
            { const neko_holder = MARKET.catgirl.holders.find(holder => holder.user_id == user_id);
            count = neko_holder?.amount || 0;
            break; }

        case Stocks.DOGGIRL:
            { const dogy_holder = MARKET.doggirl.holders.find(holder => holder.user_id == user_id);
            count = dogy_holder?.amount || 0;
            break; }

        case Stocks.FOXGIRL:
            { const fxgl_holder = MARKET.foxgirl.holders.find(holder => holder.user_id == user_id);
            count = fxgl_holder?.amount || 0;
            break; }
    
        default:
            return 0;
    }

    return count;
}


enum Trend {
    POSITIVE = 1,
    NEGATIVE = -1
};


/**
 * Create arbitrary trends based on current data to prevent stocks
 * from getting stupidly out of hand
 * @param trend The current trend
 * @param price The current price
 * @param starting_price The set starting price of the stock
 */
function CalculateNextTrend(trend: Trend, price: number, starting_price: number): Trend {
    console.log(price, starting_price); // wehh
    // const amount_changed = Math.abs(trend - starting_price);
    // // if the price is 1000 above starting price, heavy chance to go down
    // // if it's already negative, it should have a tiny chance to flip
    // if (price > starting_price + 1000) {
    //     let roll = Math.floor(Math.random() * 6);
    //     if (trend == Trend.NEGATIVE) return roll==2?Trend.POSITIVE:Trend.NEGATIVE;

    //     roll = Math.floor(Math.random() * 4);
    //     return roll<2+(amount_changed*0.0023)?Trend.NEGATIVE:Trend.POSITIVE;
    // }

    // // if the price is 1000 below, yeah yeah do opposite
    // if (price < starting_price - 1000) {
    //     let roll = Math.floor(Math.random() * 6);
    //     if (trend == Trend.POSITIVE) return roll==2?Trend.NEGATIVE:Trend.POSITIVE;

    //     roll = Math.floor(Math.random() * 4);
    //     return roll<2+(amount_changed*0.0023)?Trend.POSITIVE:Trend.NEGATIVE;
    // }

    // otherwise keep the stupid other whatever
    // this stocks system kind of pisses me off
    return (Math.random() <= 0.2)?trend:trend*-1;
}


/**
 * Updates the prices of the stocks slightly.
 * It will take note of the current trend and have a 1/8 chance of flipping the trend.
 * If the trend is no change (e.g. 150,150) then it will assume a positive trend.
 * This is so that the stock prices hopefully don't go insane rollercoaster 24/7.
 */
export function UpdateMarkets(c: Client) {
    // L.info('updating markets...');

    let trend = Trend.POSITIVE;
    let spike = false;

    // console.log(MARKET.catgirl.price_history.at(-1)! < MARKET.catgirl.price_history.at(-2)!?'catgirl trend negative':'catgirl trend positive');
    // console.log(MARKET.doggirl.price_history.at(-1)! < MARKET.doggirl.price_history.at(-2)!?'doggirl trend negative':'doggirl trend positive');
    // console.log(MARKET.foxgirl.price_history.at(-1)! < MARKET.foxgirl.price_history.at(-2)!?'foxgirl trend negative':'foxgirl trend positive');

    // catgirl market:
    if (MARKET.catgirl.price_history.at(-1)! < MARKET.catgirl.price_history.at(-2)!) trend = Trend.NEGATIVE; else trend = Trend.POSITIVE;
    trend = CalculateNextTrend(trend, MARKET.catgirl.price, 25000);
    if (Math.floor(Math.random() * 50) == 27) spike = true;
    let change = trend * Math.round(((Math.random() * (spike?250:20)) + Number.EPSILON) * 100) / 100;
    MARKET.catgirl.price += change;
    if (MARKET.catgirl.price < 1) MARKET.catgirl.price = 1;
    MARKET.catgirl.price_history.push(MARKET.catgirl.price);

    // doggirl market:
    if (MARKET.doggirl.price_history.at(-1)! < MARKET.doggirl.price_history.at(-2)!) trend = Trend.NEGATIVE; else trend = Trend.POSITIVE;
    trend = CalculateNextTrend(trend, MARKET.doggirl.price, 5000);
    if (Math.floor(Math.random() * 50) == 27) spike = true;
    change = trend * Math.round(((Math.random() * (spike?100:10)) + Number.EPSILON) * 100) / 100;
    MARKET.doggirl.price += change;
    if (MARKET.doggirl.price < 1) MARKET.doggirl.price = 1;
    MARKET.doggirl.price_history.push(MARKET.doggirl.price);
    
    // foxgirl market:
    if (MARKET.foxgirl.price_history.at(-1)! < MARKET.foxgirl.price_history.at(-2)!) trend = Trend.NEGATIVE; else trend = Trend.POSITIVE;
    trend = CalculateNextTrend(trend, MARKET.foxgirl.price, 1000);
    if (Math.floor(Math.random() * 25) == 13) spike = true;
    change = trend * Math.round(((Math.random() * (spike?50:2)) + Number.EPSILON) * 100) / 100;
    MARKET.foxgirl.price += change;
    if (MARKET.foxgirl.price < 1) MARKET.foxgirl.price = 1;
    MARKET.foxgirl.price_history.push(MARKET.foxgirl.price);

    // write changes
    writeFileSync(DB_PATH, JSON.stringify(MARKET), 'utf-8');
    L.info(`Market prices have updated: [NEKO: ${MARKET.catgirl.price}] [DOGY: ${MARKET.doggirl.price}] [FXGL: ${MARKET.foxgirl.price}]`);

    const is_event = DoEventCheck(c);
    // if (!is_event) WSS_SendStockUpdate(WSSStockMessage.NATURAL_UPDATE);
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
            { const neko_holder = MARKET.catgirl.holders.find((holder) => holder.user_id == user_id);
            if (neko_holder == undefined) {MARKET.catgirl.holders.push({user_id, amount}); break;}
            const neko_where = MARKET.catgirl.holders.indexOf(neko_holder);
            neko_holder.amount += amount;
            MARKET.catgirl.holders[neko_where] = neko_holder;
            break; }

        case Stocks.DOGGIRL: case Stocks.DOGY:
            { const dogy_holder = MARKET.doggirl.holders.find((holder) => holder.user_id == user_id);
            if (dogy_holder == undefined) {MARKET.doggirl.holders.push({user_id, amount}); break;}
            const dogy_where = MARKET.doggirl.holders.indexOf(dogy_holder);
            dogy_holder.amount += amount;
            MARKET.doggirl.holders[dogy_where] = dogy_holder;
            break; }

        case Stocks.FOXGIRL: case Stocks.FXGL:
            { const fxgl_holder = MARKET.foxgirl.holders.find((holder) => holder.user_id == user_id);
            if (fxgl_holder == undefined) {MARKET.foxgirl.holders.push({user_id, amount}); break;}
            const fxgl_where = MARKET.foxgirl.holders.indexOf(fxgl_holder);
            fxgl_holder.amount += amount;
            MARKET.foxgirl.holders[fxgl_where] = fxgl_holder;
            break; }
    
        default:
            return L.error(`unknown case ${stock}?`);
    }

    // pump the price a little bit based on their investment
    MARKET[stock].price += (amount * MARKET.foxgirl.price * 0.001);
    MARKET[stock].price_history.push(MARKET[stock].price);

    if (MARKET[stock].price <= 0) MARKET[stock].price = 1;

    // write the database
    writeFileSync(DB_PATH, JSON.stringify(MARKET), 'utf-8');

    // send WSS update
    // WSS_SendStockUpdate(WSSStockMessage.USER_UPDATE_POSITIVE, {stock, value: MARKET[stock].price});
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
            { const neko_holder = MARKET.catgirl.holders.find((holder) => holder.user_id == user_id);
            if (neko_holder == undefined) return;
            // store where it was located because we can't use indexOf after modifying it
            const neko_where = MARKET.catgirl.holders.indexOf(neko_holder);
            neko_holder.amount -= amount;
            // update the record
            if (neko_holder.amount != 0)
                MARKET.catgirl.holders[neko_where] = neko_holder;
            else
                MARKET.catgirl.holders.splice(neko_where, 1); // remove them if they don't hold any shares;
            break; }

        case Stocks.DOGGIRL: case Stocks.DOGY:
            { const dogy_holder = MARKET.doggirl.holders.find((holder) => holder.user_id == user_id);
            if (dogy_holder == undefined) return;
            const dogy_where = MARKET.doggirl.holders.indexOf(dogy_holder);
            dogy_holder.amount -= amount;
            if (dogy_holder.amount != 0)
                MARKET.doggirl.holders[dogy_where] = dogy_holder;
            else
                MARKET.doggirl.holders.splice(dogy_where, 1); // remove them if they don't hold any shares;
            break; }

        case Stocks.FOXGIRL: case Stocks.FXGL:
            { const fxgl_holder = MARKET.foxgirl.holders.find((holder) => holder.user_id == user_id);
            if (fxgl_holder == undefined) return;
            const fxgl_where = MARKET.foxgirl.holders.indexOf(fxgl_holder);
            fxgl_holder.amount -= amount;
            if (fxgl_holder.amount != 0)
                MARKET.foxgirl.holders[fxgl_where] = fxgl_holder;
            else
                MARKET.foxgirl.holders.splice(fxgl_where, 1); // remove them if they don't hold any shares;
            break; }
    
        default:
            return L.error(`unknown case ${stock}?`);
    }

    // dump the price a little bit based on their sell
    switch (stock) {
        case Stocks.CATGIRL:
            MARKET.catgirl.price -= (amount * MARKET.catgirl.price * 0.00025);
            break;

        case Stocks.DOGGIRL:
            MARKET.doggirl.price -= (amount * MARKET.doggirl.price * 0.00025);
            break;

        case Stocks.FOXGIRL:
            MARKET.foxgirl.price -= (amount * MARKET.foxgirl.price * 0.00025);
            break;
    }

    if (MARKET[stock].price <= 0) MARKET[stock].price = 1;

    // write the database
    writeFileSync(DB_PATH, JSON.stringify(MARKET), 'utf-8');

    // send WSS update
    // WSS_SendStockUpdate(WSSStockMessage.USER_UPDATE_NEGATIVE, {stock, value: MARKET[stock].price});
}

export function GetLastNumValues(stock: Stocks, length: number) {
    return MARKET[stock].price_history.slice(-length, -1);
}


interface StockEvent {
    name: string,
    positive: boolean
}

enum EventWeight {
    GOOD = 1,
    VERY_GOOD = 2,
    BAD = -1,
    VERY_BAD = -2
}

const EVENTS: Array<StockEvent> = [
    {"name":"#STOCK# experts predict a major #ABBR# boom is incoming","positive":true},
    {"name":"#STOCK# experts say now is the time to invest in #ABBR#","positive":true},
    {"name":"#STOCK# investors left speechless as #ABBR# collapses","positive":false},
    {"name":"Analysts say #STOCK# (#ABBR#) investment was a mistake","positive":false},
    {"name":"#STOCK# soars as #ABBR# investors celebrate record highs", "positive":true},
    {"name":"Big money moves: #ABBR# is the next big thing, say analysts", "positive":true},
    {"name":"#STOCK# CEO winks at press conference, stocks skyrocket", "positive":true},
    {"name":"Mysterious billionaire just bought a ton of #ABBR# shares", "positive":true},
    {"name":"#STOCK# investors rejoice as #ABBR# becomes \"too big to fail\"", "positive":true},
    {"name":"Experts claim #ABBR# is \"the future\" — nobody knows what that means", "positive":true},
    {"name":"#STOCK# rises after a single catgirl mentioned #ABBR# on stream", "positive":true},
    {"name":"#STOCK# in shambles as #ABBR# CEO tweets 'oops'", "positive":false},
    {"name":"Investors panic as #ABBR# gets listed in 'Top 10 Worst Buys'", "positive":false},
    {"name":"Market chaos: #STOCK# drops after CFO was seen buying ramen noodles", "positive":false},
    // {"name":"#STOCK# plummets as #ABBR# gets called 'mid' on social media", "positive":false},
    {"name":"Financial disaster: #ABBR# stock crashes after a catgirl said 'meh'", "positive":false},
    {"name":"Insiders report that #STOCK# execs \"have no idea what they're doing\"", "positive":false},
    {"name":"#ABBR# stock tanks as investors realize it's just a meme", "positive":false},
    {"name":"#STOCK# skyrockets as #ABBR# CEO changes profile picture", "positive":true},
    {"name":"#STOCK# jumps 300% after a catgirl tweets 'nyan~' about #ABBR#", "positive":true},
    {"name":"Investors call #ABBR# 'the next big thing' after seeing a cool product proposal", "positive":true},
    {"name":"#STOCK# mooning as billionaire says '#ABBR# just feels right'", "positive":true},
    {"name":"#ABBR# price skyrockets after CEO responds with 'lol' to a tweet", "positive":true},
    {"name":"#STOCK# shares explode as #ABBR# appears in a viral TikTok", "positive":true},
    {"name":"Market experts agree: #ABBR# is a 'vibe' now", "positive":true},
    {"name":"#STOCK# surges as the internet collectively forgets what #ABBR# actually does", "positive":true},
    {"name":"#STOCK# crumbles after #ABBR# CEO is caught using Internet Explorer", "positive":false},
    {"name":"Panic as #ABBR# website goes down for 5 minutes", "positive":false},
    {"name":"#STOCK# plummets after someone says '#ABBR# is kinda mid' on Discord", "positive":false},
    {"name":"Investors panic-sell #ABBR# after finding out it's 'catboy-bait'", "positive":false},
    {"name":"#STOCK# free-falls as CEO admits 'we have no idea what we're doing'", "positive":false},
    {"name":"#ABBR# collapses after grandma tries to buy shares at a bank", "positive":false},
    {"name":"#STOCK# dips as catgirl streamers start talking about a different stock", "positive":false},
    {"name":"#ABBR# takes a nosedive after someone changes its Wikipedia page", "positive":false},
    {"name":"#STOCK# hit with a disaster as CEO crashes out on Twitter", "positive":false},
    {"name":"#STOCK# prospers after okabot bug was discovered, mistakenly prioritizing #ABBR# over other stocks", "positive":true},
    {"name":"#STOCK# crumbles after okabot 3.1.6 patch nerfed trends", "positive":false},
    {"name":"#STOCK# explodes after okabot 5.4.0 re-introduces stocks.","positive":true},
    {"name":"#STOCK# is absolutely ruined after investors \"do a little trolling\"","positive":false},
];


let LastEvent: StockEvent;
const STARTING_VALUES = {
    catgirl: 25000,
    doggirl: 5000,
    foxgirl: 1000
}

// This will be triggered every 5 minutes when the markets update
// 1/10 and 1/25 was too much, 1/50 testing now
function DoEventCheck(c: Client): boolean {
    // should we do an event?
    if (Math.floor(Math.random() * 50) != 5) return false;

    L.info('event is happening!');
    const BROADCAST_CHANNEL_ID = !DEV?"1315805846910795846":"941843973641736253"; 

    // yes, what event?
    LastEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];

    // what stock?
    const stock_roll = Math.floor(Math.random() * 3);
    const stock = [Stocks.CATGIRL, Stocks.DOGGIRL, Stocks.FOXGIRL][stock_roll];

    if (!LastEvent.positive) {
        const base_crash_probability = 0.05;
        const sensitivity = 0.2;
        
        const crash_chance = Math.min(base_crash_probability + (sensitivity * (MARKET[stock].price - STARTING_VALUES[stock]) / STARTING_VALUES[stock]), 1);
        const crash_roll = Math.random();

        console.log(crash_roll, crash_chance);

        if (crash_roll < crash_chance) {
            L.info('stock crash triggered');
            MARKET[stock].price -= Math.floor(Math.random() * 2500) + 500; // -_-
        }
        else MARKET[stock].price -= Math.floor(Math.random() * 500) + 50; // BOOOOOOORING
    }
    else MARKET[stock].price += Math.floor(Math.random() * 500) + 50; // still BOOOOOORIIIINNGGG

    if (MARKET[stock].price <= 0) MARKET[stock].price = 1;

    writeFileSync(DB_PATH, JSON.stringify(MARKET), 'utf-8');

    const channel = c.channels.cache.get(BROADCAST_CHANNEL_ID) as TextChannel;
    L.info(`channel: #${channel.name}`);

    // send the event to the channel
    channel.send({
        content:`:bangbang:${LastEvent.positive?':chart_with_upwards_trend:':':chart_with_downwards_trend:'} **STOCK MARKET NEWS:** ${LastEvent.name.replace('#STOCK#', MARKET[stock].name).replace('#ABBR#', MARKET[stock].id)}`
    });

    // WSS_SendStockUpdate(LastEvent.positive?WSSStockMessage.EVENT_UPDATE_POSITIVE:WSSStockMessage.EVENT_UPDATE_NEGATIVE, LastEvent.name.replace('#STOCK#', MARKET[stock].name).replace('#ABBR#', MARKET[stock].id));
    return true;
}