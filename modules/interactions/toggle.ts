import { ChatInputCommandInteraction } from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";


export async function HandleCommandToggle(interaction: ChatInputCommandInteraction) {
    const prefs = GetUserProfile(interaction.user.id);
    const active = interaction.options.getString('active') == 'on';

    switch (interaction.options.getString('setting')) {
        case 'okash_notifications':
            interaction.reply({
                content: active?'<:cat_money:1315862405607067648> okaaay! i\'ll send you notifications every time you receive/transfer okash on your account.':'<:cat_sunglasses:1315853022324326482> too many notifications? i get that, i\'ll chill out with the notifications',
                ephemeral: true 
            
            });
            prefs.okash_notifications = active;
            UpdateUserProfile(interaction.user.id, prefs);
            break;
    
        default:
            break;
    }
}