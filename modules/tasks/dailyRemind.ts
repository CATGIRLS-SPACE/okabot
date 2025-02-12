import { Snowflake, TextChannel } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { BASE_DIRNAME, client } from "../..";
import { join } from "path";

const reminders = new Map<Snowflake, {time: number, channel: Snowflake}>();
export const quickdraw = new Map<Snowflake, number>();

/**
 * Schedule a reminder for the daily being available
 * @param time When to remind, in ms
 * @param channel Where to send the message
 */
export function ScheduleDailyReminder(time: number, user_id: string, channel: TextChannel): boolean {
    if (reminders.has(user_id)) return false; // don't set duplicate reminders
    
    const d = new Date();
    reminders.set(user_id, {time, channel: channel.id});
    setTimeout(() => {
        channel.send({
            content:`:clock3: <@${user_id}>, your daily is now available!`
        });
        const dd = new Date();
        quickdraw.set(user_id, dd.getTime());
        reminders.delete(user_id);
    }, time - d.getTime());

    SaveReminders();

    return true;
}

export function LoadReminders() {
    if (!existsSync(join(BASE_DIRNAME, 'db', 'reminder.oka'))) return;
    
    const data: {
        reminders: Array<{user_id: Snowflake, time: number, channel: Snowflake}>
    } = JSON.parse(readFileSync(join(BASE_DIRNAME, 'db', 'reminder.oka'), 'utf-8'));

    data.reminders.forEach(reminder => {
        reminders.set(reminder.user_id, {
            time: reminder.time,
            channel: reminder.channel
        });

        const d = new Date();

        setTimeout(() => {
            (client.channels.cache.get(reminder.channel) as TextChannel)!.send({
                content:`:clock3: <@${reminder.user_id}>, your daily is now available!`
            });
            const dd = new Date();
            quickdraw.set(reminder.user_id, dd.getTime());
            reminders.delete(reminder.user_id);
        }, reminder.time - d.getTime());
    });
}

function SaveReminders() {
    const r: Array<{user_id: Snowflake, time: number, channel: Snowflake}> = [];

    reminders.forEach((val, key) => {
        r.push({
            user_id: key,
            time: val.time,
            channel: val.channel
        });
    });

    writeFileSync(join(BASE_DIRNAME, 'db', 'reminder.oka'), JSON.stringify({reminders:r}), 'utf-8');
}