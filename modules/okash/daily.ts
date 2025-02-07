import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { AddOneToInventory, AddToWallet } from "./wallet"
import { ChatInputCommandInteraction, TextChannel } from "discord.js"
import { ITEM_TYPE, ITEMS } from "./items"
import { AddXP } from "../levels/onMessage"

export interface DailyData {
    version: number,
    last_get: {
        time: number
    },
    streak: {
        count: number,
        last_count: number,
        restored: boolean,
        double_claimed: boolean
    }
}

const DAILY_PATH = join(__dirname, '..', '..', 'money', 'daily');

function CheckVersion(user_id: string) {
    if (!existsSync(join(DAILY_PATH, `${user_id}.oka`))) {
        const new_data: DailyData = {
            version: 2,
            last_get: {
                time: 0
            },
            streak: {
                count: 0,
                last_count: 0,
                restored: false,
                double_claimed: false
            }
        }

        writeFileSync(join(DAILY_PATH, `${user_id}.oka`), JSON.stringify(new_data), 'utf8');
        return;
    }
    const data: string = readFileSync(join(DAILY_PATH, `${user_id}.oka`), 'utf8');

    try {
        // try and parse, if it fails then it needs upgrading
        const daily_version = JSON.parse(data).version;
        if (daily_version != 2) {
            if (daily_version != 1) throw new Error();   

            // just means we need to add the new 
        }
        return;
    } catch {
        // old data, must be upgraded
        const previous_time = parseInt(data);

        const new_data: DailyData = {
            version: 2,
            last_get: {
                time: previous_time
            },
            streak: {
                count: 0,
                last_count: 0,
                restored: false,
                double_claimed: false
            }
        }

        writeFileSync(join(DAILY_PATH, `${user_id}.oka`), JSON.stringify(new_data), 'utf8');
    }
}

const ONE_DAY = 86400000;


/**
 * Claim a daily reward and calculate the streak amount.
 * @param user_id The Discord user ID who is claiming
 * @param reclaim Set the double_claim flag to true?
 * @returns The amount claimed on success, negative time until next daily on failure.
 */
export function ClaimDaily(user_id: string, reclaim: boolean = false, channel: TextChannel): number {
    CheckVersion(user_id);

    const data: DailyData = JSON.parse(readFileSync(join(DAILY_PATH, `${user_id}.oka`), 'utf8'));
    const d = new Date();

    if (data.last_get.time + ONE_DAY <= d.getTime() || reclaim) {
        if (data.streak.count == 0 || data.last_get.time + ONE_DAY*2 < d.getTime()) {
            console.log('daily is new streak');
            data.streak.last_count = data.streak.count;
            data.streak.count = 1;
            data.last_get.time = d.getTime();
            data.streak.restored = false;
            data.streak.double_claimed = false;

            AddToWallet(user_id, 750);
            writeFileSync(join(DAILY_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');

            AddOneToInventory(user_id, ITEM_TYPE.ITEM, ITEMS.WEIGHTED_COIN_ONE_USE);

            AddXP(user_id, channel, 50);

            return 750;
        }
        console.log('daily is existing streak');

        // has streak, use multipliers!
        data.streak.count += 1;
        data.last_get.time = d.getTime();
        data.streak.double_claimed = reclaim;

        // 5% bonus each day capped at 100%
        let streak_multiplier = (data.streak.count - 1)* 0.05;
        if (streak_multiplier > 1) streak_multiplier = 1;

        const amount = Math.round(750 + (750 * streak_multiplier));

        AddToWallet(user_id, amount);
        writeFileSync(join(DAILY_PATH, `${user_id}.oka`), JSON.stringify(data), 'utf8');
        AddOneToInventory(user_id, ITEM_TYPE.ITEM, ITEMS.WEIGHTED_COIN_ONE_USE);

        AddXP(user_id, channel, 55);

        return amount;
    } else return -Math.floor((data.last_get.time + ONE_DAY)/1000);
}


export function GetDailyStreak(user_id: string): number {
    CheckVersion(user_id);

    const data: DailyData = JSON.parse(readFileSync(join(DAILY_PATH, `${user_id}.oka`), 'utf8'));
    return data.streak.count;
}

/**
 * restore a daily streak with a streak restore gem
 * @param user_id 
 * @param interaction 
 * @returns true if it was restored, false if it wasn't. use this to deduce whether you should "use" a g00 from their inventory
 */
export async function RestoreLastDailyStreak(interaction: ChatInputCommandInteraction): Promise<boolean> {
    CheckVersion(interaction.user.id);
    const data: DailyData = JSON.parse(readFileSync(join(DAILY_PATH, `${interaction.user.id}.oka`), 'utf8'));

    if (data.streak.count >= data.streak.last_count) {
        await interaction.editReply({
            content: `:chart_with_downwards_trend: **${interaction.user.displayName}**, your current streak is higher than your previous one, so you can't use a <:g00:1315084985589563492> **Streak Restore** gem right now!`
        });
        return false;
    }

    // false because not implemented
    if (false) {
        await interaction.editReply({
            content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but you can only restore a streak once!`
        })
    }

    data.streak.count = data.streak.last_count;
    data.streak.restored = true;

    await interaction.editReply({
        content:`<:g00:1315084985589563492> **${interaction.user.displayName}**, you've restored your streak to **${data.streak.last_count} days**!`
    });

    writeFileSync(join(DAILY_PATH, `${interaction.user.id}.oka`), JSON.stringify(data), 'utf8');

    return true;
}

/**
 * Claim the daily twice, increasing the streak by one.
 * @param interaction 
 * @returns true if successful, false otherwise
 */
export async function SkipDailyOnce(interaction: ChatInputCommandInteraction): Promise<boolean> {
    CheckVersion(interaction.user.id);
    const data: DailyData = JSON.parse(readFileSync(join(DAILY_PATH, `${interaction.user.id}.oka`), 'utf8'));

    if (data.streak.double_claimed) { 
        interaction.reply({
            content: `:x: Sorry **${interaction.user.displayName}**, but you can only use a Daily Reclaim gem once per day.`
        });
        return false;
    }

    ClaimDaily(interaction.user.id, true, interaction.channel as TextChannel);

    return true;
}