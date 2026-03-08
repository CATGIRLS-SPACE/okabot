import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    LabelBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder, TextChannel,
    TextDisplayBuilder
} from "discord.js";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {GetUserProfile} from "../user/prefs";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";
import {ITEM_ID_NAMES, ITEMS} from "../okash/items";
import {AddOneToInventory, RemoveFromWallet, RemoveOneFromInventory} from "../okash/wallet";
import {AddXP} from "../levels/onMessage";
import {CalculateTargetXP} from "../levels/levels";


const AVAILABLE_CUSTOMIZATIONS_COIN = new EmbedBuilder()
    .setTitle('Available coinflip customizations to buy with your okash')
    .setDescription('*These provide no advantage other than making you look cooler than your friends*\n*Those with the shop voucher emoji can be bought with one.*')
    .setAuthor({name:'okabot Shop'})
    .setColor(0x9d60cc)
    .setFields(
        {name:`${GetEmoji('cff_rainbow')} Rainbow Coin - ${GetEmoji('okash')} OKA**1,000,000**`, value:'*This Mythical coin, said to be gifted from the gods, is almost useless, however it looks extremely cool.*.'},
        {name:`${GetEmoji('cff_pink')} Pink Coin - ${GetEmoji('okash')} OKA**100,000**`, value:'*You feel rich just thinking about buying it. Or maybe you\'re feeling more feminine. Oh well, basically the same thing, right?*.'},
        {name:`${GetEmoji('cff_purple')} Purple Coin - ${GetEmoji('okash')} OKA**50,000**`, value:'*It\'s the slightly-less-rich man\'s pink coin, but you don\'t care, because it still looks just as cool.*'},
        {name:`${GetEmoji('cff_blue')} Light Blue Coin - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`, value:'*Even the sky struggles to reach this shade of pure blue. Just like Kaden struggles to win his weighted coinflips.*'},
        {name:`${GetEmoji('cff_red')} Red Coin - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**5,000**`, value:'*It resembles strawberries. Using this coin makes you feel like you can do anything, maybe even climbing a mountain?*'},
        {name:`${GetEmoji('cff_dgreen')} Dark Green Coin - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**2,500**`, value:'*Even though it\'s not weighted, you feel you might be luckier if you used it.*'},
        {name:`${GetEmoji('cff_dblue')} Dark Blue Coin - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**2,500**`, value:'*This coin has a deep color resembling the ocean. Hopefully you can make your pockets just as deep using this!*'},
    );

const AVAILABLE_CUSTOMIZATIONS_PROFILE = new EmbedBuilder()
    .setTitle('Available profile customizations to buy with your okash')
    .setAuthor({name:'okabot Shop'})
    .setColor(0x9d60cc)
    .setFields(
        {name:`User Banner Level Background - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**25,000**`,value:`Enables your level banner to use your Discord profile banner (requires Discord Nitro)`},
        {name:`Red Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`,value:`One time change of your level banner's bar color to red`},
        {name:`Green Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`,value:`One time change of your level banner's bar color to green`},
        {name:`Blue Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`,value:`One time change of your level banner's bar color to blue`},
        {name:`Pink Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**10,000**`,value:`One time change of your level banner's bar color to pink`},
        {name:`Custom Level Bar - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**15,000**`,value:`One time change of your level banner's bar color to any color you want (hex color code)`},
        {name:`Reset Level Bar - Free`,value:`Resets your level bar to the default colors.`},
        {name:`Sticker Kit ${GetEmoji('okash')} OKA**250,000**`,value:`A base kit to put a sticker on your profile banner. Additional purchase for sticker choice is required.`},
    )

const AVAILABLE_CUSTOMIZATIONS_DECK = new EmbedBuilder()
    .setTitle('Available card decks to buy with your okash')
    .setAuthor({name:'okabot Shop'})
    .setColor(0x9d60cc)
    .setFields(
        {name:`${GetEmoji('cb_t')}${GetEmoji('c5_t')}${GetEmoji('cr_t')} Trans Card Deck - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**25,000**`,value:`A card deck no different than the rest, but it lets you know that being trans is OK!`},
        {name:`${GetEmoji('cb_s')}${GetEmoji('c5_s')}${GetEmoji('cr_s')} Cherry Blossom Card Deck - ${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**50,000**`,value:`A card deck with pretty flowers and pink numbers on it.`},
    )

export async function HandleCommandShop(interaction: ChatInputCommandInteraction) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.okash)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Maybe ask a server admin to enable it?'
    });

    switch (interaction.options.getString('page')) {
        case 'gems':
            { const profile = GetUserProfile(interaction.user.id);
            // has user-specific items so we must generate it here
            const AVAILABLE_ITEMS = new EmbedBuilder()
                .setTitle('Available items to buy with your okash')
                .setAuthor({name:'okabot Shop'})
                .setColor(0x9d60cc)
                .setFields(
                    {name:`${GetEmoji('g00')} Streak Restore (\`sr\`)`, value:`${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**15,000**`},
                    {name:`XP Level Up (\`xpl\`)`, value:`${GetEmoji('okash')} OKA**${10000+(profile.leveling.level * 2500)}**`},
                    {name:`:credit_card: Casino Pass - 10 Minutes (\`cas10\`)`, value:`${GetEmoji(EMOJI.SHOP_VOUCHER)} ${GetEmoji('okash')} OKA**25,000**`},
                    {name:`:credit_card: Casino Pass - 30 Minutes (\`cas30\`)`, value:`${GetEmoji('okash')} OKA**60,000**`},
                    {name:`:credit_card: Casino Pass - 60 Minutes (\`cas60\`)`, value:`${GetEmoji('okash')} OKA**100,000**`},
                    {name:`Drop Boost - 15 Minutes (\`db15\`)`, value:`${GetEmoji('okash')} OKA**15,000**`},
                    {name:`Drop Boost - 30 Minutes (\`db30\`)`, value:`${GetEmoji('okash')} OKA**50,000**`},
                    {name:`Scratch Ticket`, value:`${GetEmoji('okash')} OKA**10,000**`},
                );

            
            interaction.reply({embeds:[
                AVAILABLE_ITEMS
            ]});
            break; }
    
        case 'customization.coin':
            interaction.reply({embeds:[AVAILABLE_CUSTOMIZATIONS_COIN]});
            break;

        case 'customization.card':
            interaction.reply({embeds:[AVAILABLE_CUSTOMIZATIONS_DECK]});
            break;

        case 'customization.profile':
            interaction.reply({embeds:[AVAILABLE_CUSTOMIZATIONS_PROFILE]});
            break;

        default:
            interaction.reply({content:'Shop error: invalid page'})
            break;
    }
}


/*
    Shop V2
    Replaces need for /buy command hopefully
*/

const CUSTOMIZATIONS_COIN_MODAL = new ModalBuilder()
    .setCustomId('shopModalCoin')
    .setTitle('Coinflip Customizations Shop')
    .addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent('-# These are purely visual and provide no advantage (other than making you look cooler than your friends!). Items with "SV" next to their price can be exchanged for a Shop Voucher.'),
    )
    .addLabelComponents(
        new LabelBuilder()
            .setLabel('Whatcha wanna buy?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('shopModalCoinSelection')
                    .setPlaceholder('Pick a coin, flip the coin.')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Dark Blue Coin - (SV) OKA2,500')
                            .setEmoji(GetEmoji(EMOJI.COIN_DARK_BLUE_STATIONARY))
                            .setDescription('This coin has a deep color resembling the ocean. Hopefully this can make your pockets just as deep.')
                            .setValue('dbc'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Dark Green Coin - (SV) OKA2,500')
                            .setEmoji(GetEmoji(EMOJI.COIN_DARK_GREEN_STATIONARY))
                            .setDescription('Even though it\'s not weighted, you still feel luckier when you use it.')
                            .setValue('dgc'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Red Coin - (SV) OKA5,000')
                            .setEmoji(GetEmoji(EMOJI.COIN_RED_STATIONARY))
                            .setDescription('Red, like strawberries! This coin makes you feel like you can do anything, even climbing a mountain!')
                            .setValue('rc'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Light Blue Coin - (SV) OKA10,000')
                            .setEmoji(GetEmoji(EMOJI.COIN_BLUE_STATIONARY))
                            .setDescription('Even the sky struggles to reach this shade of blue. Just like you\'re struggling to win your flips.')
                            .setValue('lbc'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Purple Coin - OKA50,000')
                            .setEmoji(GetEmoji(EMOJI.COIN_PURPLE_STATIONARY))
                            .setDescription('The slightly-less-rich man\'s pink coin, but you don\'t care, cause it\'s just as cool!')
                            .setValue('ppc'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Pink Coin - OKA100,000')
                            .setEmoji(GetEmoji(EMOJI.COIN_PINK_STATIONARY))
                            .setDescription('"Pink is for girls"? I\'ll do you one better: Pink is for rich people. Beat that.')
                            .setValue('pc'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Rainbow Coin - OKA1,000,000')
                            .setEmoji(GetEmoji(EMOJI.COIN_RAINBOW_STATIONARY))
                            .setDescription('This mythical coin, said to be gifted from a god, is almost useless... but it looks extremely cool.')
                            .setValue('rbc')
                    ).setRequired(true)
            ),
        new LabelBuilder()
            .setLabel('Use a Shop Voucher?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('useVoucher')
                    .setPlaceholder('This only applies if vouchers are allowed.')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Heck yea!')
                            .setEmoji(GetEmoji(EMOJI.SHOP_VOUCHER))
                            .setDescription('If you don\'t have a voucher, this option will still use okash.')
                            .setValue('yes'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Maybe later...')
                            .setEmoji('❌')
                            .setDescription('This purchase will be completed with okash')
                            .setValue('no')
                    ).setRequired(true)
            )
    );

const CUSTOMIZATIONS_CARDS_MODAL = new ModalBuilder()
    .setCustomId('shopModalCards')
    .setTitle('Card Game Customizations Shop')
    .addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent('-# These are purely visual and provide no advantage (other than making you look cooler than your friends!). Items with "SV" next to their price can be exchanged for a Shop Voucher.'),
    )
    .addLabelComponents(
        new LabelBuilder()
            .setLabel('Whatcha wanna buy?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('shopModalCardSelection')
                    .setPlaceholder('Pick a deck. Any deck.')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Trans Card Deck - (SV) OKA25,000')
                            .setEmoji(GetEmoji(EMOJI.CARD_BACK_TRANS))
                            .setDescription('A card deck that\'s a little bit different, but being different is okay!')
                            .setValue('tcd'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Sakura Card Deck - (SV) OKA50,000')
                            .setEmoji(GetEmoji(EMOJI.CARD_BACK_SAKURA))
                            .setDescription('A card deck with some pretty sakura flowers and pink numbers on it.')
                            .setValue('scd'),
                    ).setRequired(true)
            ),
        new LabelBuilder()
            .setLabel('Use a Shop Voucher?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('useVoucher')
                    .setPlaceholder('This only applies if vouchers are allowed.')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Heck yea!')
                            .setEmoji(GetEmoji(EMOJI.SHOP_VOUCHER))
                            .setDescription('If you don\'t have a voucher, this option will still use okash.')
                            .setValue('yes'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Maybe later...')
                            .setEmoji('❌')
                            .setDescription('This purchase will be completed with okash')
                            .setValue('no')
                    ).setRequired(true)
            )
    );

const CUSTOMIZATIONS_PROFILE_MODAL = new ModalBuilder()
    .setCustomId('shopModalProfile')
    .setTitle('Profile Customizations Shop')
    .addLabelComponents(
        new LabelBuilder()
            .setLabel('Whatcha wanna buy?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('shopModalProfileSelection')
                    .setPlaceholder('Ready to make yourself look cooler?!')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('User Banner Level Background - (SV) OKA25,000')
                            .setEmoji('🖼️')
                            .setDescription('Your level banner\'s background will be your Discord profile banner (or one of your choosing).')
                            .setValue('ublb'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Red Level Bar - (SV) OKA10,000')
                            .setEmoji('❤️')
                            .setDescription('Makes your level bar red. Pretty self explanatory.')
                            .setValue('rlb'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Green Level Bar - (SV) OKA10,000')
                            .setEmoji('💚')
                            .setDescription('Makes your level bar green. Still pretty self explanatory.')
                            .setValue('glb'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Blue Level Bar - (SV) OKA10,000')
                            .setEmoji('💙')
                            .setDescription('Makes your level bar blue yeah yeah yeah...')
                            .setValue('blb'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Pink Level Bar - (SV) OKA10,000')
                            .setEmoji('🩷')
                            .setDescription('Do I even need to keep going?')
                            .setValue('plb'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Custom Level Bar - (SV) OKA10,000')
                            .setEmoji('🎨')
                            .setDescription('Lets you set your level bar to a custom color! That\'s new!')
                            .setValue('clb'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Reset Level Bar - Free')
                            .setEmoji('🔴')
                            .setDescription('Makes your level bar the default color. "Nothing" happens if it\'s already default...')
                            .setValue('relb'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Sticker Kit - OKA250,000')
                            .setEmoji('🔮')
                            .setDescription('Profile banner looking a bit boring? Slap a sticker on it, make it unique, make it scream you!')
                            .setValue('sk'),
                    ).setRequired(true)
            ),
        new LabelBuilder()
            .setLabel('Use a Shop Voucher?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('useVoucher')
                    .setPlaceholder('This only applies if vouchers are allowed.')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Heck yea!')
                            .setEmoji(GetEmoji(EMOJI.SHOP_VOUCHER))
                            .setDescription('If you don\'t have a voucher, this option will still use okash.')
                            .setValue('yes'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Maybe later...')
                            .setEmoji('❌')
                            .setDescription('This purchase will be completed with okash')
                            .setValue('no')
                    ).setRequired(true)
            )
    );


export async function HandleCommandShopV2(interaction: ChatInputCommandInteraction) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.okash)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Maybe ask a server admin to enable it?'
    });

    const selection = interaction.options.getString('page');
    if (selection == 'items') return ModalMenuItems(interaction);
    if (selection == 'customization.coin') return interaction.showModal(CUSTOMIZATIONS_COIN_MODAL);
    if (selection == 'customization.card') return interaction.showModal(CUSTOMIZATIONS_CARDS_MODAL);
    if (selection == 'customization.profile') return interaction.showModal(CUSTOMIZATIONS_PROFILE_MODAL);
}

async function ModalMenuItems(interaction: ChatInputCommandInteraction) {
    // we have to craft the items modal manually due to the XP Level Up
    const ITEMS_MODAL = new ModalBuilder().setCustomId('shopModalItems').setTitle('okash Item Shop');

    const profile = GetUserProfile(interaction.user.id);

    const ITEMS_SELECTION = new StringSelectMenuBuilder()
        .setCustomId('shopModalItemsSelection')
        .setPlaceholder('Select an item to buy')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(`Streak Restore - (SV) OKA15,000`)
                .setEmoji(GetEmoji(EMOJI.STREAK_RESTORE_GEM))
                .setDescription('Forgot your streak (or ended up in jail for a few days)? Use this to repair your broken streak!')
                .setValue('sr'),
            new StringSelectMenuOptionBuilder()
                .setLabel(`XP Level Up - OKA${10000+(profile.leveling.level * 2500)}`)
                .setEmoji('🧿')
                .setDescription('Skip the process of grinding to level up, simply by paying to win!')
                .setValue('xpl'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Casino Pass (10 minute) - (SV) OKA25,000')
                .setEmoji('💳')
                .setDescription('Skip the queue and play casino games with no cooldown!')
                .setValue('cas10'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Casino Pass (30 minute) - OKA60,000')
                .setEmoji('💳')
                .setDescription('Skip the queue and play casino games with no cooldown!')
                .setValue('cas30'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Casino Pass (60 minute) - OKA100,000')
                .setEmoji('💳')
                .setDescription('Skip the queue and play casino games with no cooldown!')
                .setValue('cas60'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Drop Boost (15 minute) - OKA15,000')
                .setEmoji('📦')
                .setDescription('Decrease your luck... by tripping over more lootboxes!')
                .setValue('db15'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Drop Boost (30 minute) - OKA50,000')
                .setEmoji('📦')
                .setDescription('Decrease your luck... by tripping over more lootboxes!')
                .setValue('db30'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Scratch Ticket - OKA10,000')
                .setEmoji('🎫')
                .setDescription('Test your luck with a scratch ticket, and potentially win big!')
                .setValue('st'),
        );

    ITEMS_MODAL.addLabelComponents(
        new LabelBuilder().setLabel('Whatcha wanna buy?').setStringSelectMenuComponent(ITEMS_SELECTION),
        new LabelBuilder()
            .setLabel('Use a Shop Voucher?')
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId('useVoucher')
                    .setPlaceholder('This only applies if vouchers are allowed.')
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Heck yea!')
                            .setEmoji(GetEmoji(EMOJI.SHOP_VOUCHER))
                            .setDescription('If you don\'t have a voucher, this option will still use okash.')
                            .setValue('yes'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Maybe later...')
                            .setEmoji('❌')
                            .setDescription('This purchase will be completed with okash')
                            .setValue('no')
                    ).setRequired(true)
            )
    );

    interaction.showModal(ITEMS_MODAL);
}


export async function HandleModalShopSubmit(interaction: ModalSubmitInteraction) {
    await interaction.deferReply();

    switch (interaction.customId) {
        case 'shopModalItems':
            HandleModalItemPurchase(interaction);
            break;
    }
}

async function HandleModalItemPurchase(interaction: ModalSubmitInteraction) {
    const wanted_item = interaction.fields.getStringSelectValues('shopModalItemsSelection')[0];
    let selected_item: ITEMS = ITEMS.NO_ITEM_ASSIGNED;
    let okash_requirement: number;
    let voucher_allowed: boolean = false;

    const profile = GetUserProfile(interaction.user.id);
    let use_voucher = interaction.fields.getStringSelectValues('useVoucher')[0] == 'yes' && profile.inventory.includes(ITEMS.SHOP_VOUCHER);

    switch (wanted_item) {
        case 'sr':
            selected_item = ITEMS.STREAK_RESTORE;
            okash_requirement = 15000;
            voucher_allowed = true;
            break;

        case 'xpl':
            selected_item = ITEMS.VIRTUAL_ITEM_XP_LEVEL_UP;
            okash_requirement = 10000 + (profile.leveling.level * 2500);
            voucher_allowed = false;
            break;

        case 'cas10':
            selected_item = ITEMS.CASINO_PASS_10_MIN;
            okash_requirement = 25000;
            voucher_allowed = true;
            break;

        case 'cas30':
            selected_item = ITEMS.CASINO_PASS_30_MIN;
            okash_requirement = 60000;
            voucher_allowed = false;
            break;

        case 'cas60':
            selected_item = ITEMS.CASINO_PASS_1_HOUR;
            okash_requirement = 100000;
            voucher_allowed = false;
            break;

        case 'db15':
            selected_item = ITEMS.LOOTBOX_INCREASE_15_MIN;
            okash_requirement = 15000;
            voucher_allowed = false;
            break;

        case 'db30':
            selected_item = ITEMS.LOOTBOX_INCREASE_30_MIN;
            okash_requirement = 50000;
            voucher_allowed = false;
            break;

        case 'st':
            selected_item = ITEMS.LOT_SCRATCH;
            okash_requirement = 10000;
            voucher_allowed = false;
            break;

        default:
            okash_requirement = 0;
            voucher_allowed = false;
            break;
    }

    const okash_held = (profile.okash.wallet + profile.okash.bank);
    use_voucher = use_voucher && voucher_allowed;

    if (selected_item == ITEMS.NO_ITEM_ASSIGNED) return interaction.editReply({
        content: `:x: Something went wrong (switch statement defaulted out)`
    });

    if (okash_held < okash_requirement && !use_voucher) return interaction.editReply({
        content: `:crying_cat_face: Sorry, **${interaction.user.displayName}**, you need ${GetEmoji(EMOJI.OKASH)} OKA**${okash_requirement - okash_held}** more to buy that...`
    });

    if (selected_item == ITEMS.VIRTUAL_ITEM_XP_LEVEL_UP) {
        RemoveFromWallet(interaction.user.id, okash_requirement, true);
        AddXP(interaction.user.id, interaction.channel as TextChannel, CalculateTargetXP(profile.leveling.level));
        return interaction.editReply({
            content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, you bought 1x **XP Level Up** for ${GetEmoji(EMOJI.OKASH)} OKA**${okash_requirement}**!`
        });
    }

    if (use_voucher) RemoveOneFromInventory(interaction.user.id, ITEMS.SHOP_VOUCHER);
    else RemoveFromWallet(interaction.user.id, okash_requirement, true);

    AddOneToInventory(interaction.user.id, selected_item);

    if (use_voucher) interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, you exchanged a ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher** for 1x **${ITEM_ID_NAMES[selected_item]}**!`
    });
    else interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, you bought 1x **${ITEM_ID_NAMES[selected_item]}** for ${GetEmoji(EMOJI.OKASH)} OKA**${okash_requirement}**!`
    });
}


export const ShopSlashCommand = new SlashCommandBuilder()
    .setName('shop').setNameLocalizations({ja:'カタログ'})
    .setDescription('Get the shop item and price listings').setDescriptionLocalization('ja', 'アイテムのカタログと値段を見る')
    .addStringOption(option => option
    .setName('page').setDescriptionLocalizations({ja:'ページ'})
    .setDescription('The shop category to display').setDescriptionLocalizations({ja:'カタログのカテゴリー'})
    .addChoices(
        {name:'Items', value: 'items', name_localizations:{ja:'アイテム'}},
        {name:'Customization - Coinflip', value:'customization.coin', name_localizations:{ja:'コイントスのカスタマイズ'}},
        {name:'Customization - Card Games', value:'customization.card', name_localizations:{ja:'カードゲームのカスタマイズ'}},
        {name:'Customization - Profile', value:'customization.profile', name_localizations:{ja:'プロフィールのカスタマイズ'}},
    ).setRequired(true))