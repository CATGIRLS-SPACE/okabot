import { TextChannel } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { BASE_DIRNAME } from "../..";
import { join } from "path";

const reminders = new Map<string, number>();

/**
 * Schedule a reminder for the daily being available
 * @param time When to remind, in ms
 * @param channel Where to send the message
 */
export function ScheduleDailyReminder(time: number, user_id: string, channel: TextChannel): boolean {
    if (reminders.has(user_id)) return false; // don't set duplicate reminders
    
    const d = new Date();
    reminders.set(user_id, time);
    setTimeout(() => {
        channel.send({
            content:`:clock3: <@${user_id}>, your daily is now available!`
        });
        reminders.delete(user_id);
    }, time - d.getTime());

    SaveReminders();

    return true;
}

export function LoadReminders() {
    if (!existsSync(join(BASE_DIRNAME, 'db', 'reminder.oka'))) return;
    
    const data: {
        reminders: Array<{user_id: string, time: number}>
    } = JSON.parse(readFileSync(join(BASE_DIRNAME, 'db', 'reminder.oka'), 'utf-8'));

    data.reminders.forEach(reminder => {
        reminders.set(reminder.user_id, reminder.time);
    });
}

function SaveReminders() {
    const r: Array<{user_id: string, time: number}> = [];

    reminders.forEach((val, key) => {
        r.push({
            user_id: key,
            time: val
        });
    });

    writeFileSync(join(BASE_DIRNAME, 'db', 'reminder.oka'), JSON.stringify({reminders:r}), 'utf-8');
}