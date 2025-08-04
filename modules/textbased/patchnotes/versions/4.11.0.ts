import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 4.11.0')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- If something breaks, use the /was-there-an-error command to see if it's my fault or not.",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Fixed bugs that would occur when using okabot in non-CGC servers.",
            "- Renamed achievement `Oops, I Forgot!` to `Deciduous Arborist`.",
            "- Re-enabled robbing globally.",
            "- Re-enabled achievement `Get Outta Here!`.",
            "- Fixed blackjack cooldown.",
            "- Added small streak notifier in blackjack.",
            "- Disabled okash notifications by default.",
            "- Fixed cooldown and casino passes not working.",
            "- Renamed *controversial* casino pass shorthands.",
            "- Fixed coinflip being able to flip floats.",
            "- Removed and disabled autoban+achievement.",
            "- okabot no longer awards XP to users who have not agreed to rules.",
            "- Blackjack does not reset win streak when you tie.",
            "- Fixed ability to remind in the past.",
            "- Restriction message shows reason and expiry time.",
            "- okabot no longer mentions users in level-up messages.",
            "- Disabled level-up messages in specific guilds.",
            "- Fixed missing multipliers in slots.",
            "-# Added new badges to some users.",
            "-# Added admin shorthand for granting achievement.",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );