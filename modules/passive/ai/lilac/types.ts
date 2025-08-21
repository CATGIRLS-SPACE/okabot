import { Snowflake } from "discord.js"

/**
 * Legacy conversation chain interface.
 * These chains only held responses, not thoughts or extra info.
 */
export interface ConversationChainV1 {
    author: Snowflake,
    orignal_message: Snowflake,
    disable_search: boolean,
    messages: Array<{
        user: 'okabot' | 'system' | string,
        content: string,
    }>
}


export interface ConversationChainV2 {
    author: Snowflake,
    original_message: Snowflake,
    config: {
        disable_search: boolean,
        advanced_features_allowed: {
            global_memory: boolean,
            global_user_memory: boolean,
            download_links: boolean,
            search_tenor: boolean,
            get_okabot_profile: boolean,
            get_osu_details: boolean,
        },
    },
    messages: Array<{
        role: 'okabot' | 'system' | string, // as username
        content: string,
    }>
}

export enum SERVERS {
    CATGIRL_CENTRAL = '1019089377705611294',
    FULL_STREAK_GANG = '1348652647963561984',
    OKABOT_DEV = '748284249487966282'
}

export enum TOOLS {
    NONE = -1,
    DOWNLOAD_LINK = 0,
    GET_PROFILE = 1,
    GET_OSU = 2,
    GLOBAL_MEM = 3,
    USER_GLOBAL_MEM = 4,
    SEARCH_GIFS = 5,
}