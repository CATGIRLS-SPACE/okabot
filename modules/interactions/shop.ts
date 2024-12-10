import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";


const AVAILABLE_ITEMS = new EmbedBuilder()
    .setTitle('Available items to buy with your okash')
    .setAuthor({name:'okabot Shop'})
    .setColor(0x9d60cc)
    .setFields(
        {name:'<:g00:1315084985589563492> Streak Restore gem', value:'<:okash:1315058783889657928> OKA**15,000**'}
    )

export async function HandleCommandShop(interaction: ChatInputCommandInteraction) {
    interaction.reply({embeds:[AVAILABLE_ITEMS]});
}