import {CUSTOMIZATION_UNLOCKS, ITEM_ID_NAMES, ITEMS} from "./items";
import {Snowflake} from "discord.js";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {join} from "path";
import {BASE_DIRNAME} from "../../index";

export interface TrackableItem {
    type: 'item' | 'customization',
    serial: string,
    original_owner: Snowflake,
    creation_time: number,
    data: TrackableCoin | TrackableCardDeck,
    custom_name: string,
}

export interface TrackableCoin {
    base: CUSTOMIZATION_UNLOCKS,
    serial: string,
    flips: number,
    original_owner: Snowflake,
    creation_time: number,
}

export interface TrackableCardDeck {
    base: ITEMS,
    serial: string,
    dealt_cards: number,
    original_owner: Snowflake,
    creation_time: number,
}

// --

let SerialedItems: {[key: string]: TrackableItem} = {}

export function LoadSerialItemsDB() {
    if (!existsSync(join(BASE_DIRNAME, 'db', 'trackable.oka'))) {
        SerialedItems = {};
        return SaveSerialDB();
    }
    SerialedItems = JSON.parse(readFileSync(join(BASE_DIRNAME, 'db', 'trackable.oka'), 'utf-8'));
}
function SaveSerialDB() {
    writeFileSync(join(BASE_DIRNAME, 'db', 'trackable.oka'), JSON.stringify(SerialedItems), 'utf-8');
}

// --

/**
 * @readonly
 */
export function GetItemFromSerial(serial: string): TrackableItem | undefined {
    return SerialedItems[serial];
}

export function UpdateTrackedItem(serial: string, data: {property:'name',value:string} | {property:'flips',amount:number} | {property:'dealt_cards',amount:number}) {
    const item = SerialedItems[serial];

    switch (data.property) {
        case 'name':
            item.custom_name = data.value;
            break;

        case 'flips':
            (item.data as TrackableCoin).flips += data.amount;
            break;

        case 'dealt_cards':
            (item.data as TrackableCardDeck).dealt_cards += data.amount;
            break;
    }

    SerialedItems[serial] = item;

    SaveSerialDB();
}

export async function CreateTrackedItem(type: 'item' | 'customization', item: ITEMS | CUSTOMIZATION_UNLOCKS, user_id: Snowflake): Promise<string> {
    const serial = crypto.randomUUID();

    SerialedItems[serial] = {
        serial,
        creation_time: Date.now(),
        custom_name: `Tracked ${ITEM_ID_NAMES[item]}`,
        original_owner: user_id,
        type,
        data: type == 'item' ? <TrackableCardDeck>{
            base: item,
            serial,
            creation_time: Date.now(),
            original_owner: user_id,
            dealt_cards: 0
        } : <TrackableCoin>{
            base: item,
            serial,
            creation_time: Date.now(),
            original_owner: user_id,
            flips: 0
        }
    };

    SaveSerialDB();

    return serial;
}