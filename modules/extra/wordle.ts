import {GuildMember, Message, TextChannel} from "discord.js";
import {GetWackWordDefinitions} from "../passive/geminidemo";

let last_cached_date: string, last_cached_word: string;

export async function WordleCheck(message: Message) {
    if (message.content.toLowerCase().startsWith("millie's wack words of the day") || message.content.toLowerCase().startsWith("millie's wack word of the day")) return GetWackWordDefinitions(message);

    if (["1310486655257411594","941843973641736253"].includes(message.channel.id)) { // #wordle
        // checking if they're NOT being original, hmph...
        if (message.author.id != "796201956255334452" && (message.content.includes('wack') && message.content.includes("word"))) {
            return message.reply({
                content: `:pouting_cat: **${(message.member as GuildMember).displayName || message.author.displayName}**, I'll trust that you're just chiming in, but if you're trying to take the spotlight...`
            });
        }

        const d = new Date();
        const month = d.getMonth()+1<10?`0${d.getMonth()+1}`:d.getMonth()+1;
        const day = d.getDate()<10?`0${d.getDate()}`:d.getDate();
        const date = `${d.getFullYear()}-${month}-${day}`; // format date to match the wordle api

        let data, json, word;

        // prevents mass requests to wordle api
        if (date != last_cached_date) {
            data = await fetch(`https://nytimes.com/svc/wordle/v2/${date}.json`); // get wordle 
            json = await data.json();
            word = json.solution;

            last_cached_date = date;
            last_cached_word = word;
        } else {
            word = last_cached_word;
        }

        if (message.content.toLowerCase().includes(word) && !message.content.startsWith('||') && !message.content.endsWith('||')) {
            message.delete();
            (message.channel as TextChannel).send(`<@!${message.author.id}>, don't spoil today's word!!`);
        }
    }
}