import {Message, MessageFlags, Snowflake, TextChannel} from "discord.js";
import {ParseRelativeTime} from "./relativeTimeParser";
import { join } from "node:path";
import { BASE_DIRNAME, client } from "../../..";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

interface Reminder {
    user: Snowflake,
    time: number,
    message: {
        guild: Snowflake,
        channel: Snowflake,
        message: Snowflake,
    }
}

let REMINDERS: Array<Reminder> = [];

export function LoadUserReminders() {
    const reminders_path = join(BASE_DIRNAME, 'db', 'user-remind.oka');
    if (!existsSync(reminders_path)) writeFileSync(reminders_path, '{"reminders":[]}', 'utf-8');

    REMINDERS = JSON.parse(readFileSync(reminders_path, 'utf-8')).reminders;

    const now = Math.round((new Date()).getTime() / 1000)

    REMINDERS.forEach(r => {
        if (now < r.time) ScheduleReminder(r);
        else REMINDERS.splice(REMINDERS.indexOf(r), 1);
    });
}

function ScheduleReminder(r: Reminder) {
    const d = new Date();
    setTimeout(async () => {
        const channel = await client.channels.fetch(r.message.channel) as TextChannel;
        if (!channel) return console.error('reminder\'s channel could not be found');
        const message = await channel.messages.fetch(r.message.message);
        if (!message) return channel.send({content: `:crying_cat_face: <@${r.user}>, you asked me to remind you of a message, but it seems it was deleted. sorry...`});

        message.reply({
            content: `<@${r.user}>, you asked me to remind you about this <t:${r.time}:R>`
        });
        REMINDERS.splice(REMINDERS.indexOf(r), 1);
    }, r.time - Math.round(d.getTime()/1000));
}

export function RemindLater(message: Message) {
    const parsed_time = ParseRelativeTime(message.content.split('o.remind ')[1]);
    if (isNaN(parsed_time)) return message.reply({
        content: `please tell me when, like "o.remind 3h" for 3 hours from now!`,
        flags: [MessageFlags.SuppressNotifications],
    });

    if (!message.reference) return message.reply({
        content: `you need to tell me which message to remind you about!`
    });

    const d = new Date();
    console.log(`remind in ${parsed_time} sec`);

    const reminder: Reminder = {
        message: {
            guild: message.guildId!,
            channel: message.channelId,
            message: message.reference!.messageId!
        },
        time: Math.round(d.getTime()/1000) + parsed_time,
        user: message.author.id
    };

    REMINDERS.push(reminder);
    ScheduleReminder(reminder);

    // save reminders
    writeFileSync(join(BASE_DIRNAME, 'db', 'user-remind.oka'), JSON.stringify(REMINDERS), 'utf-8');
}