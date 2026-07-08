import {
    AttachmentBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    Interaction,
    MessageFlags,
    SlashCommandBuilder,
    TextChannel
} from "discord.js";
import {RestoreLastDailyStreak} from "../okash/daily";
import {CUSTOMIZATION_UNLOCKS, ITEMS} from "../okash/items";
import {
    AddOneToInventory,
    AddToWallet,
    GetInventory,
    GetWallet,
    RemoveFromWallet,
    RemoveOneFromInventory
} from "../okash/wallet";
import {FLAG, GetUserProfile, UpdateUserProfile, USER_PROFILE} from "../user/prefs";
import {exLootboxReward, LOOTBOX_REWARD_TYPE, lootboxRewardCommon, rareLootboxReward} from "../okash/lootboxes";
import {EMOJI, GetEmoji, GetEmojiID} from "../../util/emoji";
import {PassesActive} from "../okash/games/blackjack";
import {ITEM_I18N_KEYS, ITEM_NAMES, UNLOCK_I18N_KEYS} from "./pockets";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {BoostsActive, DoPresenceChecks} from "../passive/onMessage";
import {item_tracking_device} from "./usables/trackingDevice";
import {
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "@discordjs/builders";
import {generateLevelBanner} from "../levels/levels";
import {readFileSync} from "fs";
import {join} from "path";
import {BASE_DIRNAME} from "../../index";
import {scratch_ticket} from "./usables/scratchTicket";
import {item_bmToken} from "./usables/blackMarketToken";
import {item_bank_robbery_tool} from "./usables/bankRobberyTool";
import { t } from "../i18n/translation";

export async function HandleCommandUse(interaction: ChatInputCommandInteraction) {
    switch (interaction.options.getString('item')!.toLowerCase()) {
        case 'streak restore': case 'sr':
            item_streak_restore(interaction);
            break;

        case 'weighted coin': case 'wc':
            item_weighted_coin(interaction);
            break;

        case 'common lootbox': case 'clb': case 'lb':
            item_common_lootbox(interaction);
            break;

        case 'rare lootbox': case 'rlb':
            item_rare_lootbox(interaction);
            break;

        case 'ex lootbox': case 'exlb': case 'extra rare lootbox':
            item_ex_lootbox(interaction);
            break;

        case 'cas10':
            item_casino_pass(interaction, '10');
            break;

        case 'cas30':
            item_casino_pass(interaction, '30');
            break;

        case 'cas60':
            item_casino_pass(interaction, '60');
            break;

        case 'db15':
            item_drop_boost(interaction, '15');
            break;

        case 'db30':
            item_drop_boost(interaction, '30');
            break;

        case 'tracking device': case 'td':
            item_tracking_device(interaction);
            break;

        case 'scratch ticket': case 'st':
            scratch_ticket(interaction);
            break;

        case 'black market token': case 'bmt':
            item_bmToken(interaction);
            break;

        case 'bank robbery tool': case 'brt':
            item_bank_robbery_tool(interaction);
            break;

        default:
            interaction.reply({
                content:':x: No such item exists, silly!',
                flags: [MessageFlags.Ephemeral]
            });
            break;
    }
}

// was GEMS.STREAK_RESTORE, now is ITEMS.STREAK_RESTORE
async function item_streak_restore(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);

    if (!inventory.some(i => i.item_id == ITEMS.STREAK_RESTORE))
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a ${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} **Streak Restore**!`
        });

    const success = await RestoreLastDailyStreak(interaction);

    if (success) RemoveOneFromInventory(interaction.user.id, ITEMS.STREAK_RESTORE);
}


async function item_weighted_coin(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (!inventory.some(i => i.item_id == ITEMS.WEIGHTED_COIN_ONE_USE)) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**s!`
        });
    }

    if (preferences.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED) != -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you only need one coin to coinflip!`
        });
    }

    // equip the weighted coin
    preferences.flags.push(FLAG.WEIGHTED_COIN_EQUIPPED);
    UpdateUserProfile(interaction.user.id, preferences);
    GrantAchievement(interaction.user, Achievements.WEIGHTED_COINFLIP, interaction.channel as TextChannel)
    RemoveOneFromInventory(interaction.user.id, ITEMS.WEIGHTED_COIN_ONE_USE);

    interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}** can already feel ${preferences.customization.global.pronouns.possessive} luck increasing while equipping ${preferences.customization.global.pronouns.possessive} ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**.`
    });
}

async function item_common_lootbox(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (!inventory.some(i => i.item_id == ITEMS.LOOTBOX_COMMON)) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a :package: **Common Lootbox** to open!`
        });
    }

    const amount_to_open = Math.min(interaction.options.getNumber('amount', false) || 1, inventory.find(i => i.item_id == ITEMS.LOOTBOX_COMMON)!.amount);

    for (let i = 0; i < amount_to_open; i++)
        RemoveOneFromInventory(interaction.user.id, ITEMS.LOOTBOX_COMMON);

    await interaction.editReply({
        // content: `**${interaction.user.displayName}** opens ${preferences.customization.global.pronouns.possessive} :package: **Common Lootbox** and finds...`
        content: `**${interaction.user.displayName}** opens ${amount_to_open} of ${preferences.customization.global.pronouns.possessive} :package: **Common Lootbox** and finds...`
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let rewardMessage = '';

    for (let i = 0; i < amount_to_open; i++) {
        const reward = lootboxRewardCommon(interaction.user.id);
        
        switch (reward.type) {
            case LOOTBOX_REWARD_TYPE.ITEM:
                AddOneToInventory(interaction.user.id, reward.item_id)
                rewardMessage += reward.item_id==ITEMS.WEIGHTED_COIN_ONE_USE?`- a ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**!\n`:`- a ${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} **Streak Restore**!\n`;
                break;
                
            case LOOTBOX_REWARD_TYPE.OKASH:
                AddToWallet(interaction.user.id, reward.amount)
                rewardMessage += `- ${GetEmoji(EMOJI.OKASH)} OKA**${reward.amount}**\n`;
                break;
                
            default:
                break;
        }
    }


    await interaction.editReply({
        content: `**${interaction.user.displayName}** opens ${amount_to_open} of ${preferences.customization.global.pronouns.possessive} :package: **Common Lootbox** and finds:\n${rewardMessage}`
    });
    // DoPresenceChecks(interaction);
}
async function item_rare_lootbox(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (!inventory.some(i => i.item_id == ITEMS.LOOTBOX_RARE)) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any :package: **Rare Lootboxes**!`
        });
    }

    const amount_to_open = Math.min(interaction.options.getNumber('amount', false) || 1, inventory.find(i => i.item_id == ITEMS.LOOTBOX_RARE)!.amount);

    for (let i = 0; i < amount_to_open; i++)
        RemoveOneFromInventory(interaction.user.id, ITEMS.LOOTBOX_RARE);

    await interaction.editReply({
        content: `**${interaction.user.displayName}** opens ${amount_to_open} of ${preferences.customization.global.pronouns.possessive} :package: **Rare Lootbox** and finds...`
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let rewardMessage = '';
    
    for (let i = 0; i < amount_to_open; i++) {
        const reward = rareLootboxReward(interaction.user.id);

        switch (reward.type) {
            case LOOTBOX_REWARD_TYPE.ITEM:
                AddOneToInventory(interaction.user.id, reward.value);

                // Dynamic message based on the item received
                if (reward.value == ITEMS.WEIGHTED_COIN_ONE_USE) {
                    rewardMessage += `- a ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**!\n`;
                } else if (reward.value == ITEMS.SHOP_VOUCHER) {
                    rewardMessage += `- a ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher**!\n`;
                } else if (reward.value == ITEMS.LOT_SCRATCH) {
                    rewardMessage += `- a :ticket: **Scratch Ticket**!\n`;
                }
                break;

            case LOOTBOX_REWARD_TYPE.OKASH:
                AddToWallet(interaction.user.id, reward.value)
                rewardMessage += `- ${GetEmoji(EMOJI.OKASH)} OKA**${reward.value}**\n`;
                break;

            default:
                break;
        }
    }
   await interaction.editReply({
        content: `**${interaction.user.displayName}** opens ${amount_to_open} of ${preferences.customization.global.pronouns.possessive} :package: **Rare Lootbox** and finds\n${rewardMessage}`
    });
    // DoPresenceChecks(interaction);
}


async function item_ex_lootbox(interaction: ChatInputCommandInteraction) {
    const preferences = GetUserProfile(interaction.user.id);

    if (!GetInventory(interaction.user.id).some(i => i.item_id == ITEMS.LOOTBOX_EX)) return interaction.reply({
        content: `**${interaction.user.displayName}**, you don't have an :sparkles: **EX Lootbox** :sparkles: to open!` 
    });

    const amount_to_open = Math.min(interaction.options.getNumber('amount', false) || 1, GetInventory(interaction.user.id).find(i => i.item_id == ITEMS.LOOTBOX_EX)!.amount);

    
    await interaction.reply({
        content: `**${interaction.user.displayName}** opens ${amount_to_open} of ${preferences.customization.global.pronouns.possessive} :sparkles: **EX Lootbox** :sparkles: and finds...`
    });
    
    for (let i = 0; i < amount_to_open; i++)
        RemoveOneFromInventory(interaction.user.id, ITEMS.LOOTBOX_EX);
    
    await new Promise((r) => setTimeout(r, 3000));
    // DoPresenceChecks(interaction);

    let rewards_got = '';

    for (let i = 0; i < amount_to_open; i++) {
        const result = exLootboxReward(interaction.user.id);

        switch (result.type) {
            case LOOTBOX_REWARD_TYPE.OKASH:
                AddToWallet(interaction.user.id, result.value);
                rewards_got += `- ${GetEmoji(EMOJI.OKASH)} OKA**${result.value}**\n`
                break;

            case LOOTBOX_REWARD_TYPE.ITEM:
                AddOneToInventory(interaction.user.id, result.value);
                rewards_got += `- ${await t(ITEM_I18N_KEYS[result.value] + '.name')}\n`;
                break;

            case LOOTBOX_REWARD_TYPE.CUSTOMIZATION:
                // you can only get a rainbow or purple coin lol
                if (GetUserProfile(interaction.user.id).customization.unlocked.includes(result.value)) {
                    switch (result.value) {
                        case CUSTOMIZATION_UNLOCKS.COIN_PURPLE:
                            AddToWallet(interaction.user.id, 250_000);
                            rewards_got += `- a ${await t(UNLOCK_I18N_KEYS[result.value] + '.name')} (you already have this, so you got ${GetEmoji(EMOJI.OKASH)}OKA**250,000** instead!)\n`;
                            break;

                        case CUSTOMIZATION_UNLOCKS.COIN_RAINBOW:
                            AddToWallet(interaction.user.id, 500_000);
                            rewards_got += `- a ${await t(UNLOCK_I18N_KEYS[result.value] + '.name')} (you already hve this, so you got ${GetEmoji(EMOJI.OKASH)}OKA**500,000** instead!)\n`;
                            break;
                    }

                    return;
                }

                // does not have customization unlock
                const profile = GetUserProfile(interaction.user.id);
                switch (result.value) {
                    case CUSTOMIZATION_UNLOCKS.COIN_PURPLE:
                        profile.customization.unlocked.push(result.value);
                        rewards_got += `- Woah! A ${await t(UNLOCK_I18N_KEYS[result.value] + '.name')}\n`;
                        break;

                    case CUSTOMIZATION_UNLOCKS.COIN_RAINBOW:
                        profile.customization.unlocked.push(result.value);
                        rewards_got += `- Woah! A ${await t(UNLOCK_I18N_KEYS[result.value] + '.name')}\n`;
                        break;
                }
                UpdateUserProfile(interaction.user.id, profile);

                break;
        }
    }

    interaction.editReply({
        content: `**${interaction.user.displayName}** opens ${amount_to_open} of ${preferences.customization.global.pronouns.possessive} :sparkles: **EX Lootbox** :sparkles: and finds:\n${rewards_got}`
    });
}


async function item_casino_pass(interaction: ChatInputCommandInteraction, time: '10' | '30' | '60') {
    await interaction.deferReply();

    const pockets = GetInventory(interaction.user.id);
    const preferences = GetUserProfile(interaction.user.id);

    const item = {'10': ITEMS.CASINO_PASS_10_MIN, '30': ITEMS.CASINO_PASS_30_MIN, '60': ITEMS.CASINO_PASS_1_HOUR}[time];

    if (!pockets.some(i => i.item_id == item))
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a :credit_card: **${time}-minute Casino Pass**!`
        });

    const d = new Date();

    if (PassesActive.has(interaction.user.id) && PassesActive.get(interaction.user.id)! > d.getTime()) return interaction.editReply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you've already got a **Casino Pass** active until <t:${PassesActive.get(interaction.user.id)}>`
    });

    RemoveOneFromInventory(interaction.user.id, item);
    GrantAchievement(interaction.user, Achievements.CASINO_PASS, interaction.channel as TextChannel);


    const expiry_time = Math.round(d.getTime()) + {
        '10': 10*60*1000,
        '30': 30*60*1000,
        '60': 60*60*1000
    }[time];

    PassesActive.set(interaction.user.id, expiry_time);

    interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}** wastes no time activating ${preferences.customization.global.pronouns.possessive} :credit_card: **Casino Pass**!\n-# Effect expires at <t:${Math.ceil(expiry_time/1000)}>`
    });
}


async function item_drop_boost(interaction: ChatInputCommandInteraction, time: '15' | '30') {
    await interaction.deferReply();

    const pockets = GetInventory(interaction.user.id);
    const now = Math.round(new Date().getTime() / 1000);
    const preferences = GetUserProfile(interaction.user.id);

    if (BoostsActive.has(interaction.user.id) && BoostsActive.get(interaction.user.id)! > now) return interaction.editReply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you've already got a **Drop Boost** active until <t:${BoostsActive.get(interaction.user.id)}>`
    })

    const item = {'15': ITEMS.LOOTBOX_INCREASE_15_MIN, '30': ITEMS.LOOTBOX_INCREASE_30_MIN}[time];

    if (!pockets.some(i => i.item_id == item))
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a **${time}-minute Drop Boost**!`
        });

    RemoveOneFromInventory(interaction.user.id, item);
    GrantAchievement(interaction.user, Achievements.DROP_BOOST, interaction.channel as TextChannel);

    const expiry = {
        '15': now + 900,
        '30': now + 1800
    }[time];

    BoostsActive.set(interaction.user.id, expiry);

    interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}** feels ${preferences.customization.global.pronouns.possessive} luck while activating ${preferences.customization.global.pronouns.possessive} **Drop Boost**!\n-# Effect expires at <t:${expiry}>`
    });
}


const valid_stickers = new StringSelectMenuBuilder()
    .setCustomId('sticker-pick')
    .setPlaceholder('Select your sticker')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setEmoji({name:'🌸'})
            .setLabel('Cherry Blossom')
            .setValue('0')
            .setDescription('Costs 50,000 okash'),

        new StringSelectMenuOptionBuilder()
            .setEmoji({id:GetEmojiID(EMOJI.OKASH)})
            .setLabel('okash')
            .setValue('1')
            .setDescription('Costs 50,000 okash'),

        new StringSelectMenuOptionBuilder()
            .setEmoji({name:'🏳️‍⚧️'})
            .setLabel('Trans Flag')
            .setValue('2')
            .setDescription('Costs zero okash!'),

        new StringSelectMenuOptionBuilder()
            .setEmoji({name:'🍎'})
            .setLabel('Apple')
            .setValue('3')
            .setDescription('Costs 50,000 okash'),

        new StringSelectMenuOptionBuilder()
            .setEmoji({name:'🍇'})
            .setLabel('Grapes')
            .setValue('4')
            .setDescription('Costs 50,000 okash'),

        new StringSelectMenuOptionBuilder()
            .setEmoji({name:'💎'})
            .setLabel('Gem')
            .setValue('5')
            .setDescription('Flex the fact you broke the economy. Costs 500,000 okash'),

        new StringSelectMenuOptionBuilder()
            .setEmoji({id:GetEmojiID(EMOJI.CAT_MONEY_EYES)})
            .setLabel('Money Cat')
            .setValue('6')
            .setDescription('Costs 100,000 okash'),

        new StringSelectMenuOptionBuilder()
            .setEmoji({id:GetEmojiID(EMOJI.CAT_RAISED_EYEBROWS)})
            .setLabel('Confused Cat')
            .setValue('7')
            .setDescription('Huh? Costs 100,000 okash'),

        new StringSelectMenuOptionBuilder()
            .setEmoji({id:GetEmojiID(EMOJI.CAT_SUNGLASSES)})
            .setLabel('Sunglasses Cat')
            .setValue('8')
            .setDescription('Costs 150,000 okash'),

        new StringSelectMenuOptionBuilder()
            .setEmoji({id:GetEmojiID(EMOJI.SHOP_VOUCHER)})
            .setLabel('Shop Voucher')
            .setValue('9')
            .setDescription('Costs 50,000 okash. If you want to display it for whatever reason.'),
    );

const sticker_costs = [
    50_000,
    50_000,
    0,
    50_000,
    50_000,
    500_000,
    100_000,
    100_000,
    150_000,
    50_000
];

const button_yes = new ButtonBuilder()
    .setCustomId('yes')
    .setLabel('Stick it!')
    .setStyle(ButtonStyle.Success);

const button_no = new ButtonBuilder()
    .setCustomId('no')
    .setLabel('Nevermind!')
    .setStyle(ButtonStyle.Danger);

const USE_V2 = false;

export async function item_sticker(interaction: ChatInputCommandInteraction) {
    let profile = GetUserProfile(interaction.user.id);
    if (!profile.inventory.some(i => i.item_id == ITEMS.STICKER_NOT_APPLIED)) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a **Sticker Kit**!`
    });

    if (USE_V2) return;

    const x = interaction.options.getNumber('x-pos', true);
    const y = interaction.options.getNumber('y-pos', true);

    const response = await interaction.reply({
        content: `Pick a sticker to place at X=${x} Y=${y}.`,
        components: [new ActionRowBuilder().addComponents(valid_stickers) as never]
    });

    const collectorFilter = (i: Interaction) => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 60_000, filter: collectorFilter});

    collector.on('collect', async i => {
        const sticker_chosen = parseInt(i.values[0]);
        const cost = sticker_costs[sticker_chosen];
        
        await i.update({
            content: 'Generating preview, one second...',
            components: []
        });

        await generateLevelBanner(interaction, GetUserProfile(interaction.user.id), undefined, {sticker:sticker_chosen,position_x:x,position_y:y});

        await i.editReply({
            content: `Place this sticker? It will cost you ${GetEmoji(EMOJI.OKASH)} OKA**${cost}**. You will not be able to move it once placed.\n-# Sticker removal is not implemented yet, but will be implemented in the future.`,
            files:[new AttachmentBuilder(readFileSync(join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.png`)))],
            components: [new ActionRowBuilder().addComponents(button_yes,button_no) as never]
        });

        const collector_button = response.createMessageComponentCollector({componentType: ComponentType.Button, time: 60_000, filter: collectorFilter});

        collector_button.on('collect', async i2 => {
            if (i2.customId == 'yes') {
                if (GetWallet(i2.user.id, true) < cost) return i2.update({
                    content: `:crying_cat_face: Sorry, **${i2.user.displayName}**, but you don't have enough okash to buy this sticker!`,
                    attachments: [],
                    components: []
                });
                profile = GetUserProfile(i2.user.id);
                profile.customization.stickers.push({sticker:sticker_chosen,position_x:x,position_y:y});
                UpdateUserProfile(i2.user.id, profile);
                RemoveFromWallet(i2.user.id, cost, true);
                RemoveOneFromInventory(i2.user.id, ITEMS.STICKER_NOT_APPLIED);
                i2.update({
                    content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} I stuck that sticker onto your level banner for ${GetEmoji(EMOJI.OKASH)} OKA**${cost}**!`,
                    attachments: [],
                    components: []
                });
                GrantAchievement(i2.user, Achievements.STICKER, i2.channel as TextChannel);
            } else {
                i2.update({
                    content: `:cat: Got it! No sticker was placed.`,
                    attachments: [],
                    components: []
                });
            }
        });
    });
}


export const UseSlashCommand = new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use an item from your pockets!')
    .addStringOption(option => option
        .setName('item')
        .setDescription('The item to use')
        .setRequired(true)
    )
    .addStringOption(option => option
        .setName('on-item')
        .setDescription('What to use the item on, if applicable')
        .setRequired(false)
    )
    .addUserOption(option => option
        .setName('on-user')
        .setDescription('Who to use the item on, if applicable')
        .setRequired(false)
    )
    .addNumberOption(option => option
        .setName('amount')
        .setDescription('If opening lootboxes, specify the amount of lootboxes to open')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    )