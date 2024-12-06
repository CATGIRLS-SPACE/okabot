import { ChatInputCommandInteraction, Message, TextChannel } from "discord.js";

const DAY_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

const MONTH = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
]

export async function getWordleOnDay(interaction: ChatInputCommandInteraction) {
    const date = interaction.options.getString('date');
    const rgx = new RegExp('[0-9]{4}-[0-9]{2}-[0-9]{2}');

    const d = new Date(`${date} 00:00:00 GMT-0600`);
    const td = new Date();
    
    const month = td.getMonth()+1<10?`0${td.getMonth()+1}`:td.getMonth()+1;
    const day = td.getDate()<10?`0${td.getDate()}`:td.getDate();
    const today = `${td.getFullYear()}-${month}-${day}`;

    if (!rgx.test(date || '')) return await interaction.editReply({
        content: `Error: Your date must match the format \`YYYY-MM-DD\`. For example, today's date is ${today}.`
    });
    
    if (date == today) return await interaction.editReply({
        content:'Error: You cannot get the Wordle result for the current day.'
    })

    const response = await fetch(`https://nytimes.com/svc/wordle/v2/${date}.json`);
    const solution = (await response.json()).solution + '';

    const dateInfo = `${DAY_OF_WEEK[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

    await interaction.editReply({
        content: `The Wordle solution on ${dateInfo} was **${solution.toUpperCase()}**.`
    });
}

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