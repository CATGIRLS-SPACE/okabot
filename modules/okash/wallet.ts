import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path";
import { GEMS, ITEMS } from "./items";

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

function CheckVersion(user_id: string) {
    if (!existsSync(join(WALLET_PATH, `${user_id}.oka`))) {
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
            writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(wallet), 'utf8');
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
    
    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');
}

export function RemoveFromWallet(user_id: string, amount: number) {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    data.wallet = Math.floor(data.wallet - amount);
    
    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');
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
    return data.bank;
}

export function GetAllWallets(): Array<{user_id: string, amount: number}> {
    let wallets: Array<{user_id: string, amount: number}> = [];

    readdirSync(WALLET_PATH).forEach(file => {
        const user_id: string = file.split('.oka')[0];
        const amount = GetWallet(user_id);
        wallets.push({user_id, amount});
    });

    return wallets;
}