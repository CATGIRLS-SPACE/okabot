import {
    ChatInputCommandInteraction,
    GuildMember,
    Message,
    MessageFlags,
    Snowflake,
    TextChannel,
    User
} from "discord.js";
import { GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs";
import { CalculateOkashReward, CalculateTargetXP, LEVEL_NAMES_EN, LEVEL_NAMES_JA } from "./levels";
import {AddOneToInventory, AddToWallet} from "../okash/wallet";
import { EventType, RecordMonitorEvent } from "../../util/monitortool";
import { Achievements, GrantAchievement } from "../passive/achievement";
import {client, DEV, GetLastLocale} from "../..";
import { EMOJI, GetEmoji } from "../../util/emoji";
import {ITEM_NAMES} from "../interactions/pockets";
import {ITEMS} from "../okash/items";
import {LANG_INTERACTION, LangGetAutoTranslatedString} from "../../util/language";

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


export async function AddXP(user_id: Snowflake, channel: TextChannel, amount?: number) {
    const profile = GetUserProfile(user_id);
    
    profile.leveling.current_xp += amount || Math.floor(Math.random() * 7) + 3; // anywhere between 3-10 xp per message
    let target_xp = CalculateTargetXP(profile.leveling.level, 0);

    if (profile.leveling.current_xp >= target_xp) {
        profile.leveling.current_xp = profile.leveling.current_xp - target_xp; // carry over extra XP
        profile.leveling.level++;

        target_xp = CalculateTargetXP(profile.leveling.level, 0);

        const okash_reward = CalculateOkashReward(profile.leveling.level);
        AddToWallet(user_id, okash_reward);

        let earned_item = 'none';

        if (profile.leveling.level % 10 == 0) {
            // 10, 20, 30 etc. will give an exlb
            earned_item = ITEM_NAMES[ITEMS.LOOTBOX_EX].name;
            AddOneToInventory(user_id, ITEMS.LOOTBOX_EX);
        } else if (profile.leveling.level % 5 == 0) {
            // 5, 15, 25, etc will give a rlb
            earned_item = ITEM_NAMES[ITEMS.LOOTBOX_RARE].name;
            AddOneToInventory(user_id, ITEMS.LOOTBOX_RARE);
        } else {
            // other levels just give a common lootbox
            earned_item = ITEM_NAMES[ITEMS.LOOTBOX_COMMON].name;
            AddOneToInventory(user_id, ITEMS.LOOTBOX_COMMON);
        }

        // `Congrats, <@${user_id}>! You're now level **${LEVEL_NAMES_EN[profile.leveling.level - 1]}** (${profile.leveling.level})!\nYou earned ${GetEmoji(EMOJI.OKASH)} OKA**${okash_reward}** and 1x **${earned_item}**!\nYour next level will be in **${target_xp}XP**.`,

        channel.send({
            content: await LangGetAutoTranslatedString(LANG_INTERACTION.LEVEL_LEVELUP, GetLastLocale(user_id), user_id, LEVEL_NAMES_EN[profile.leveling.level - 1], profile.leveling.level, okash_reward, earned_item, target_xp),
            flags: [MessageFlags.SuppressNotifications]
        });

        RecordMonitorEvent(EventType.GAIN_LEVEL, {user_id:user_id, level:profile.leveling.level}, `${user_id} is now level ${profile.leveling.level}`)
    
        UpdateUserProfile(user_id, profile);

        const user = client.users.cache.get(user_id)!;

        // achievements
        if (profile.leveling.level >= 10) {
            GrantAchievement(user, Achievements.LEVEL_10, channel);
            // also gets image permissions at level 10
            const guild = client.guilds.cache.get(!DEV?'1019089377705611294':'748284249487966282');
            if (!guild) throw new Error('Could not get guild when attempting to give image permissions role!');
            const member = guild.members.cache.get(user_id);
            if (!member) throw new Error('Could not get member from guild when attempting to give image permissions role!');

            if (!member.roles.cache.some(role => role.name === 'image perms (lvl 10)')) {
                const role = guild.roles.cache.find(role => role.name === 'image perms (lvl 10)');
                if (!role) throw new Error('Image permissions role does not exist in this guild, ensure there is one named exactly "image perms (lvl 10)"!');
                member.roles.add(role);
            }
        }
        if (profile.leveling.level >= 20) GrantAchievement(user, Achievements.LEVEL_20, channel);
        if (profile.leveling.level >= 30) GrantAchievement(user, Achievements.LEVEL_30, channel);
        if (profile.leveling.level >= 40) GrantAchievement(user, Achievements.LEVEL_40, channel);
        if (profile.leveling.level >= 50) GrantAchievement(user, Achievements.LEVEL_50, channel);
        if (profile.leveling.level >= 60) GrantAchievement(user, Achievements.LEVEL_60, channel);
        if (profile.leveling.level >= 70) GrantAchievement(user, Achievements.LEVEL_70, channel);
        if (profile.leveling.level >= 80) GrantAchievement(user, Achievements.LEVEL_80, channel);
        if (profile.leveling.level >= 90) GrantAchievement(user, Achievements.LEVEL_90, channel);
        if (profile.leveling.level >= 100) GrantAchievement(user, Achievements.LEVEL_100, channel);
        if (profile.leveling.level >= 101) GrantAchievement(user, Achievements.LEVEL_BEYOND, channel);
        return;
    }

    UpdateUserProfile(user_id, profile);

    RecordMonitorEvent(EventType.GAIN_XP, {user_id, xp:profile.leveling.current_xp}, `${user_id} now has ${profile.leveling.current_xp} XP`);
}