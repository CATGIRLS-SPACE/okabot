import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path";

export interface Wallet {
    version: number,
    wallet: number,
    bank: number
}

const WALLET_PATH = join(__dirname, '..', '..', 'money', 'wallet');

function CheckVersion(user_id: string) {
    if (!existsSync(join(WALLET_PATH, `${user_id}.oka`))) {
        const new_data: Wallet = {
            version: 1,
            wallet: 0,
            bank: 0
        };

        writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(new_data), 'utf8');
        return;
    }
    const data = readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8');

    try {
        let version = JSON.parse(data).version;
        if (version != 1) throw new Error();
        return;
    } catch {
        const new_data: Wallet = {
            version: 1,
            wallet: parseInt(data),
            bank: 0
        };

        writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(new_data), 'utf8');
    }
}


export function AddToWallet(user_id: string, amount: number) {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    data.wallet += amount;
    
    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');
}

export function RemoveFromWallet(user_id: string, amount: number) {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));

    data.wallet -= amount;
    
    writeFileSync(join(WALLET_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');
}

export function GetWallet(user_id: string): number {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));
    return data.wallet;
}

export function GetBank(user_id: string): number {
    CheckVersion(user_id);
    const data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, `${user_id}.oka`), 'utf8'));
    return data.bank;
}