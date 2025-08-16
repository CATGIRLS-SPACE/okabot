import {Message, MessageFlags, Snowflake, TextChannel} from "discord.js";
import {ParseRelativeTime} from "./relativeTimeParser";
import { join } from "node:path";
import { BASE_DIRNAME, client } from "../../../index";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { GetUserSupportStatus } from "../../../util/users";

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
        let message;
        try {
            message = await channel.messages.fetch(r.message.message);
        } catch (err) {
            return channel.send({content: `:crying_cat_face: <@${r.user}>, you asked me to remind you of a message, but it seems it was deleted. sorry...`});
        }

        message.reply({
            content: `:bell: hey <@${r.user}>! you asked me to remind you about this <t:${r.time}:R>!`
        });
        REMINDERS.splice(REMINDERS.indexOf(r), 1);
    }, (r.time - Math.round(d.getTime()/1000)) * 1000);
}

function GetBoostStatus(user_id: string, guild_id: Snowflake): boolean {
    const guild = client.guilds.cache.get(guild_id)!;
    const member = guild.members.cache.get(user_id)!;
    return member.roles.cache.some((role) => role.id === "1317337805512507483");
}

export function RemindLater(message: Message) {
    const parsed_time = ParseRelativeTime(message.content.split(' ')[1]);
    if (isNaN(parsed_time)) return message.reply({
        content: `please tell me when, like "o.remind 3h" for 3 hours from now! supported suffixes are \`s, m, h, d, w, mo, y\`.`,
        flags: [MessageFlags.SuppressNotifications]
    });

    if (parsed_time < 0) return message.reply({
        content: 'sorry, i can\'t go back in time to remind you earlier... i would if i could...',
        flags: [MessageFlags.SuppressNotifications]
    });

    if (!message.reference) return message.reply({
        content: `you need to tell me which message to remind you about!`,
        flags: [MessageFlags.SuppressNotifications]
    });

    let r = 0;
    for (const reminder of REMINDERS) {
        if (reminder.user == message.author.id) r++;
    }
    if (r >= 5 && !GetBoostStatus(message.author.id, '1019089377705611294') && !GetUserSupportStatus(message.author.id)) {
        return message.reply({
            content: `sorry, but you've already got 5 reminders scheduled.\nboost CATGIRL CENTRAL or support okawaffles to get access to up to 25 reminders.`,
            flags: [MessageFlags.SuppressNotifications]
        });
    } else if (r >= 25) {
        return message.reply({
            content: `sorry, but you've already got 10 reminders scheduled.`,
            flags: [MessageFlags.SuppressNotifications]
        });
    }

    const d = new Date();
    console.log(`remind in ${parsed_time} sec`);

    const reminder: Reminder = {
        message: {
            guild: '1019089377705611294',
            channel: message.channelId,
            message: message.reference!.messageId!
        },
        time: Math.round(d.getTime()/1000) + parsed_time,
        user: message.author.id
    };

    REMINDERS.push(reminder);
    ScheduleReminder(reminder);

    message.react('👍');

    // save reminders
    writeFileSync(join(BASE_DIRNAME, 'db', 'user-remind.oka'), JSON.stringify({reminders:REMINDERS}), 'utf-8');
}