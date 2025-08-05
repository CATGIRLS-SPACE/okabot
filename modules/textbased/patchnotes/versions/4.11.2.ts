import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 4.11.2')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- Removed `Undoubtedly Cheating`.",
            "- Removed Daily achievements for 60, 100, and 365 days.",
            "- Removed `Making History`.",
            "- Removed all leveling achievements."
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Fixed a bug where Cherry Blossom Card Deck IDs were inconsistent in Tracking Devices.",
            "- Fixed a bug where the `xpl` shorthand did not work in /buy.",
            "- Fixed a bug where buying a casino pass would not insert the item into your inventory.",
            "- Changed bank robbing achievement from 50K to 10K okash.",
            "- Re-enabled roulette.",
            "- Added an alternative way to attain `Not Quite Gacha`.",
            "- Fixed a bug where blackjack would not award XP on a loss.",
            "- Fixed a bug where `oka release` would not actually release gamble locks.",
            "-# Added alternative UUID implementation for when node:crypto is not available.",
            "-# TSC now drops sourcemaps on compile.",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );