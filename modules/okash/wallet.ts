import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path";
import { GEMS, ITEM_TYPE, ITEMS } from "./items";
import { Logger } from "okayulogger";
import { EventType, RecordMonitorEvent } from "../../util/monitortool";
import { client } from "../..";
import { EMOJI, GetEmoji } from "../../util/emoji";
import { GrantAchievement } from "../passive/achievement";

export interface Wallet {
    version: number,
    wallet: number,
    bank: number,
    inventory: {
        gems: Array<GEMS>,
        other: Array<ITEMS>
    }
}

const WALLET_PATH = join(__dirname, '..', '..', 'money', 'wallet');
const L = new Logger('wallet');

function CheckVersion(user_id: string) {
    if (!existsSync(join(WALLET_PATH, `${user_id}.oka`))) {
        console.log('no wallet, init one...');
        const new_data: Wallet = {
            version: 2,
            wallet: 0,
            bank: 0,
            inventory: {
                gems: [],
                other: []
            }
        };

        writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(new_data), 'utf8');
        return;
    }
    const data = readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8');

    try {
        let version = JSON.parse(data).version;
        // if it's already v1 then just need ot upgrade

        if (version == 2) return;

        if (version == 1) {
            const wallet: Wallet = JSON.parse(data);
            const new_data: Wallet = {
                version: 2,
                wallet: wallet.wallet,
                bank: wallet.bank,
                inventory: {
                    gems: [],
                    other: []
                }
            };
            wallet.version = 2;
            writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(new_data), 'utf8');
        } else throw new Error();
        return;
    } catch {
        const new_data: Wallet = {
            version: 2,
            wallet: parseInt(data),
            bank: 0,
            inventory: {
                gems: [],
                other: []
            }
        };

        writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(new_data), 'utf8');
    }
}


export function AddToWallet(user_id: string, amount: number) {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    data.wallet = Math.floor(data.wallet + amount);

    if (amount > 50000)
        L.warn(`LARGE WALLET ADDITION FOR ACCOUNT ${user_id}! +${amount}`);
    
    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');

    RecordMonitorEvent(EventType.BALANCE_CHANGE, {user_id, amount}, `${amount} okash was added to ${user_id}'s wallet`);
}

export function RemoveFromWallet(user_id: string, amount: number) {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    data.wallet = Math.floor(data.wallet - amount);

    if (amount > 50000)
        L.warn(`LARGE WALLET REMOVAL FOR ACCOUNT ${user_id}! -${amount}`);
    
    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');

    RecordMonitorEvent(EventType.BALANCE_CHANGE, {user_id, amount}, `${amount} okash was removed from ${user_id}'s wallet`);
}

export function AddToBank(user_id: string, amount: number) {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    data.bank = Math.floor(data.bank + amount);

    if (amount > 50000)
        L.warn(`LARGE BANK ADDITION FOR ACCOUNT ${user_id}! +${amount}`);
    
    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');

    RecordMonitorEvent(EventType.BANK_CHANGE, {user_id, amount}, `${amount} okash was added to ${user_id}'s bank`);
}

export function RemoveFromBank(user_id: string, amount: number) {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    data.bank = Math.floor(data.bank - amount);

    if (amount > 50000)
        L.warn(`LARGE BANK REMOVAL FOR ACCOUNT ${user_id}! -${amount}`);
    
    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');

    RecordMonitorEvent(EventType.BANK_CHANGE, {user_id, amount}, `${amount} okash was removed from ${user_id}'s bank`);
}

export function GetWallet(user_id: string): number {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));
    data.wallet = Math.floor(data.wallet);
    return data.wallet;
}

export function GetBank(user_id: string): number {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));
    data.bank = Math.floor(data.bank);

    if (data.bank > 500_000) {
        AddToWallet(user_id, data.bank - 500_000);
        data.wallet += (data.bank - 500_000);
        RemoveFromBank(user_id, data.bank - 500_000);
        
        try {
            client.users.cache.get(user_id)?.send({
                content: `Your bank balance was over ${GetEmoji(EMOJI.OKASH)} OKA**500,000**. It has been adjusted to ${GetEmoji(EMOJI.OKASH)} OKA**500,000** and the extra (${GetEmoji(EMOJI.OKASH)} OKA**${data.bank - 500_000}**) was moved to your wallet.`
            });
        } catch (err) {
            console.log(`wasn't able to send them a message, ignoring, they'll find out eventually.`);
        }
        data.bank -= (data.bank - 500_000);
    }

    return data.bank;
}

export function GetAllWallets(): Array<{user_id: string, amount: number}> {
    let wallets: Array<{user_id: string, amount: number}> = [];

    readdirSync(WALLET_PATH).forEach(file => {
        const user_id: string = file.split('.oka')[0];
        const amount = GetWallet(user_id) + GetBank(user_id);
        wallets.push({user_id, amount});
    });

    return wallets;
}

export function GetInventory(user_id: string) {
    CheckVersion(user_id);

    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    return data.inventory;
}

export function RemoveOneFromInventory(user_id: string, type: ITEM_TYPE, item: GEMS | ITEMS) {
    CheckVersion(user_id);

    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    switch (type) {
        case ITEM_TYPE.GEM:
            if (data.inventory.gems.indexOf(item as GEMS) == -1) return;
            data.inventory.gems.splice(data.inventory.gems.indexOf(item as GEMS), 1)
            break;
    
        case ITEM_TYPE.ITEM:
            if (data.inventory.other.indexOf(item as ITEMS) == -1) return;
            data.inventory.other.splice(data.inventory.other.indexOf(item as ITEMS), 1)
            break;
    }

    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');

    RecordMonitorEvent(EventType.POCKETS_MODIFIED, {user_id, type, item}, `${type}-type item ${item} was removed from ${user_id}'s pockets`);
}

export function AddOneToInventory(user_id: string, type: ITEM_TYPE, item: GEMS | ITEMS) {
    CheckVersion(user_id);

    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    switch (type) {
        case ITEM_TYPE.GEM:
            data.inventory.gems.push(item as GEMS);
            break;
    
        case ITEM_TYPE.ITEM:
            data.inventory.other.push(item as ITEMS);
            break;
    }

    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');    

    RecordMonitorEvent(EventType.POCKETS_MODIFIED, {user_id, type, item}, `${type}-type item ${item} was added to ${user_id}'s pockets`);
}

export function Dangerous_WipeAllWallets() {
    readdirSync(WALLET_PATH).forEach(file => {
        const wallet_data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, file), 'utf-8'));
        wallet_data.bank = 0;
        wallet_data.wallet = 0;
        writeFileSync(join(WALLET_PATH, file), JSON.stringify(wallet_data), 'utf-8');
        L.info(`Wiped wallet file ${file}`);
    });
}