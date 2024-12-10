import { ChatInputCommandInteraction } from "discord.js";
import { AddOneToInventory, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { GEMS, ITEM_TYPE } from "../okash/items";


const PRICES: {
    [key: string]: number
} = {
    'streak restore':15000
}

export async function HandleCommandBuy(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const wanted_item = interaction.options.getString('item')!.toLowerCase();

    if (!PRICES[wanted_item]) return interaction.editReply({
        content:(wanted_item == 'weighted coin')?`:crying_cat_face: Silly **${interaction.user.displayName}**, you should know I don't sell gambling items here!`:`<:cat_raised:1315878043578925056> Looks like I don't sell that here, sorry!`
    });

    const price = PRICES[wanted_item!.toLowerCase()];
    const wallet = GetWallet(interaction.user.id);
    
    if (wallet < price) return interaction.editReply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but you'll need <:okash:1315058783889657928> OKA**${price-wallet}** more okash to buy that!`
    });

    RemoveFromWallet(interaction.user.id, price);

    switch (wanted_item) {
        case 'streak restore': case 'g00':
            AddOneToInventory(interaction.user.id, ITEM_TYPE.GEM, GEMS.STREAK_RESTORE);
            break;
        default:
            break;
    }

    interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you purchased one \`${wanted_item}\` for <:okash:1315058783889657928> OKA**${price}**! Your new balance is OKA**${wallet-price}**.`});
}