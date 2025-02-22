import {ChatInputCommandInteraction, MessageFlags, Snowflake} from "discord.js";


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

// pairing code and whether it needs to be privileged or not
const PairingCodes = new Map<string, boolean>();

export async function HandleCommandPair(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({flags:[MessageFlags.Ephemeral]});

    const code = interaction.options.getString('code', true);

    if (!PairingCodes.has(code)) return interaction.editReply({
        content: `:x: Invalid pairing code. Please double-check your input, or try reloading your page.`
    });


}