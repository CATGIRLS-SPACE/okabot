import { ChatInputCommandInteraction, Message, MessageFlags, TextChannel } from "discord.js";
import { GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs";
import { CalculateOkashReward, CalculateTargetXP, LEVEL_NAMES_EN, LEVEL_NAMES_JA } from "./levels";
import { AddToWallet } from "../okash/wallet";
import { EventType, RecordMonitorEvent } from "../../util/monitortool";
import { Achievements, GrantAchievement } from "../passive/achievement";
import { client } from "../..";
import { EMOJI, GetEmoji } from "../../util/emoji";

let XPCooldown: Map<string, number> = new Map<string, number>();

export async function DoLeveling(message: Message) {
    // no spamming for levels allowed
    const d = new Date();
    const current_time = Math.floor(d.getTime() / 1000);
    const cooldown = XPCooldown.get(message.author.id) || 0;
    if (cooldown >= current_time) return;

    // 30 second cooldown between xp gains
    XPCooldown.set(message.author.id, current_time + 30);

    AddXP(message.author.id, message.channel as TextChannel);
} 


export async function AddXP(user_id: string, channel: TextChannel, amount?: number) {
    const profile = GetUserProfile(user_id);
    
    profile.level.current_xp += amount || Math.floor(Math.random() * 7) + 3; // anywhere between 3-10 xp per message
    let target_xp = CalculateTargetXP(profile.level.level, profile.level.prestige || 0);

    if (profile.level.current_xp >= target_xp) {
        profile.level.current_xp = profile.level.current_xp - target_xp; // carry over extra XP
        profile.level.level++;

        target_xp = CalculateTargetXP(profile.level.level, profile.level.prestige || 0);

        const okash_reward = CalculateOkashReward(profile.level.level, profile.level.prestige || 0);
        AddToWallet(user_id, okash_reward);
        
        channel.send({
            content: `Congrats, <@${user_id}>! You're now level **${LEVEL_NAMES_EN[(profile.level.level - 1) - ((profile.level.prestige || 0) * 100)]}** (${profile.level.level})!\nYou earned ${GetEmoji(EMOJI.OKASH)} OKA**${okash_reward}**!\nYour next level will be in **${target_xp}XP**.`,
            flags: [MessageFlags.SuppressNotifications]
        });

        RecordMonitorEvent(EventType.GAIN_LEVEL, {user_id, level:profile.level.level}, `${user_id} is now level ${profile.level.level}`)
    
        UpdateUserProfile(user_id, profile);

        const user = client.users.cache.get(user_id);

        // achievements
        if (profile.level.level >= 10) GrantAchievement(user!, Achievements.LEVEL_10, channel);
        if (profile.level.level >= 20) GrantAchievement(user!, Achievements.LEVEL_20, channel);
        if (profile.level.level >= 30) GrantAchievement(user!, Achievements.LEVEL_30, channel);
        if (profile.level.level >= 40) GrantAchievement(user!, Achievements.LEVEL_40, channel);
        if (profile.level.level >= 50) GrantAchievement(user!, Achievements.LEVEL_50, channel);
        if (profile.level.level >= 60) GrantAchievement(user!, Achievements.LEVEL_60, channel);
        if (profile.level.level >= 70) GrantAchievement(user!, Achievements.LEVEL_70, channel);
        if (profile.level.level >= 80) GrantAchievement(user!, Achievements.LEVEL_80, channel);
        if (profile.level.level >= 90) GrantAchievement(user!, Achievements.LEVEL_90, channel);
        if (profile.level.level >= 100) GrantAchievement(user!, Achievements.LEVEL_100, channel);
        if (profile.level.level >= 101) GrantAchievement(user!, Achievements.LEVEL_BEYOND, channel);
        return;
    }

    UpdateUserProfile(user_id, profile);

    RecordMonitorEvent(EventType.GAIN_XP, {user_id, xp:profile.level.current_xp}, `${user_id} now has ${profile.level.current_xp} XP`);
}