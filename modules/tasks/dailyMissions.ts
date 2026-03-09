import {
    ApplicationIntegrationType,
    ChatInputCommandInteraction,
    InteractionContextType, MessageFlags,
    SlashCommandBuilder,
    Snowflake, TextChannel, User
} from "discord.js";
import {AddOneToInventory} from "../okash/wallet";
import {ITEMS} from "../okash/items";
import {AddXP} from "../levels/onMessage";


export enum DAILY_MISSIONS_EASY {
    GAMBLE_STREAK_3,
    PAY_USER_OKASH,
    BUY_STOCK,
    THANK_OKABOT,
    GET_DAILY_REWARD,
    USE_WEIGHTED_COIN,
    SWITCH_TITLE,
    ROB_BANK,
    SELL_ITEM
}

export enum DAILY_MISSIONS_INTERMEDIATE {
    GAMBLE_STREAK_5,
    USE_TRACKED_ITEM_10,
    ROULETTE_SECTION_SMALL,
    SLOTS_MIN_2X,
    LEVEL_UP,
    ROB_USER,
    COINFLIP_SMALL_FLOAT,
    COINFLIP_BIG_FLOAT,
    GAMBLE_WIN_2500
}

export enum DAILY_MISSIONS_HARD {
    GAMBLE_STREAK_7,
    USE_TRACKED_ITEM_30,
    ROULETTE_PERFECT,
    SLOTS_MIN_5X,
    BLACKJACK_21,
    DAILY_FLOAT_MINMAX,
    COINFLIP_TINY_FLOAT,
    COINFLIP_ABSURD_FLOAT,
    GAMBLE_WIN_MAX,
}

const EasyMissionDescriptions: Array<string> = [
    "Get a 3 streak on a supported gambling game",
    "Pay a user at least 1000 okash at once",
    "Buy any stock for at least 1000 okash",
    "Give okabot your praise",
    "Get your daily reward",
    "Use a weighted coin and flip it",
    "Switch your profile's selected title",
    "Rob the bank for at least 500 okash",
    "Sell any item in your inventory"
];

const IntermediateMissionDescriptions: Array<string> = [
    "Get a 5 streak on a supported gambling game",
    "Play a game with a tracked item equipped 10 times",
    "Play a roulette game, selecting the \"Small Section\" bet, and win",
    "Win at least 2x your bet in slots",
    "Level up once",
    "Rob a user for at least 1000 okash",
    "Flip a coin and get a float that is at most 0.05",
    "Flip a coin and get a float that is at least 0.95",
    "Win a gambling game which you bet at least 2500 okash on"
];

const HardMissionDescriptions: Array<string> = [
    "Get a 7 streak on a supported gambling game",
    "Play a game with a tracked item equipped 30 times",
    "Play a roulette game, selecting the \"Single Number\" bet, and win",
    "Win at least 5x your bet in slots",
    "Play a blackjack game and get a blackjack",
    "Flip a coin and get a float that is at most 0.01",
    "Flip a coin and get a float that is at least 0.99",
    "Win a gambling game which you bet the max allowed amount of okash on",
];


interface MissionSelection {
    easy: {
        selected: number,
        first_completed?: {
            user_id: Snowflake,
            username: string,
            time: number
        },
        completed: Array<Snowflake>
    }
    intermediate: {
        selected: number,
        first_completed?: {
            user_id: Snowflake,
            username: string,
            time: number
        },
        completed: Array<Snowflake>
    }
    hard: {
        selected: number,
        first_completed?: {
            user_id: Snowflake,
            username: string,
            time: number
        },
        completed: Array<Snowflake>
    }
}

export const CurrentMissions: MissionSelection = {
    easy: {
        selected: 3,
        completed: [],
    },
    intermediate: {
        selected: 1,
        completed: [],
    },
    hard: {
        selected: 1,
        completed: [],
    }
}

// handlers for completion
export async function CompleteDailyMission(user: User, difficulty: 'e' | 'i' | 'h', channel: TextChannel) {
    switch (difficulty) {
        case "e":
            if (CurrentMissions.easy.completed.includes(user.id)) return;
            CurrentMissions.easy.completed.push(user.id);
            if (CurrentMissions.easy.first_completed == undefined) CurrentMissions.easy.first_completed = {
                user_id: user.id,
                username: user.displayName,
                time: Date.now()
            }
            AddXP(user.id, channel, 100);
            AddOneToInventory(user.id, ITEMS.LOOTBOX_COMMON);
            await channel.send(`:tada: Congratulations, **${user.displayName}**! You completed the easy daily mission! You got a :package: **Common Lootbox**! **(+100 XP)**\n-# ${EasyMissionDescriptions[CurrentMissions.easy.selected]}`);
            break;

        case "i":
            if (CurrentMissions.intermediate.completed.includes(user.id)) return;
            CurrentMissions.intermediate.completed.push(user.id);
            if (CurrentMissions.intermediate.first_completed == undefined) CurrentMissions.intermediate.first_completed = {
                user_id: user.id,
                username: user.displayName,
                time: Date.now()
            }
            AddXP(user.id, channel, 250);
            AddOneToInventory(user.id, ITEMS.LOOTBOX_RARE);
            await channel.send(`:tada: Congratulations, **${user.displayName}**! You completed the intermediate daily mission! You got a :package: **Rare Lootbox**! **(+250 XP)**\n-# ${IntermediateMissionDescriptions[CurrentMissions.intermediate.selected]}`);
            break;

        case "h":
            if (CurrentMissions.hard.completed.includes(user.id)) return;
            CurrentMissions.hard.completed.push(user.id);
            if (CurrentMissions.hard.first_completed == undefined) CurrentMissions.hard.first_completed = {
                user_id: user.id,
                username: user.displayName,
                time: Date.now()
            }
            AddXP(user.id, channel, 500);
            AddOneToInventory(user.id, ITEMS.LOOTBOX_EX);
            await channel.send(`:tada: Congratulations, **${user.displayName}**! You completed the hard daily mission! You got a :package: :sparkles: **EX Lootbox**! :sparkles: **(+500 XP)**\n-# ${HardMissionDescriptions[CurrentMissions.hard.selected]}`);
            break;
    }
}


// slash command

export function HandleCommandChallenges(interaction: ChatInputCommandInteraction) {
    let easy_mission = `## Easy:\n- ${EasyMissionDescriptions[CurrentMissions.easy.selected]}`;
    if (CurrentMissions.easy.first_completed) easy_mission += `\n:medal: First completed by **${CurrentMissions.easy.first_completed.username}** <t:${Math.floor(new Date(CurrentMissions.easy.first_completed.time).getTime()/1000)}:R>`;

    let intermediate_mission = `## Intermediate:\n- ${IntermediateMissionDescriptions[CurrentMissions.intermediate.selected]}`;
    if (CurrentMissions.intermediate.first_completed) intermediate_mission += `\n:medal: First completed by **${CurrentMissions.intermediate.first_completed.username}** <t:${Math.floor(new Date(CurrentMissions.intermediate.first_completed.time).getTime()/1000)}:R>`;

    let hard_mission = `## Hard:\n- ${HardMissionDescriptions[CurrentMissions.hard.selected]}`;
    if (CurrentMissions.hard.first_completed) hard_mission += `\n:medal: First completed by **${CurrentMissions.hard.first_completed.username}** <t:${Math.floor(new Date(CurrentMissions.hard.first_completed.time).getTime()/1000)}:R>`;

    interaction.reply({
        content: `# Today's Daily Challenges:\n${easy_mission}\n${intermediate_mission}\n${hard_mission}`,
        flags: [MessageFlags.SuppressNotifications]
    });
}


export const ChallengesSlashCommand = new SlashCommandBuilder()
    .setName('challenges')
    .setDescription('See today\'s daily challenges.')
    .setContexts(InteractionContextType.Guild).setIntegrationTypes(ApplicationIntegrationType.GuildInstall);