import { ChatInputCommandInteraction } from "discord.js";
import { SkipDailyOnce } from "../okash/daily";
import { GEMS } from "../okash/items";
import { GetWallet } from "../okash/wallet";


export async function HandleCommandUse(interaction: ChatInputCommandInteraction) {
    switch (interaction.options.getString('item')!.toLowerCase()) {
        case 'streak restore':
            
            break;
    
        default:
            break;
    }
}

// GEMS.STREAK_RESTORE
async function item_g00(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const wallet = GetWallet(interaction.user.id);

    const success = await SkipDailyOnce(interaction);

    if (success)
        RemoveOneFromInventory(GEMS.STREAK_RESTORE);
}