import { Message, TextChannel } from "discord.js";
import { GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs";
import { CalculateOkashReward, CalculateTargetXP } from "./levels";
import { AddToWallet } from "../okash/wallet";

let XPCooldown: Map<string, number> = new Map<string, number>();

export async function DoLeveling(message: Message) {
    // no spamming for levels allowed
    const d = new Date();
    const current_time = Math.floor(d.getTime() / 1000);
    const cooldown = XPCooldown.get(message.author.id) || 0;
    if (cooldown >= current_time) return;

    // 30 second cooldown between xp gains
    XPCooldown.set(message.author.id, current_time + 30);

    const profile = GetUserProfile(message.author.id);
    profile.level = profile.level || {
        level: 1,
        current_xp: 0
    }

    profile.level.current_xp += Math.floor(Math.random() * 7) + 3; // anywhere between 3-10 xp per message
    let target_xp = CalculateTargetXP(profile.level.level);

    if (profile.level.current_xp >= target_xp) {
        profile.level.current_xp = 0;
        profile.level.level += 1;

        target_xp = CalculateTargetXP(profile.level.level);
        
        const okash_reward = CalculateOkashReward(profile.level.level);
        AddToWallet(message.author.id, okash_reward);

        (message.channel as TextChannel).send(`Congrats, <@${message.author.id}>! You're now level **${profile.level.level}**!\nYou earned <:okash:1315058783889657928> OKA**${okash_reward}**!\nYour next level will be in **${target_xp}XP**.`);
    }

    UpdateUserProfile(message.author.id, profile);
} 