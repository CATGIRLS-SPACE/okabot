import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('There\'s a new okabot update!\n# okabot 6.1.0\n')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- Common lootboxes can now drop Scratch Tickets.",
            "- More strings have i18n translation support.",
            "- Some Russian translations by native speaker Linatto were added. Russian will no longer auto-machine-translate.",
            "- XP was modernized to be exponential rather than linear. You may notice your level decreasing next time you earn XP. This is to balance the new ways to earn XP.",
            "- Privacy policy is now available at https://oka.bot/privacy. Terms of service is now available at https://oka.bot/terms.",
            "- Actually added the Bank Robbery Tool, instead of SAYING I did and never ACTUALLY doing it."
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Minor Changes/Bugfixes",
            "- Fixed a ridiculous number of i18n bugs.",
            "- Fixed a bunch of little random bugs that occurred.",
            "- Begin implementation of premium server features to move away from \"full access\" servers.",
            "- Begin implementation of new okabot Panel features.",
            "- Fixed a bug where Tracked:tm: Decks would display the coin description.",
            "- Added some missing emojis for items.",
            "- Scolded okabot for looking at MayaBura images while on the clock.\n-# okay, fine, I don't blame him, it's pretty cute..."
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );