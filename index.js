// okabot
// written by okawaffles
// 2021 | do not use for commercial purposes

const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const isUrl = require('is-url');
const yts = require('yt-search');
const client = new Discord.Client();
const ytdl = require('ytdl-core');

const moneyhandler = require('./moneyhandler.js')

client.once('ready', () => {
	console.log('Ready!');
	client.user.setActivity('with git bash');
});

let msg;
let loop = false;
let queue = [undefined];
let userqueue = [undefined];
let qnum = 0;
let globaldispatcher;

function msToMin(millis) {
	var minutes = Math.floor(millis / 60000);
	var seconds = ((millis % 60000) / 1000).toFixed(0);
	return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

client.on('message', message => {
	if (message.content === "purple") {
		message.channel.send("the man behind the slaughter.");
	} else if (message.content.startsWith("oka ")) {
		cmd = message.content.split("oka ")[1];
		ch = message.channel;

		if (cmd === "help") {
			let thisEmbed = new Discord.MessageEmbed()
				.setTitle("okabot commands")
				.addFields(
					{name:"Music", value:"listen, loop, loop off, queue, skip, stop, clearqueue"},
				)

			ch.send(thisEmbed);
		}

		if (cmd === "loop") {
			ch.send(":repeat::white_check_mark: looping the current song. queue will not be visible while using loop. use **oka loop off** to disable.");
			loop = true;
		}
		if (cmd === "loop off") {
			ch.send(":repeat::x: ok. done looping.");
			loop = false;
		}
		if (cmd.startsWith("listen ")) {
			playMusic(message, 1);
		}
		if (cmd === "queue") {
			sendQueue(message);
		}
		if (cmd === "skip") {
			playMusic(message, 2);
		}
		if (cmd === "stop" || cmd === "leave") {
			playMusic(message, 3);
		}
		if (cmd === "clearqueue") {
			queue = [undefined];
			userqueue = [undefined];
		}

		/*if (cmd === "okash" || cmd === "money") {
			ch.send(moneyhandler.getWallet(message.author.id));
		}
		*/
	}
});

//music functions


async function playMusic(message, MODE) {
	if (MODE === 0) {
		voice = message.member.voice.channel;

		if(!loop)
			queue.shift();
			userqueue.shift();

		let current = await yts( { videoId: queue[0].split('=')[1] } );

		voice.join().then(connection => {
			const stream = ytdl(queue[0], { filter: 'audioonly' });

			let thisEmbed = new Discord.MessageEmbed()
				.setColor('#3461eb')
				.setTitle(':arrow_forward: Now Playing')
				.addFields(
					{name: ":information_source: Title", value: `${current.title}`, inline:true},
					{name: ":clock3: Time", value: `**${current.timestamp}**`, inline:true},
				)

			ch.send(thisEmbed);
			if(stream) {
				let dispatcher = connection.play(stream);
				globaldispatcher = dispatcher;
				dispatcher.on('finish', () => {
					if (queue[0] === undefined) {
						voice.leave();
					} else {
						playMusic(message, 0);
					}
				});
			} else {
				ch.send(`:x: sorry, something went wrong`);
			}
		})
	} else if (MODE === 1 && message.member.voice.channelID) {
		voice = message.member.voice.channel;
		link = message.content.split("oka listen ")[1];

		if(isUrl(link)) {
			ch.send(`:twisted_rightwards_arrows: adding that to the queue...`);
		} else {
			ch.send(`:information_source: that doesn't look like a link, finding the closest video to "**${link}**"`);
			let res = await yts(link);
			vid = res.videos.slice(0, 3);
			link = `https://youtube.com/watch?v=${vid[0].videoId}`;
			ch.send(`:twisted_rightwards_arrows: adding "**${vid[0].title}**" to the queue...`);
		}

		queue[queue.length] = link;
		userqueue[userqueue.length] = message.author.id;

		if(queue[0] === undefined) {
			queue.shift();
			userqueue.shift();
			let current = await yts( { videoId: queue[0].split('=')[1] } );

			voice.join().then(connection => {
				const stream = ytdl(queue[0], { filter: 'audioonly' });
				
				let thisEmbed = new Discord.MessageEmbed()
					.setColor('#3461eb')
					.setTitle(':arrow_forward: Now Playing')
					.addFields(
						{name: ":information_source: Title", value: `${current.title}`, inline:true},
						{name: ":clock3: Time", value: `**${current.timestamp}**`, inline:true},
					)

				ch.send(thisEmbed);
				if(stream) {
					let dispatcher = connection.play(stream);
					globaldispatcher = dispatcher;
					dispatcher.on('finish', () => {
						if (queue[0] === undefined) {
							voice.leave();
						} else {
							playMusic(message, 0);
						}
					});
				} else {
					ch.send(`:x: sorry, something went wrong. please try again`);
					queue = [undefined];
					userqueue = [undefined];
					loop = false;
				}
			})
		}
	} else if (MODE === 2) {
		voice = message.member.voice.channel;

		queue.shift();
		userqueue.shift();

		let current = await yts( { videoId: queue[0].split('=')[1] } );

		voice.join().then(connection => {
			const stream = ytdl(queue[0], { filter: 'audioonly' });

			let thisEmbed = new Discord.MessageEmbed()
				.setColor('#3461eb')
				.setTitle(':arrow_forward: Now Playing')
				.addFields(
					{name: ":information_source: Title", value: `${current.title}`, inline:true},
					{name: ":clock3: Time", value: `**${current.timestamp}**`, inline:true},
				)

			ch.send(thisEmbed);
			if(stream) {
				let dispatcher = connection.play(stream);
				globaldispatcher = dispatcher;
				dispatcher.on('finish', () => {
					if (queue[0] === undefined) {
						voice.leave();
					} else {
						playMusic(message, 0);
					}
				});
			} else {
				ch.send(`:x: sorry, something went wrong`);
			}
		})
	} else if (MODE === 3) {
		voice = message.member.voice.channel;
		voice.join().then(connection => {
			voice.leave();
			queue = [undefined];
			userqueue = [undefined];
			loop = false;
		});
	} else {
		ch.send(":loud::x: hop on vc then we can listen to some tunes together.");
	}
}

async function sendQueue(message) {
	let ch = message.channel;
	ch.startTyping();
	if (queue[0] !== undefined) {
		let qmsg = "";
		for (let i = 1; i < queue.length; i++) {
			let video = await yts( { videoId: queue[i].split('=')[1] } )
			qmsg = qmsg + "- " + video.title + ` ・ queued by <@!${userqueue[i]}>` + + "\n";
		}

		let current = await yts( { videoId: queue[0].split('=')[1] } )
		if (qmsg === "")
			qmsg = `No upcoming songs. Use "oka listen <video name/link> to queue."`


		if (!loop) {
			let thisEmbed = new Discord.MessageEmbed()
				.setColor('#3461eb')
				.setTitle(':musical_note: Queue')
				.addFields(
					{name: ":arrow_forward: Currently Playing", value: `${current.title} ・ queued by **<@!${userqueue[0]}>**`, inline:true},
					{name: ":clock3: Time", value: `**${msToMin(globaldispatcher.streamTime)}** / **${current.timestamp}**`, inline:true},
					{name: ":next_track: Next up:", value: qmsg},
				)

			ch.send(thisEmbed);
			//ch.send(`:arrow_forward: currently playing: **${current.title}** | **${msToMin(globaldispatcher.streamTime)}** / **${current.timestamp}** \n:next_track: upcoming:\`\`\`${qmsg}\`\`\``);
		} else {
			let thisEmbed = new Discord.MessageEmbed()
				.setColor('#3461eb')
				.setTitle(':musical_note: Queue')
				.addFields(
					{name: ":repeat: Currently Looping", value: `${current.title} ・ queued by **<@!${userqueue[0]}>**`, inline:true},
					{name: ":clock3: Time", value: `**${msToMin(globaldispatcher.streamTime)}** / **${current.timestamp}**`, inline:true},
				)

			ch.send(thisEmbed);
			//ch.send(`:arrow_forward: currently playing: **${current.title}** \n:next_track::x: song is looping. turn off loop to use queue`);
		}
	} else {
		ch.send(':information_source: there\'s no queue rn sorry');
	}
	ch.stopTyping();
}

client.login(token);