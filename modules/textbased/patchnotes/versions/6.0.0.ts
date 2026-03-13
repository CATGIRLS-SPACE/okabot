import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 6.0.0\n### Say hi to the new major version of okabot!')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- Removed scraps as they were kind of useless. You will be compensated in okash and XP.",
            "- Also removed /craft command.",
            "- Added XP bonuses for Coinflip and Slots winstreaks.",
            "- Added XP bonuses for achievement unlocks.",
            "- The /buy command has been replaced with a revamped /shop command.",
            "- There are now 3 daily challenges to complete, resetting every night at 12AM (America/Chicago)",
            "- Stock fluctuations are now significantly more impactful.",
            "- You now get XP from your daily reward.",
            "- New item: Black Market Token (+ Shard). These are used to buy from the Black Market Shop.",
            "- New item: Hacking Tool. This Black Market item can be used to rob from a user's bank account rather than just their wallet!",
            "- Updated a significant number of various strings throughout okabot.",
            "- New command: /dig. Use this command to wager some okash for a chance to get rare items.",
            "- Dailies now have a chance to drop a Black Market Token Shard.",
            "- Achievement unlock messages now show the corresponding title you unlocked.",
            "- **Achievements solutions are no longer to be discussed publicly, and the descriptions were replaced with Hush-Hush-like descriptions.**",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Minor Changes/Bugfixes",
            "- Fixed a bug where Blackjack did not display streaks properly.",
            "- Fixed a bug where shorthands did not work properly in some commands.",
            "- Fixed a typo where all configuration error messages said \"Mabye\".",
            "- Fixed a bug where a drop string was not fully finished.",
            "- Fixed a bug where you could /use a sticker kit and cause an uncaught exception.",
            "- Fixed a bug where some guild-only commands would show when okabot was installed to your personal apps.",
            "- The profile banner GIF renderer no longer fires if the user does not have an animated profile banner.",
            "- Stock event messages are now @silent messages.",
            "- Updated many item descriptions.",
            "- Updated rules.",
            "- Modernized /sell.",
            "- Moved all profiles into one centralized lowdb database.",
            "- Items are now stored as `Array<ItemData>` instead of `Array<number>`.",
            "- `oka peek` shorthand has been deprecated in place of `oka export`. This returns a gpg-encrypted copy of a user's profile data.",
            "- `oka reload` and `oka dump profile cache` have been deprecated in place of `oka import` for modification of user profile data.",
            "- Scolded okabot for looking at ogutama images while on the clock."
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );