import { TextChannel } from "discord.js";

const reminders: Array<string> = [];

/**
 * Schedule a reminder for the daily being available
 * @param time When to remind, in ms
 * @param channel Where to send the message
 */
export function ScheduleDailyReminder(time: number, user_id: string, channel: TextChannel) {
    if (reminders.includes(user_id)) return; // don't set duplicate reminders
    
    const d = new Date();
    reminders.push(user_id);
    setTimeout(() => {
        channel.send({
            content:`:clock3: <@${user_id}>, your daily is now available!`
        });
        reminders.splice(reminders.indexOf(user_id), 1);
    }, time - d.getTime());
}