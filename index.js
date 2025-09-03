// Keep Render happy with a fake web server
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('LMPR-Bot is alive!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));
// LMPR-Bot.js
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// === CONFIGURATION ===
const BOT_OWNER_ID = '1314289576503672933';
const STAFF_ROLE_ID = '1375125674012053584';

const VOICE_CHANNEL_INGAME_ID = '1412768768571998370';
const VOICE_CHANNEL_QUEUE_ID = '1412768847240368139';

const COMMAND_LOG_CHANNEL = '1395398680953225370';
const KILL_LOG_CHANNEL = '1412770420016283778';

const ERLC_API_KEY = 'BJTxABbzKHLjacxaZeKO-noQSSIRpVUnAJJtCITMMRGMxytIjJnvShEeersIs';
const ERLC_SERVER_API = 'https://api.policeroleplay.community/v1/server/command';

let reminders = [
    "Please remember to park your vehicle correctly at all times. This means using designated parking slots or pulling safely to the side of the road. Improperly parked vehicles can disrupt roleplay, block traffic, and may be removed by staff.",
    "This is a reminder to join our Dc server, where we host giveaways, community events, announcements, and more. Staying connected in Dc ensures you do not miss important updates that affect your roleplay experience.",
    "If Strict Roleplay Mode has been activated, make sure to follow all server rules at the highest standard. During this mode, you must stay in character at all times, roleplay realistically, and avoid breaking immersion. Strict punishments may apply for any rulebreaking.",
    "Reminder that the use of weapons, handcuffs, or tools is strictly prohibited within safezones or while official training sessions are taking place. Safezones include PD spawn, Civilian spawn, FD spawn, SD, DOT spawn, and any other protected areas. These zones must remain safe for everyone, and breaking this rule may lead to punishment."
];

let strictMode = false;

// === HELPER FUNCTIONS ===
async function sendERLCCommand(command) {
    try {
        const res = await fetch(ERLC_SERVER_API, {
            method: 'POST',
            headers: {
                'Server-Key': ERLC_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command })
        });
        const json = await res.json().catch(() => ({}));
        return { success: res.ok, data: json };
    } catch (err) {
        console.error(err);
        return { success: false, error: err };
    }
}

function formatSayContent(content) {
    return content.split('<').join('\n');
}

async function sendDM(userId, content) {
    try {
        const user = await client.users.fetch(userId);
        await user.send(content);
    } catch (err) {
        console.error('Failed to DM:', err);
    }
}

// === REMINDER INTERVAL ===
setInterval(async () => {
    if (strictMode) return; // Skip if strict mode active
    const reminder = reminders[Math.floor(Math.random() * reminders.length)];
    await sendERLCCommand(`:m ${reminder}`);
}, 30000);

// === READY EVENT ===
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await sendDM(BOT_OWNER_ID, 'LMPR Bot has started up!');
});

// === MESSAGE HANDLER ===
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // === OWNER ONLY COMMANDS ===
    if (command === '!embed1' && message.author.id === BOT_OWNER_ID) {
        const embed = new EmbedBuilder()
            .setTitle('LMPR | Staff Utility')
            .setDescription("Welcome to the LMPR Staff Utility, your central hub for essential info and resources.")
            .setColor(0xff0000)
            .setThumbnail('https://cdn.discordapp.com/attachments/1375128537425776792/1412521613613858846/Gemini_Generated_Image_7kdjzk7kdjzk7kdj-fotor-20250902201422.png')
            .addFields([
                { name: 'Guidelines', value: 'Comprehensive Staff Handbook covering partnerships, groups, punishments, SSUs.' },
                { name: 'Tools & Resources', value: '[Melonly](https://melon.ly/join/ZHKTNV) panel for logging infractions, starting shifts, and more.' },
                { name: 'Documents', value: '[Docs](https://docs.google.com/document/d/1L1mFgPAzgUcv6Dbw1truf_H5gZjOOAun8bRNZr8ikHU/edit?tab=t.0)' }
            ]);
        await message.channel.send({ embeds: [embed] });
    }

    // === SAY COMMAND ===
    if (command === '!say1') {
        const content = formatSayContent(args.join(' '));
        if (!content) return message.reply('You must provide a message!');
        await message.channel.send(content);
    }

    // === STRICT MODE ===
    if (command === '!strictmodeon' && message.member.roles.cache.has(STAFF_ROLE_ID)) {
        strictMode = true;
        await sendERLCCommand(':m Strict mode has now been activated, you may be removed if seen breaking rules.');
        return message.reply('Strict Mode activated.');
    }

    if (command === '!strictmodeoff' && message.member.roles.cache.has(STAFF_ROLE_ID)) {
        strictMode = false;
        await sendERLCCommand(':m Strict mode has now been deactivated.');
        return message.reply('Strict Mode deactivated.');
    }

    // === ERLC COMMANDS ===
    if (command === '!erlccommand' && message.member.roles.cache.has(STAFF_ROLE_ID)) {
        const erlcCmd = args.join(' ');
        if (!erlcCmd) return message.reply('You must provide an ER:LC command.');
        const res = await sendERLCCommand(erlcCmd);
        if (res.success) message.reply('Command sent to ER:LC server.');
        else message.reply(`Failed to send command: ${res.error || JSON.stringify(res.data)}`);
    }

    // === INFO / RULE COMMANDS EXAMPLES ===
    if (command === '!info1') {
        const embed = new EmbedBuilder()
            .setTitle('London Metropolitan RP | LMPR')
            .setDescription('Welcome to LMPR, a dedicated ER:LC roleplay server with specialized departments and events.')
            .setColor(0xff0000);
        await message.channel.send({ embeds: [embed] });
    }

    if (command === '!chain') {
        const embed = new EmbedBuilder()
            .setTitle('Chain of Command')
            .setDescription('__**Leadership Team**__\n• <@&1371548472007721020>\n• <@&1371549492272300172>\n\n__**Directive Department**__ 🔰\n• <@&1375554737008676984> 🔴\n• <@&1375555695432171680> 🔴')
            .setColor(0xff0000);
        await message.channel.send({ embeds: [embed] });
    }

    // === ADD MORE COMMANDS SIMILARLY ===
});

// === VOICE CHANNEL UPDATES ===
setInterval(async () => {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const ingameChannel = guild.channels.cache.get(VOICE_CHANNEL_INGAME_ID);
    const queueChannel = guild.channels.cache.get(VOICE_CHANNEL_QUEUE_ID);

    // Example: fetch in-game and queue counts from ERLC API (replace with your API GET)
    let ingameCount = 0;
    let queueCount = 0;
    try {
        const playersRes = await fetch('https://api.policeroleplay.community/v1/server/players', {
            headers: { 'Server-Key': ERLC_API_KEY }
        }).then(r => r.json());
        ingameCount = playersRes.length || 0;

        const queueRes = await fetch('https://api.policeroleplay.community/v1/server/queue', {
            headers: { 'Server-Key': ERLC_API_KEY }
        }).then(r => r.json());
        queueCount = queueRes.length || 0;

    } catch (err) {
        console.error(err);
        await sendDM(BOT_OWNER_ID, `Error updating voice channels: ${err}`);
    }

    if (ingameChannel) ingameChannel.setName(`[${ingameCount}/40] In-Game`);
    if (queueChannel) queueChannel.setName(`[${queueCount}/40] Queue`);
}, 15000); // Update every 15s

// === ERROR HANDLER ===
process.on('unhandledRejection', async error => {
    console.error('Unhandled promise rejection:', error);
    await sendDM(BOT_OWNER_ID, `Unhandled error: ${error}`);
});

process.on('exit', async code => {
    await sendDM(BOT_OWNER_ID, `Bot is shutting down. Exit code: ${code}`);
});

// === LOGIN ===
console.log("TOKEN:", process.env.DISCORD_TOKEN ? "SET" : "MISSING");
client.login(process.env.DISCORD_TOKEN);
// === ANTI-PING SYSTEM ===

// Protected roles (cannot be pinged)
const protectedRoles = [
  "1412806610639781918", // role 1
  "1412806564049457203", // role 2
  "1371548472007721020", // Chairman
  "1412806470063358002", // role 4
  "1371549492272300172", // Vice Chairman
];

// Bypass roles (allowed to ping protected)
const bypassRoles = [
  "1412808881154822206", // Founder bypass
  "1412808967574519908", // Co-Founder bypass
  "1377298879770267699", // Chairman bypass
  "1412809157068853328", // Chief Chairman bypass
  "1377299036050034758", // Vice Chairman bypass
];

// Listen for pings
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Check role mentions
  if (message.mentions.roles.size > 0) {
    for (let [roleId] of message.mentions.roles) {
      if (protectedRoles.includes(roleId)) {
        const hasBypass = message.member.roles.cache.some(r => bypassRoles.includes(r.id));
        if (!hasBypass) {
          const embed = new EmbedBuilder()
            .setTitle("🚫 Improper Ping Detected")
            .setColor("Red")
            .setDescription(
              `Please refrain from pinging <@&${roleId}> without permission.\n\n` +
              `🔔 **Who pinged:** ${message.author}\n` +
              `🎯 **Who was pinged:** <@&${roleId}>\n\n` +
              `⚠️ You can be warned for this.`
            )
            .setFooter({ text: "LMPR | Anti-Ping System" })
            .setTimestamp();

          await message.channel.send({ embeds: [embed] });
        }
      }
    }
  }

  // Check member mentions
  if (message.mentions.members.size > 0) {
    message.mentions.members.forEach(async (member) => {
      const hasProtectedRole = member.roles.cache.some(r => protectedRoles.includes(r.id));
      if (hasProtectedRole) {
        const hasBypass = message.member.roles.cache.some(r => bypassRoles.includes(r.id));
        if (!hasBypass) {
          const embed = new EmbedBuilder()
            .setTitle("🚫 Improper Ping Detected")
            .setColor("Red")
            .setDescription(
              `Please refrain from pinging ${member} without permission.\n\n` +
              `🔔 **Who pinged:** ${message.author}\n` +
              `🎯 **Who was pinged:** ${member}\n\n` +
              `⚠️ You can be warned for this.`
            )
            .setFooter({ text: "LMPR | Anti-Ping System" })
            .setTimestamp();

          await message.channel.send({ embeds: [embed] });
        }
      }
    });
  }
})