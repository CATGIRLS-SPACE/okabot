import {ChatInputCommandInteraction, PermissionFlagsBits} from "discord.js";

/**
 * Check if okabot has the correct permissions to function.
 * If returns false, it will automatically handle replying to the interaction.
 * @param interaction ChatInputCommandInteraction from any slash command.
 * @returns true if permissions are compatible, false otherwise.
 */
export async function CheckRequiredPermissions(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (interaction.channel?.isDMBased()) return true;
    // return true;

    const guild = await interaction.client.guilds.fetch(interaction.guildId!);
    if (!guild) return false;
    const me = guild.roles.botRoleFor(interaction.client.user);
    if (!me) return false;

    // let history, react, attachments, embeds, manage, sendmsg, sendmsgthread;

    const history = me.permissions.has(PermissionFlagsBits.ReadMessageHistory);
    const react = me.permissions.has(PermissionFlagsBits.AddReactions);
    const attachments = me.permissions.has(PermissionFlagsBits.AttachFiles);
    const embeds = me.permissions.has(PermissionFlagsBits.EmbedLinks);
    const manage = me.permissions.has(PermissionFlagsBits.ManageMessages);
    const sendmsg = me.permissions.has(PermissionFlagsBits.SendMessages);
    const sendmsgthread = me.permissions.has(PermissionFlagsBits.SendMessagesInThreads);

    const has_perms = history && react && attachments && embeds && manage && sendmsg && sendmsgthread;

    if (!has_perms) {
        try {
            interaction.reply({
                content:':crying_cat_face: I don\'t have the right permissions to function! Please update my permissions!\n' +
                    [
                        (history ? '✅ ' : '❌ ') + 'Read Message History',
                        (react ? '✅ ' : '❌ ') + 'Add Reactions',
                        (attachments ? '✅ ' : '❌ ') + 'Attach Files',
                        (embeds ? '✅ ' : '❌ ') + 'Embed Links',
                        (manage ? '✅ ' : '❌ ') + 'Manage Messages',
                        (sendmsg ? '✅ ' : '❌ ') + 'Send Messages',
                        (sendmsgthread ? '✅ ' : '❌ ') + 'Send Messages in Threads',
                        '\nAlternatively, you *could* just enable the Administrator permission. This is a dangerous permission to grant, don\'t do it unless you absolutely trust me!'
                    ].join('\n')
            });
        } catch {
            console.error('failed to send wrong perms message');
        }
    }

    return has_perms;
}