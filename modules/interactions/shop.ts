import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";


const AVAILABLE_GEMS = new EmbedBuilder()
    .setTitle('Available items to buy with your okash')
    .setAuthor({name:'okabot Shop'})
    .setColor(0x9d60cc)
    .setFields(
        {name:'<:g00:1315084985589563492> Streak Restore gem', value:'<:okash:1315058783889657928> OKA**15,000**'}
    )


const AVAILABLE_CUSTOMIZATIONS = new EmbedBuilder()
    .setTitle('Available customizations to buy with your okash')
    .setDescription('*These provide no advantage other than making you look cooler than your friends*')
    .setAuthor({name:'okabot Shop'})
    .setColor(0x9d60cc)
    .setFields(
        {name:'<:cff_dgreen:1316187558375456859> Dark Green Coin - <:okash:1315058783889657928> OKA**2,500**', value:'*Even though it\'s not weighted, you feel you might be luckier if you used it.*\nAllows you to use a dark green coin when you coinflip'},
        {name:'<:cff_dblue:1316187532349935728> Dark Blue Coin - <:okash:1315058783889657928> OKA**2,500**', value:'*This coin has a deep color resembling the ocean. Hopefully you can make your pockets just as deep using this!*\nAllows you to use a dark blue coin when you coinflip'},
        {name:'<:cff_red:1316187598791905280> Red Coin - <:okash:1315058783889657928> OKA**2,500**', value:'*It resembles strawberries. Using this coin makes you feel like you can do anything, maybe even climbing a mountain?*\nAllows you to use a red coin when you coinflip'},
        {name:'<:cff_blue:1316187504067739699> Light Blue Coin - <:okash:1315058783889657928> OKA**5,000**', value:'*Even the sky struggles to reach this shade of pure blue. Just like waffles struggles to win her coinflips.*\nAllows you to use a light blue coin when you coinflip'},
        {name:'<:cff_purple:1316175038042472491> Purple Coin - <:okash:1315058783889657928> OKA**10,000**', value:'*It\'s the slightly-less-rich man\'s pink coin, but you don\'t care, because it still looks just as cool.*\nAllows you to use a purple coin when you coinflip'},
        {name:'<:cff_pink:1316173446803226665> Pink Coin - <:okash:1315058783889657928> OKA**25,000**', value:'*You feel rich just thinking about buying it. Or maybe you\'re feeling more feminine. Oh well, basically the same thing, right?*\nAllows you to use a pink coin when you coinflip.'},
        {name:'<a:cff_rainbow:1316224243855261776> Rainbow Coin - <:okash:1315058783889657928> OKA**100,000**', value:'*This Mythical coin, said to be gifted from the gods, is almost useless, however it looks extremely cool.*\nAllows you to use a rainbow coin when you coinflip.'}
    )

export async function HandleCommandShop(interaction: ChatInputCommandInteraction) {

    switch (interaction.options.getString('page')) {
        case 'gems':
            interaction.reply({embeds:[AVAILABLE_GEMS]});
            break;
    
        case 'customization':
            interaction.reply({embeds:[AVAILABLE_CUSTOMIZATIONS]});
            break;

        default:
            interaction.reply({content:'you shouldn\'t get this message. plz contact me and tell me if you get this message!'})
            break;
    }
}