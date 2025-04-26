import { ChatInputCommandInteraction } from 'discord.js';

// This file allows me to add the custom properties for okabot to
// pass with the interaction variable. For now I will only need to
// pass the locale information.

declare module 'discord.js' {
    interface ChatInputCommandInteraction {
        okabot: {
            locale: 'en' | 'ja',
            translateable_locale: string,
        }
    }
}