![Build](https://github.com/okawaffles/okabot/actions/workflows/build.yml/badge.svg)
![Code Quality](https://github.com/okawaffles/okabot/actions/workflows/eslint.yml/badge.svg)

> [!IMPORTANT]
> If you are planning on contributing, AI generated code is not allowed due to hallucinations and quirks of okabot's code.
> Some editors (such as WebStorm) include an "AI-enhanced" autocomplete feature. I don't mind this (and use it myself) but please audit your autocompletions before committing.

# thanks to the donators/boosters! <3 you guys
- **tacobella03** (Ko-Fi donator)
- **ItzMeFlyer** (Ko-Fi donator)

# contributing
## setup
_Setup can be difficult due to the amount of assumptions made that it will be only ran on my server. 
Much of okabot assumes that it will only be present in my private server._
However, you should be able to download, run `npm i --save-dev`, compile with `tsc`, and run.
On first run, okabot will "crash" and create a template config file for you to fill in.
The only required fields are the `token` and `clientId` fields.
It is recommended that you fill in some other fields such as `bot_master`.
The `aes_key` field is used for encrypted files. These files are purposely encrypted and the key is not public.


# style guide (sorta)! :3

- okabot is not serious, there should be no harsh language that isn't implemented jokingly.
- okabot's signature color is 0x9d60cc (hex #9d60cc). all embeds or opportunities to use this color by default should use it.
- when implementing a currency display, the text must be sent as `:okash: OKA**<value>**`.
- when an XP gain is not part of a sentence, it must be displayed at the end of a message and bolded, such as `**(+15XP)**`

# tips
you can make google cloud ignore real-time translated text default emojis by changing, e.g. `:package:`, into `<:package:0>`
