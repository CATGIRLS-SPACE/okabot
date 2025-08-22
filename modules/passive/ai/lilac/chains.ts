import { Snowflake, User } from "discord.js";
import { ConversationChainV2 } from "./types";


const ConversationChains = new Map<Snowflake, ConversationChainV2>();
// maps reply ID to original ID
const CCReplyPointers = new Map<Snowflake, Snowflake>();


export function GetChainFromReply(id: Snowflake): ConversationChainV2 {
    if (CCReplyPointers.has(id)) return ConversationChains.get(CCReplyPointers.get(id)!)!;
    else return ConversationChains.get(id)!;
}


export function CreateChain(properties: {author: User, advanced: boolean, id: Snowflake, initial_content:{user: string, okabot: string, system: string}}) {
    ConversationChains.set(properties.id, {
        author: properties.author.id,
        config: {
            advanced_features_allowed: {
                download_links: false,
                get_okabot_profile: false,
                get_osu_details: false,
                global_memory: properties.advanced,
                global_user_memory: properties.advanced,
                search_tenor: false
            },
            disable_search: false
        },
        messages:[
            {
                role: 'system',
                content: properties.initial_content.system
            },
            {
                role: properties.author.displayName,
                content: properties.initial_content.user
            },
            {
                role: 'okabot',
                content: properties.initial_content.okabot
            }
        ],
        original_message: properties.id
    });
}


export function UpdateChain(id: Snowflake, added_content: {role: string, content: string}, reply_id?: Snowflake) {
    if (reply_id) CCReplyPointers.set(reply_id, id);
    const chain = ConversationChains.get(id);
    if (!chain) return;
    chain.messages.push(added_content);
    ConversationChains.set(id, chain);
}