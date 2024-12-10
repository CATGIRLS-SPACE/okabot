import { APIEmbedField, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { GetAllWallets } from "../okash/wallet";
import { Logger } from "okayulogger";

const L = new Logger('leaderboard');

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

    for (const balance of balances) {
        if (i == 5) break;
        
        try {

            const user = await interaction.client.users.fetch(balance.user_id);
            const isMember = await interaction.guild?.members.fetch(user.id).then(() => true).catch(() => false);
            
            if (isMember) {
                fields.push({name: `${PLACE_EMOJI[i]} **${i+1}.** ${user.displayName || '(user not in server)'}`, value: `<@!${balance.user_id}> has <:okash:1315058783889657928> OKA**${balance.amount}**!`, inline: false});   
                i++;
            }
        } catch (err) {
            L.error(err as string);
        }
    }

    embed.setFields(fields);

    interaction.editReply({embeds:[embed]});
}