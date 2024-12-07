import { APIEmbedField, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { GetAllWallets } from "../okash/wallet";


const PLACE_EMOJI = [
    ':first_place:',
    ':second_place:',
    ':third_place:',
    ':medal:',
    ':medal:'
];

export async function HandleCommandLeaderboard(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    // get all users+balances
    const balances = GetAllWallets();

    balances.sort((a, b) => {
        if (a.amount > b.amount) return -1;
        if (a.amount < b.amount) return 1;
        return 0;
    });

    // create the embed
    const embed = new EmbedBuilder()
        .setTitle(`okash Leaderboard for **${interaction.guild?.name}**`)
        .setAuthor({name:interaction.guild!.name})
        .setColor(0x9d60cc);

    
    let i = 0;
    let fields: Array<APIEmbedField> = [];

    balances.forEach(balance => {
        if (i == 5) return;
        
        const username = interaction.client.users.cache.find((user) => user.id == balance.user_id)?.displayName; 
        fields.push({name: `${PLACE_EMOJI[i]} **${i+1}.** ${username}`, value: `<@!${balance.user_id}> has OKA**${balance.amount}**!`, inline: false});
        
        i++;
    });

    embed.setFields(fields);

    interaction.editReply({embeds:[embed]});
}