import {ActionRowBuilder, ButtonBuilder, ButtonStyle, DMChannel} from "discord.js";
import {DANGER_DeleteProfile} from "../user/prefs";

const WARNING_MESSAGE = `
# :warning: Warning :warning:
## This decision is irreversible, both by okabot and bot admins.
## You will NOT be able to recover ANY part of this data, and admins will NOT be able to help you.
### Do not continue with this process unless you are absolutely sure you want to delete ALL of your data.
Your profile will be completely deleted. Most data that pertains to your account will be **lost forever**.
okabot will completely delete all data pertaining to you that does not affect other users.
Data which will not be deleted includes data such as:
- statistic records (example: coinflip float records)
- Tracked:tm: items metadata (creator data)
Due to the nature of okabot, after your profile is deleted, it may be internally recreated.
However, data pertaining to you will not be stored unless you run a command and agree to the rules again.
`;

const AcknowledgeButton = new ButtonBuilder()
    .setLabel('I understand, delete my data.')
    .setCustomId('understand')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('☑️')

const FirstComponentBar = new ActionRowBuilder()
    .addComponents(AcknowledgeButton);

const FinalizeButton = new ButtonBuilder()
    .setLabel('I am sure, delete my data.')
    .setCustomId('delete')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('☑️')

const SecondComponentBar = new ActionRowBuilder()
    .addComponents(FinalizeButton);

export async function StartDataDeletionRequest(channel: DMChannel) {
    const message = await channel.send({
        content: WARNING_MESSAGE,
        components: [FirstComponentBar as never]
    });

    const collector = message.createMessageComponentCollector({ time: 300_000 });

    collector.on('collect', (i => {
        if (i.customId == 'understand') {
            return i.update({
                content: WARNING_MESSAGE + '\n\n:warning: **This is your final chance to stop now.**',
                components: [SecondComponentBar as never]
            });
        }
        if (i.customId == 'delete') {
            i.update({ components: [] });
            channel.send('Deleting your data...');
            DANGER_DeleteProfile(i.user.id);
            setTimeout(() => channel.send(`:crying_cat_face: Goodbye, **${i.user.displayName}**. It was nice knowing you.`), 3_000);
        }
    }));
}