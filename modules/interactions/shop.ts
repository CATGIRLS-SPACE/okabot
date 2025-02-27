import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { EMOJI, GetEmoji } from "../../util/emoji";
import { GetUserProfile } from "../user/prefs";


const AVAILABLE_CUSTOMIZATIONS_COIN = new EmbedBuilder()
    .setTitle('Available coinflip customizations to buy with your okash')
    .setDescription('*These provide no advantage other than making you look cooler than your friends*\n*Those with the shop voucher emoji can be bought with one.*')
    .setAuthor({name:'okabot Shop'})
    .setColor(0x9d60cc)
    .setFields(
        {name:`${GetEmoji('cff_rainbow')} Rainbow Coin - ${GetEmoji('okash')} OKA**1,000,000**`, value:'*This Mythical coin, said to be gifted from the gods, is almost useless, however it looks extremely cool.*.'},
        {name:`${GetEmoji('cff_pink')} Pink Coin - ${GetEmoji('okash')} OKA**100,000**`, value:'*You feel rich just thinking about buying it. Or maybe you\'re feeling more feminine. Oh well, basically the same thing, right?*.'},
        {name:`${GetEmoji('cff_purple')} Purple Coin - ${GetEmoji('okash')} OKA**50,000**`, value:'*It\'s the slightly-less-rich man\'s pink coin, but you don\'t care, because it still looks just as cool.*'},
        {name:`${GetEmoji('cff_blue')} Light Blue Coin - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`, value:'*Even the sky struggles to reach this shade of pure blue. Just like Kaden struggles to win his weighted coinflips.*'},
        {name:`${GetEmoji('cff_red')} Red Coin - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**5,000**`, value:'*It resembles strawberries. Using this coin makes you feel like you can do anything, maybe even climbing a mountain?*'},
        {name:`${GetEmoji('cff_dgreen')} Dark Green Coin - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**2,500**`, value:'*Even though it\'s not weighted, you feel you might be luckier if you used it.*'},
        {name:`${GetEmoji('cff_dblue')} Dark Blue Coin - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**2,500**`, value:'*This coin has a deep color resembling the ocean. Hopefully you can make your pockets just as deep using this!*'},
    );

const AVAILABLE_CUSTOMIZATIONS_PROFILE = new EmbedBuilder()
    .setTitle('Available profile customizations to buy with your okash')
    .setAuthor({name:'okabot Shop'})
    .setColor(0x9d60cc)
    .setFields(
        {name:`User Banner Level Background - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**25,000**`,value:`Enables your level banner to use your Discord profile banner (requires Discord Nitro)`},
        {name:`Red Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`,value:`One time change of your level banner's bar color to red`},
        {name:`Green Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`,value:`One time change of your level banner's bar color to green`},
        {name:`Blue Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`,value:`One time change of your level banner's bar color to blue`},
        {name:`Pink Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`,value:`One time change of your level banner's bar color to pink`},
        {name:`Custom Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**15,000**`,value:`One time change of your level banner's bar color to any color you want (hex color code)`},
        {name:`Reset Level Bar - Free`,value:`Resets your level bar to the default colors.`},
    )

export async function HandleCommandShop(interaction: ChatInputCommandInteraction) {

    switch (interaction.options.getString('page')) {
        case 'gems':
            const profile = GetUserProfile(interaction.user.id);
            // has user-specific items so we must generate it here
            const AVAILABLE_ITEMS = new EmbedBuilder()
                .setTitle('Available items to buy with your okash')
                .setAuthor({name:'okabot Shop'})
                .setColor(0x9d60cc)
                .setFields(
                    {name:`${GetEmoji('g00')} Streak Restore`, value:`${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**15,000**`},
                    {name:`XP Level Up`, value:`${GetEmoji('okash')} OKA**${10000 + (profile.level.level * 50)}**`},
                    {name:`Casino Pass - 10 Minutes`, value:`${GetEmoji('okash')} OKA**25,000**`},
                    {name:`Casino Pass - 30 Minutes`, value:`${GetEmoji('okash')} OKA**60,000**`},
                    {name:`Casino Pass - 60 Minutes`, value:`${GetEmoji('okash')} OKA**100,000**`},
                );

            
            interaction.reply({embeds:[
                AVAILABLE_ITEMS
            ]});
            break;
    
        case 'customization.coin':
            interaction.reply({embeds:[AVAILABLE_CUSTOMIZATIONS_COIN]});
            break;

        case 'customization.profile':
            interaction.reply({embeds:[AVAILABLE_CUSTOMIZATIONS_PROFILE]});
            break;

        default:
            interaction.reply({content:'Shop error: invalid page'})
            break;
    }
}


export const ShopSlashCommand = new SlashCommandBuilder()
    .setName('shop').setNameLocalization('ja', 'カタログ')
    .setDescription('Get the shop item and price listings').setDescriptionLocalization('ja', 'アイテムのカタログを見る')
    .addStringOption(option => option.setName('page').setDescription('The shop category to display').addChoices(
        {name:'Items', value: 'gems', name_localizations:{ja:'アイテム'}},
        {name:'Customization - Coinflip', value:'customization.coin', name_localizations:{ja:'コイントスのカスタマイズ'}},
        {name:'Customization - Profile', value:'customization.profile', name_localizations:{ja:'プロフィールのカスタマイズ'}},
    ).setRequired(true))