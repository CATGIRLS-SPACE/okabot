# So, you wanna help translate!
Community translations are always welcome! You must be fluent in the language you are translating to.
Machine translations are not allowed in official language files.

## How do translations work?
okabot pulls his language data from the JSON files in this directory. 
The files are named `<locale>.json`. You can read a full-list of locales [here](https://discord.js.org/docs/packages/discord.js/14.26.4/Locale:Enum).
You may add any locale here, as long as it corresponds to one of the locale **values** specified in the list linked above. 
When a user runs a command, the function
```typescript
async function t(key: string, locale: string | Locale, vars: {[key: string]: string}): Promise<string> { /* Language Code */ }
```
is called. Example call: 
```
await t('interactions.daily.init', interaction.okabot.translateable_locale, {
    cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES),
    okash: GetEmoji(EMOJI.OKASH),
    ... etc
})
```
This function will use the user's preferred locale and return a string with the proper text value corresponding to the 
translation key passed.

## How do I translate?
If you are beginning a new translation, 
it is most simple to just copy and paste `en-US.json`, as that is the default language.

Please begin by setting the "lang_contributors" key to the name(s) (preferrably Discord usernames) of who is translating.

The guidelines for translating are as follows:
- You **must not** reorder or change key names/structure.
- You **must not** change **ANY** text inside the {{brackets}}. You are allowed to move the brackets as needed.
- okabot is not a "serious" bot. His translations should be kept fun and playful. This means no harsh language that is not used humorously.
- Do not translate names.
- If you are contributing to an existing file, please add your (and other's if necessary) username(s) to the "lang_contributors" key.

**IF YOU DO NOT FINISH AN ENTIRE LANGUAGE, PLEASE REMOVE THE KEYS WHICH ARE STILL IN ENGLISH!**
okabot will automatically machine-translate any missing keys if the user chooses to allow it.

## Testing (optional)
If you are comfortable compiling, configuring, and self-hosting okabot, you may test your translations.
If you are adding a new language, you must edit `modules/i18n/translation.ts`.

Under the line `import enUS from '../../assets/i18n/translations/en-US.json';`, 
add `import <locale_name_without_hyphens> from '../../assets/i18n/translations/<locale_name>.json';`.

In the `i18n.init()` function, add
```
'<locale_name>': {
    translation: <locale_name_without_hyphens>
}
```

You may now start the bot. If you have done everything successfully, okabot should automatically
pick your translations if your Discord locale is set to said language.