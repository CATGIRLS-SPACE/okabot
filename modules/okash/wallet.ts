import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path";
import { ITEMS } from "./items";
import { Logger } from "okayulogger";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {Snowflake} from "discord.js";
import {BASE_DIRNAME} from "../../index";

export interface Wallet {
    version: number,
    wallet: number,
    bank: number,
    inventory: {
        other: Array<ITEMS>
    }
}

const WALLET_PATH = join(__dirname, '..', '..', 'money', 'wallet');
const L = new Logger('wallet');


/**
 * Modifies a user's okash amount in either their bank or wallet
 * @param user_id The Snowflake of the user to modify
 * @param location The bank or wallet
 * @param amount How much to add/subtract (use negative to subtract)
 * @param fallback_to_bank When removing from the wallet, should it fall back and subtract from the bank?
 */
export function ModifyOkashAmount(user_id: Snowflake, location: 'wallet' | 'bank', amount: number, fallback_to_bank: boolean = false) {
    const profile = GetUserProfile(user_id);
    const add = amount > 0;
    amount = Math.abs(amount);

    if (amount > 50000) L.warn(`LARGE OKASH CHANGE FOR ACCOUNT ${user_id}! -${amount}`);

    if (add) {
        // adding:
        if (location == 'wallet') profile.okash.wallet += amount;
        if (location == 'bank') profile.okash.bank += amount;
    } else {
        // removing:
        if (location == 'wallet') {
            // do we need to fall back?
            if (profile.okash.wallet < amount && fallback_to_bank) {
                profile.okash.bank -= amount - profile.okash.wallet;
                profile.okash.wallet = 0;
            } else profile.okash.wallet -= amount;
        }

        if (location == 'bank') profile.okash.bank -= amount;
    }

    UpdateUserProfile(user_id, profile);
}

export function AddToWallet(user_id: string, amount: number) {
    ModifyOkashAmount(user_id, 'wallet', amount>0?amount:0);
}

export function RemoveFromWallet(user_id: string, amount: number, fallback_to_bank: boolean = false) {
    ModifyOkashAmount(user_id, 'wallet', -(amount>0?amount:0), fallback_to_bank);
}

export function AddToBank(user_id: string, amount: number) {
    ModifyOkashAmount(user_id, 'bank', amount>0?amount:0)
}

export function RemoveFromBank(user_id: string, amount: number) {
    ModifyOkashAmount(user_id, 'bank', -(amount>0?amount:0))
}

/**
 * Easy shorthand of `GetUserProfile(user_id).okash.wallet`
 */
export function GetWallet(user_id: string, include_bank: boolean = false): number {
    const profile = GetUserProfile(user_id);

    return include_bank?profile.okash.wallet+profile.okash.bank:profile.okash.wallet;
}

/**
 * Easy shorthand of `GetUserProfile(user_id).okash.bank`
 */
export function GetBank(user_id: string): number {
    return GetUserProfile(user_id).okash.bank;
}

export function GetAllWallets(): Array<{user_id: string, amount: number}> {
    let wallets: Array<{user_id: string, amount: number}> = [];

    readdirSync(join(BASE_DIRNAME, 'profiles')).forEach(file => {
        const user_id: string = file.split('.oka')[0];
        const profile = GetUserProfile(user_id);
        const amount = profile.okash.wallet + profile.okash.bank;
        wallets.push({user_id, amount});
    });

    return wallets;
}

/**
 * @Deprecated Use `GetUserProfile(user_id).inventory` instead
 */
export function GetInventory(user_id: string) {
    return GetUserProfile(user_id).inventory;
}

export function RemoveOneFromInventory(user_id: string, item: ITEMS) {
    const profile = GetUserProfile(user_id);
    profile.inventory.splice(profile.inventory.indexOf(item), 1);
    UpdateUserProfile(user_id, profile);
}

export function AddOneToInventory(user_id: string, item: ITEMS) {
    const profile = GetUserProfile(user_id);
    profile.inventory.push(item);
    UpdateUserProfile(user_id, profile);
}

/**
 * @Deprecated This will no longer work. It is only here to prevent typescript errors while I work on migrating the rest of the code to v3 profiles.
 */
export function Dangerous_WipeAllWallets() {
    readdirSync(WALLET_PATH).forEach(file => {
        const wallet_data: Wallet = JSON.parse(readFileSync(join(WALLET_PATH, file), 'utf-8'));
        wallet_data.bank = 0;
        wallet_data.wallet = 0;
        writeFileSync(join(WALLET_PATH, file), JSON.stringify(wallet_data), 'utf-8');
        L.info(`Wiped wallet file ${file}`);
    });
}