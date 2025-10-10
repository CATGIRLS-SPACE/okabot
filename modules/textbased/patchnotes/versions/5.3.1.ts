import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 5.3.1 bugfix update')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- (Full-access server exclusive) Added d# and d$ shorthands for searching Danbooru. Usage examples: `d#9981938`, `d$nia_(xenoblade) rating:g`, `d$nia_(xenoblade) rating:g > 3 offset 2`. This feature is disabled by default and must be enabled using the `/server-preferences` command.",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Fixed a bug where sending a DM to okabot would throw four errors at once.",
            "- Fixed a bug where okabot would occassionally add \"4?8?\" or \"48\" instead of \"ᓀ‸ᓂ\" to his Gemini responses.",
            "- Removed AC modules.",
            "- Updated some achievement difficulties.",
            "- Added notes to Gemini responses to make aware of policies.",
            "- Updated permissions check and moved outside of index.ts",
            "- Removed pets.",
            "- Fixed a bug where okabot could respond twice to Gemini queries.",
            "- Slightly tweaked the way the `ServerFeature.eastereggs` preference works.",
            "- Updated /help pages.",
            "- Updated available settings in /server-preferences.",
            "- Reverted model change to gemini-2.5-flash-lite.",
            "- Brewed Hot Cockolate <3"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );