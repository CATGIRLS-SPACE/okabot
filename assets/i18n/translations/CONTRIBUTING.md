# So, you wanna help translate!
Community translations are always welcome! You must be fluent in the language you are translating to.
Machine translations are not allowed in official language files.
Please read through this entire file, as it explains in detail how to contribute best.
Non-clean contributions (bad formatting, incomplete/improperly-unfinished language files) will be rejected.


Please use a text editor which supports JSON formatting.
If you don't already have one, some good options are:
- [VSCode](https://code.visualstudio.com/) (free -- **RECOMMENDED**)
- [WebStorm](https://www.jetbrains.com/webstorm/) (free for non-commercial use) -- This is the IDE I use for okabot development.
- [Sublime Text](https://www.sublimetext.com/) (license required)

You will git installed, and optionally a git desktop client. VSCode and WebStorm come with these.
[Git for Windows](https://git-scm.com/install/windows) / [Git for Linux](https://git-scm.com/install/linux) (your Linux distro likely comes with git preinstalled!)

This guide will assume you are using VSCode, as it has the easiest support for GitHub beginners.

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

The "key" variable corresponds to which text value will be pulled from your `<locale>.json` file.
Each `.` means that it will search within a key. For example, if a language file looked like:

```json
{
    "phrases": {
        "hello": "Hello there, {{name}}!",
        "goodbye": {
            "day": "Bye, {{name}}!",
            "night": "Good night, {{name}}!"
        }
    }
}
```
the key `phrases.hello` would result in "Hello there, {{name}}!",
and the key `phrases.goodbye.night` would result in "Good night, {{name}}!"
This is precisely why the structure of your language JSON must match **EXACTLY** to `en-US.json`.

## How do I translate?
If you are beginning a new translation, 
it is most simple to just copy and paste `en-US.json`, as that is the default language.

Please note that okabot's pronoun support is limited to only English at the moment.
Due to this limitation, when translating into non-English, please feel free to remove any of:
- {{possessive}}
- {{subjective}}
- {{objective}}

as these pronouns will *not* be translated before inserted.

Please begin by setting the "lang_contributors" key to the name(s) (preferrably Discord usernames) of who is translating.

The guidelines for translating are as follows:
- You **must not** reorder or change key names/structure.
- You **must not** change **ANY** text inside the {{brackets}}. These are variables which will be replaced when the text is used in the bot. 
- You are allowed to move the bracketed variables as neccessary.
- okabot is not a "serious" bot. His translations should be kept fun and playful. This means no harsh language that is not used humorously.
- Do not translate names.
- If you are contributing to an existing file, please add your (and other's if necessary) username(s) to the "lang_contributors" key.
- If your language uses gendered verbs (such as Russian, «Я сказал» vs «Я сказалa»), please use the male- (or, if possible, neutral-) gendered form.
- If a pun/joke does not work in your language, feel free to replace it with a better-suited joke for your language. Please make sure it does not sound out-of-place.

**IF YOU DO NOT FINISH AN ENTIRE LANGUAGE, PLEASE REMOVE THE KEYS WHICH ARE STILL IN ENGLISH!**
okabot will automatically machine-translate any missing keys if the user chooses to allow it.

If your language has some quirks that require extra work, please open an issue with as much detail as possible.
It'll be determined whether it is worth it to implement specific-language handling for it.

## Testing (optional)
If you are comfortable compiling, configuring, and self-hosting okabot, you may test your translations.
If you're not, go ahead and skip this section.

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

## Extra: Git for newbies
### Forking okabot
Forking is the process of creating an identical repository within your own account.
This allows you to contribute freely, and then create a Pull Request when you are finished.
Even after your Pull Request, you can still use this repository for future contributions.

As okabot is on GitHub, it is as simple as making a GitHub account, 
heading to okabot's [homepage](https://github.com/CATGIRLS-SPACE/okabot), and clicking the "Fork" button.

### Cloning okabot
Once you have created a fork of okabot, you will clone your fork.
Cloning is the process of downloading the files from GitHub in a way 
that you can edit and commit them when you are finished.

1. In VSCode, click the "Clone Git Repository..." button under the start section.
2. At the top of your screen, you will see the option "Clone From GitHub". Choose this option.
3. VSCode may have you sign in through GitHub. 
   - If it does, you might see your okabot fork appear once you have signed in.
   - If you are not asked to sign in, you can simply paste the URL of your fork (https://github.com/<your username\>/okabot).
4. Continue with the cloning process as VSCode guides you.

### Committing your files
Committing is the process of uploading your edited files back to GitHub.

On the left-hand side of VSCode, you should see a button for Source Control.
In this section, choose the files you wish to commit. This should be your language JSON file (as well as translation.ts, if you edited it).

Write a message in the text input field. 
Good examples of a commit message could be: 
- "add Russian translations"
- "fix typo in Russian translation"
- "start work on Russian translations"

Then, press commit.
*You may see some extra prompts asking for a commit name and email. Fill those as required by git.*

After committing, you can push your commits either of two ways:
1. If there are no other edited files to commit, your "Commit" button will change into a "Push" button. You can press this button to push your changes.
2. If there are still some files that appear, you can still push without committing those files. 
   - At the bottom of VSCode, in the ribbon on the left, you will see `main*`, and to the right of it, a spinner symbol.
   - Hovering this symbol should say "okabot (Git) - Push x commits to origin/main". Click this button to push your commits.

If you have not already, VSCode will make you sign in to GitHub. 
Upon finishing, you will have made your first contribution to okabot, congratulations! 
There's still one last thing to do: create a Pull Request.

### Creating a Pull Request
Creating a Pull Request allows the main okabot repository to pull the commits you made earlier into it.

Head over to the pull request section of okabot [here](https://github.com/CATGIRLS-SPACE/okabot/pulls).

Click the "New Pull Request" button. Under "Compare changes", click the hyperlink reading "compare across forks". 
Change the "head repository" to your fork.

It should look something similar to "(base repository: CATGIRLS-SPACE/okabot) (base: main) ← (head repository: your-name/okabot) (base: main)"

If it does, click "Create pull request", fill out the required fields, and submit!
If there are issues with your contributions, a comment will be left with information about what you did incorrectly.
If there aren't any issues, good job! Your contributions will be pulled, and you'll get a "CONTRIBUTOR" badge on your okabot profile!