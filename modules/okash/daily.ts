import {AddOneToInventory, ModifyOkashAmount} from "./wallet"
import {ChatInputCommandInteraction, TextChannel} from "discord.js"
import {ITEMS} from "./items"
import {AddXP} from "../levels/onMessage"
import {Achievements, GrantAchievement} from "../passive/achievement"
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {LANG_INTERACTION, LangGetFormattedString} from "../../util/language";

const ONE_DAY = 86400000;

/**
 * Claim a daily reward and calculate the streak amount.
 * @param user_id The Discord user ID who is claiming
 * @param reclaim Set the double_claim flag to true?
 * @param channel The channel to pass to the AddXP call
 * @returns The amount claimed on success, negative time until next daily on failure.
 */
export function ClaimDaily(user_id: string, reclaim: boolean = false, channel: TextChannel): number {

    const profile = GetUserProfile(user_id);
    const d = new Date();

    if (profile.daily.last_claimed + ONE_DAY <= d.getTime() || reclaim) {
        if (profile.daily.streak == 0 || profile.daily.last_claimed + ONE_DAY*2 < d.getTime()) {
            console.log('daily is new streak');
            profile.daily.restore_to = profile.daily.streak;
            profile.daily.streak = 1;
            profile.daily.last_claimed = d.getTime();
            // profile.daily.streak.double_claimed = false;

            UpdateUserProfile(user_id, profile);
            ModifyOkashAmount(user_id, 'wallet', 1500);

            AddOneToInventory(user_id, ITEMS.WEIGHTED_COIN_ONE_USE);

            AddXP(user_id, channel, 50);

            return 1500;
        }
        console.log('daily is existing streak');

        // has streak, use multipliers!
        profile.daily.streak += 1;
        if (profile.daily.streak >= profile.daily.restore_to && profile.daily.restored) {
            profile.daily.restore_to = 0;
            profile.daily.restored = false;
        }
        profile.daily.last_claimed = d.getTime();
        // profile.daily.streak.double_claimed = reclaim;

        // 5% bonus each day capped at 100%
        let streak_multiplier = (profile.daily.streak - 1)* 0.05;
        if (streak_multiplier > 1) streak_multiplier = 1;

        const amount = Math.round(1500 + (1500 * streak_multiplier));

        UpdateUserProfile(user_id, profile);
        AddOneToInventory(user_id, ITEMS.WEIGHTED_COIN_ONE_USE);
        ModifyOkashAmount(user_id, 'wallet', amount);

        AddXP(user_id, channel, 55);

        return amount;
    } else return -Math.floor((profile.daily.last_claimed + ONE_DAY)/1000);
}

/**
 * @Deprecated Use `GetUserProfile(user_id).daily.streak` instead.
 */
export function GetDailyStreak(user_id: string): number {
    return GetUserProfile(user_id).daily.streak;
}

/**
 * restore a daily streak with a streak restore gem
 * @param interaction 
 * @returns true if it was restored, false if it wasn't. use this to deduce whether you should "use" a g00 from their inventory
 */
export async function RestoreLastDailyStreak(interaction: ChatInputCommandInteraction): Promise<boolean> {
    const profile = GetUserProfile(interaction.user.id);

    if (profile.daily.streak >= profile.daily.restore_to) {
        await interaction.editReply({
            content: LangGetFormattedString(LANG_INTERACTION.DAILY_SR_FAIL_HIGHER, interaction.okabot.locale, interaction.user.displayName)
        });
        return false;
    }

    profile.daily.streak = profile.daily.restore_to;
    profile.daily.restored = true;

    await interaction.editReply({
        content: LangGetFormattedString(LANG_INTERACTION.DAILY_SR_OK, interaction.okabot.locale, interaction.user.displayName, profile.daily.restore_to)
    });

        GrantAchievement(interaction.user, Achievements.DAILY_SR, interaction.channel as TextChannel);

    UpdateUserProfile(interaction.user.id, profile);

    return profile.daily.restored;
}