import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { AddToWallet } from "./wallet"

export interface DailyData {
    version: number,
    last_get: {
        time: number
    },
    streak: {
        count: number,
        restored: boolean
    }
}

const DAILY_PATH = join(__dirname, '..', '..', 'money', 'daily');

function CheckVersion(user_id: string) {
    const data: string = readFileSync(join(DAILY_PATH, `${user_id}.oka`), 'utf8');

    try {
        // try and parse, if it fails then it needs upgrading
        const daily_version = JSON.parse(data).version;
        if (daily_version != 1) throw new Error();
        return;
    } catch {
        // old data, must be upgraded
        const previous_time = parseInt(data);

        const new_data: DailyData = {
            version: 1,
            last_get: {
                time: previous_time
            },
            streak: {
                count: 0,
                restored: false
            }
        }

        writeFileSync(join(DAILY_PATH, `${user_id}.oka`), JSON.stringify(new_data), 'utf8');
    }
}

const ONE_DAY = 86400000;


/**
 * Claim a daily reward and calculate the streak amount.
 * @param user_id The Discord user ID who is claiming
 * @returns The amount claimed on success, negative time until next daily on failure.
 */
export function ClaimDaily(user_id: string): number {
    CheckVersion(user_id);

    const data: DailyData = JSON.parse(readFileSync(join(DAILY_PATH, `${user_id}.oka`), 'utf8'));
    const d = new Date();

    if (data.last_get.time + ONE_DAY <= d.getTime()) {
        if (data.streak.count == 0 || data.last_get.time + ONE_DAY*2 < d.getTime()) {
            console.log('daily is new streak');
            data.streak.count = 1;
            data.last_get.time = d.getTime();

            AddToWallet(user_id, 750);
            writeFileSync(join(DAILY_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');

            return 750;
        }
        console.log('daily is existing streak');

        // has streak, use multipliers!
        data.streak.count += 1;
        data.last_get.time = d.getTime();

        // 5% bonus each day capped at 100%
        let streak_multiplier = (data.streak.count - 1)* 0.05;
        if (streak_multiplier > 1) streak_multiplier = 1;

        const amount = Math.round(750 + (750 * streak_multiplier));

        AddToWallet(user_id, amount);

        writeFileSync(join(DAILY_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');
        return amount;
    } else return -Math.floor((data.last_get.time + ONE_DAY)/1000);
}


export function GetDailyStreak(user_id: string): number {
    CheckVersion(user_id);

    const data: DailyData = JSON.parse(readFileSync(join(DAILY_PATH, `${user_id}.oka`), 'utf8'));
    return data.streak.count;
}