import {GoogleGenAI} from '@google/genai';
import {CONFIG, DEV} from "../../index";
import {Message, Snowflake, TextChannel} from "discord.js";

let ai: GoogleGenAI;

const ConversationChains: {
    [key: string]: {
        author: Snowflake,
        messages: Array<{
            user: 'okabot' | string,
            content: string,
        }>
    }
} = {};

/**
 * Respond to an "okabot, xyz..." message
 * @param message The message object passed by discord.js
 */
export async function GeminiDemoRespondToInquiry(message: Message) {
    if (!CONFIG.gemini.enable) return;
    if (!ai) ai = new GoogleGenAI({apiKey: CONFIG.gemini.api_key});

    message.react('✨');

    const guild = message.client.guilds.cache.get(message.guild!.id);
    if (!guild) throw new Error('no guild');
    const user = guild.members.cache.get(message.author.id);
    if (!user) throw new Error('no user');
    const channel = (guild.channels.cache.get(message.channel.id) as TextChannel);
    if (!channel) throw new Error('no channel');

    let extra = '';
    if (message.reference) {
        const reference = channel.messages.cache.get(message.reference.messageId!);
        if (!reference) throw new Error('failed to get reference message');
        extra = `The user has also replied to a message by user "${reference.author.displayName}", which has the content "${reference.content}", so you should use that as context additionally.`
    }

    const prompt = `You are okabot, a Discord bot which is only available in the server CATGIRL CENTRAL. A user named "${user.nickname || user.displayName}" has just invoked your response shorthand, being "okabot, xyz" where "xyz" is the query. The content of the message is "${message.content}". ${extra} Respond to the question only. You can be playful, but keep it short and concise while still being informative. okabot generally will start out a response with a cat emoji, such as 😿 or 😾, and have a lighthearted response.`;

    await channel.sendTyping();

    const response = await ai.models.generateContent({
        model:'gemini-2.5-pro-preview-03-25',
        contents: prompt,
        config: {
            thinkingConfig: {
                thinkingBudget: 1024,
                includeThoughts: true,
            }
        }
    });

    await message.reply({
        content: response.text + `\n-# GenAI (\`${response.modelVersion}\`) (used ${response.usageMetadata!.thoughtsTokenCount} tokens in thinking)`
    });
}


export async function GeminiDemoReplyToConversationChain(message: Message) {
    if (!CONFIG.gemini.enable) return;
    if (!ai) ai = new GoogleGenAI({apiKey: CONFIG.gemini.api_key});

    const guild = message.client.guilds.cache.get(message.guild!.id);
    if (!guild) throw new Error('no guild');
    const user = guild.members.cache.get(message.author.id);
    if (!user) throw new Error('no user');

    const booster_role = !DEV?guild.roles.premiumSubscriberRole:guild.roles.cache.find(role => role.name == 'fake booster role');
    const user_is_booster = booster_role?guild.members.cache.get(message.author.id)!.roles.cache.some(role => role.id === booster_role.id):false;

    if (!user_is_booster) return message.reply({
        content: `:crying_cat_face: Please server boost CATGIRL CENTRAL to gain access to conversation chains.\n-# You can still use standard "okabot, xyz..." inquiries without boosting.`
    });

    message.react('✨');
}