import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";
import {EMOJI, GetEmoji} from "../../util/emoji";


export async function HandleCommandToggle(interaction: ChatInputCommandInteraction) {
    const prefs = GetUserProfile(interaction.user.id);
    const active = interaction.options.getString('active') == 'on';

    switch (interaction.options.getString('setting')) {
        case 'okash_notifications':
            interaction.reply({
                content: active?`${GetEmoji(EMOJI.CAT_SUNGLASSES)} okaaay! i'll send you notifications every time you receive/transfer okash on your account.`:'${GetEmoji(EMOJI.CAT_SUNGLASSES)} too many notifications? i get that, i\'ll chill out with the notifications',
                ephemeral: true 
            
            });
            prefs.okash_notifications = active;
            UpdateUserProfile(interaction.user.id, prefs);
            break;
    
        default:
            break;
    }
}


export const ToggleSlashCommand = new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Change a toggleable okabot setting!')
    .addStringOption(option => option.setName('setting')
        .setDescription('The toggle to change')
        .setRequired(true)
        .addChoices(
            { name:'okash notifications when money is transferred/received on your account', value: 'okash_notifications' }
        ))
    .addStringOption(option => option.setName('active')
        .setDescription('whether you want the option on or off')
        .setRequired(true)
        .addChoices(
            {name:'ON', value:'on'},
            {name:'OFF', value:'off'}
        ))