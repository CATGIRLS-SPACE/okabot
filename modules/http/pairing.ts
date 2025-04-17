import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction, Client,
    MessageFlags,
    Snowflake, User
} from "discord.js";
import {client, CONFIG} from "../../index";
import {Logger} from "okayulogger";
import {AuthorizeLogin, DenyLogin} from "./server";

const L = new Logger('pairing');

/*
    This file will handle pairing using /pair
    as well as keeping the pair information,
    such as whether an account is privileged to
    access http/management.
 */


interface PairedConnection {
    username: string,
    user_id: Snowflake,
    privileged: boolean, // whether the account can use admin features
}
export const PrivilegedConnections = new Map<string, PairedConnection>();

// pairing code and whether it needs to be privileged or not
const PairingCodes = new Map<string, boolean>();

export async function HandleCommandPair(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({flags:[MessageFlags.Ephemeral]});

    const code = interaction.options.getString('code', true);

    if (!PairingCodes.has(code)) return interaction.editReply({
        content: `:x: Invalid pairing code. Please double-check your input, or try reloading your page.`
    });


}


// --- websocket authorizing via DMs ---

const acceptLoginButton = new ButtonBuilder()
    .setCustomId('accept-login')
    .setLabel('✅ Allow Login')
    .setStyle(ButtonStyle.Success);

const denyLoginButton = new ButtonBuilder()
    .setCustomId('deny-login')
    .setLabel('❌ Deny Login')
    .setStyle(ButtonStyle.Danger);

const loginBar = new ActionRowBuilder()
    .addComponents(
        acceptLoginButton,
        denyLoginButton
    );

export async function SendLoginRequest(username: string, session: string): Promise<boolean> {
    try {
        const user = client.users.cache.find((user) => user.username == username);
        if (!user) throw new Error(`failed to find user ${username}`);

        const direct_message = await user.send({
            content: '## :closed_lock_with_key: __**AUTHENTICATION REQUEST**__\nDo you want to allow login to the okabot management page?\nYou have 60 seconds to allow login, otherwise it will be automatically cancelled.',
            components: [loginBar as any]
        });

        const collector = direct_message.createMessageComponentCollector({
            filter: (i: any) => i.user.id === user.id,
            time: 60_000
        });

        collector.on('collect', async (i) => {
            if (i.customId == 'accept-login') {
                L.info(`login accepted for ${username}`);
                direct_message.edit({
                    content: '## :unlock: __**AUTHENTICATION REQUEST**__\n:white_check_mark: Authentication request accepted, you may return to the management page.',
                    components: []
                });
                PrivilegedConnections.set(session, {
                    username: user.username,
                    privileged: CONFIG.permitted_to_use_shorthands.includes(user.id),
                    user_id: user.id
                })
                AuthorizeLogin(session, user.id);
            } else if (i.customId == 'deny-login') {
                L.info(`manual deny login for ${username}`);
                direct_message.edit({
                    content: '## :lock: __**AUTHENTICATION REQUEST**__\n:x: Authentication request denied, you will not be logged in.',
                    components: []
                });
                DenyLogin(session, user.id);
            }
        });

        return true;
    } catch (err) {
        L.error(err as string);
        return false;
    }
}