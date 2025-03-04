import {CUSTOMIZATION_UNLOCKS, CUSTOMIZTAION_ID_NAMES, ITEM_ID_NAMES, ITEMS} from "./items";
import {Message, MessageFlags, Snowflake} from "discord.js";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {join} from "path";
import {BASE_DIRNAME, client} from "../../index";
import {GetEmoji} from "../../util/emoji";
import {COIN_EMOJIS_DONE} from "./games/coinflip";

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

export const VALID_ITEMS_TO_TRACK: {[key: string]: number} = {
    'red coin': 1,
    'rc': 1,
    'dark blue coin': 2,
    'dbc': 2,
    'light blue coin': 3,
    'lbc': 3,
    'pink coin': 4,
    'pc': 4,
    'purple coin': 5,
    'ppc': 5,
    'dark green coin': 16,
    'dgc': 16,
    'rainbow coin': 17,
    'rbc': 17
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

export async function Check$Message(message: Message) {
    if (!message.content.startsWith('$')) return;

    const serial = message.content.split('$')[1].split(' ')[0];
    const item = GetItemFromSerial(serial);
    if (!item) return message.reply({
        content:`:x: Invalid Serial No.`,
        flags: MessageFlags.SuppressNotifications
    });

    const owner = client.users.cache.get(item.original_owner);

    // only coins are supported, so we can just assume its a coin if its type is customization
    if (item.type == 'customization') message.reply({
        content:`Information on **Tracked:tm: ${GetEmoji(COIN_EMOJIS_DONE[item.data.base])} ${CUSTOMIZTAION_ID_NAMES[item.data.base]}** (\`${serial}\`)\nOriginally crafted by **${owner?.displayName || 'Unknown User'}** on <t:${Math.round(item.creation_time/1000)}>\nThis coin has ${(item.data as TrackableCoin).flips} flips since crafting!`
    });
}