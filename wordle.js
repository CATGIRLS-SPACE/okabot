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

/**
 * 
 * @param {import("discord.js").Interaction<import("discord.js").CacheType>} interaction 
 */
async function getWordleOnDay(interaction) {
    const date = interaction.options.getString('date');
    const rgx = new RegExp('[0-9]{4}-[0-9]{2}-[0-9]{2}');

    const d = new Date(`${date} 00:00:00 GMT-0600`);
    const td = new Date();
    
    const month = td.getMonth()+1<10?`0${td.getMonth()+1}`:td.getMonth()+1;
    const day = td.getDate()<10?`0${td.getDate()}`:td.getDate();
    const today = `${td.getFullYear()}-${month}-${day}`;

    if (!rgx.test(date)) return await interaction.editReply({
        content: `Error: Your date must match the format \`YYYY-MM-DD\`. For example, today's date is ${today}.`, 
        ephemeral: true
    });
    
    if (date == today) return await interaction.editReply({
        content:'Error: You cannot get the Wordle result for the current day.',
        ephemeral: true
    })

    const response = await fetch(`https://nytimes.com/svc/wordle/v2/${date}.json`);
    const solution = (await response.json()).solution + '';

    const dateInfo = `${DAY_OF_WEEK[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

    await interaction.editReply({
        content: `The Wordle solution on ${dateInfo} was **${solution.toUpperCase()}**.`,
        ephemeral: false
    });
}


module.exports = {getWordleOnDay};