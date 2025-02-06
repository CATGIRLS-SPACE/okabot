import { Message, TextChannel } from "discord.js";

let last_cached_date: string, last_cached_word: string;

export async function WordleCheck(message: Message) {
    if (message.channel.id == "1310486655257411594") { // #wordle
        let d = new Date();
        const month = d.getMonth()+1<10?`0${d.getMonth()+1}`:d.getMonth()+1;
        const day = d.getDate()<10?`0${d.getDate()}`:d.getDate();
        let date = `${d.getFullYear()}-${month}-${day}`; // format date to match the wordle api

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

        if (message.content.toLowerCase().includes(word)) { 
            message.delete();
            (message.channel as TextChannel).send(`<@!${message.author.id}>, don't spoil today's word!!`);
        }
    }
}