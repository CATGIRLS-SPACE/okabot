import { Snowflake, TextChannel } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { BASE_DIRNAME, client } from "../../index";
import { join } from "path";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";

const reminders = new Map<Snowflake, {time: number, channel: Snowflake}>();
export const quickdraw = new Map<Snowflake, number>();

/**
 * Schedule a reminder for the daily being available
 * @param time When to remind, in ms
 * @param user_id Who it is for
 * @param channel Where to send the message
 */
export function ScheduleDailyReminder(time: number, user_id: string, channel: TextChannel): boolean {
    if (reminders.has(user_id)) return false; // don't set duplicate reminders
    
    const d = new Date();
    reminders.set(user_id, {time, channel: channel.id});
    setTimeout(() => {
        if (!CheckFeatureAvailability(channel.guild!.id, ServerFeature.daily)) return;

        channel.send({
            content:`:clock3: <@${user_id}>, your daily is now available!`
        });
        const dd = new Date();
        quickdraw.set(user_id, dd.getTime());
        reminders.delete(user_id);
        SaveReminders();
    }, time - d.getTime());

    SaveReminders();

    return true;
}

export async function LoadReminders() {
    if (!existsSync(join(BASE_DIRNAME, 'db', 'reminder.oka'))) return;
    
    const data: {
        reminders: Array<{user_id: Snowflake, time: number, channel: Snowflake}>
    } = JSON.parse(readFileSync(join(BASE_DIRNAME, 'db', 'reminder.oka'), 'utf-8'));

    for (const reminder of data.reminders) {
        const d = new Date();

        if (reminder.time > d.getTime()) reminders.set(reminder.user_id, {
            time: reminder.time,
            channel: reminder.channel
        });

        setTimeout(() => {
            const ch = client.channels.cache.get(reminder.channel)!;
            if (!CheckFeatureAvailability((ch as TextChannel).guild!.id, ServerFeature.daily)) return;
            (ch as TextChannel).send({
                content:`:clock3: <@${reminder.user_id}>, your daily is now available!`
            });
            const dd = new Date();
            quickdraw.set(reminder.user_id, dd.getTime());
            reminders.delete(reminder.user_id);
            SaveReminders();
        }, reminder.time - d.getTime());
    }

    SaveReminders();
}

function SaveReminders() {
    const r: Array<{user_id: Snowflake, time: number, channel: Snowflake}> = [];

    console.log('saving reminders...')

    reminders.forEach((val, key) => {
        r.push({
            user_id: key,
            time: val.time,
            channel: val.channel
        });
    });

    writeFileSync(join(BASE_DIRNAME, 'db', 'reminder.oka'), JSON.stringify({reminders:r}), 'utf-8');
}