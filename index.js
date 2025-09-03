// === KEEP RENDER HAPPY WITH EXPRESS ===
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('LMPR-Bot is alive!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// === DISCORD BOT ===
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    SlashCommandBuilder,
    Routes,
    REST
} = require('discord.js');
const fetch = require('node-fetch');

// === CONFIG ===
const BOT_OWNER_ID = '1314289576503672933';
const STAFF_ROLE_ID = '1375125674012053584';

const COMMAND_LOG_CHANNEL = '1395398680953225370';
const ERLC_API_KEY = process.env.ERLC_API_KEY || '';
const ERLC_SERVER_API = 'https://api.policeroleplay.community/v1/server/command';

let reminders = [
    "Reminder: park properly.",
    "Reminder: join our Discord server.",
    "Reminder: strict roleplay mode may be active.",
    "Reminder: no weapons in safezones."
];
let strictMode = false;

// === CLIENT ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// === HELPERS ===
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

async function sendDM(userId, content) {
    try {
        const user = await client.users.fetch(userId);
        await user.send(content);
    } catch (err) {
        console.error('Failed to DM:', err);
    }
}

// === REMINDERS ===
setInterval(async () => {
    if (!strictMode) {
        const reminder = reminders[Math.floor(Math.random() * reminders.length)];
        await sendERLCCommand(`:m ${reminder}`);
    }
}, 30000);

// === READY EVENT ===
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await sendDM(BOT_OWNER_ID, 'LMPR Bot has started up!');
});

// === SLASH COMMAND REGISTRATION ===
const commands = [
    new SlashCommandBuilder()
        .setName('staffpanel')
        .setDescription('Open the staff control panel.')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(client.user?.id || BOT_OWNER_ID),
            { body: commands }
        );
        console.log('Slash commands registered!');
    } catch (err) {
        console.error(err);
    }
})();

// === INTERACTION HANDLER ===
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'staffpanel') {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID) && interaction.user.id !== BOT_OWNER_ID) {
            return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
        }

        const panelEmbed = new EmbedBuilder()
            .setTitle('LMPR Staff Panel')
            .setDescription('Control ER:LC commands and reminders.')
            .setColor('#1a1a1a') // black
            .setThumbnail('https://cdn.discordapp.com/attachments/1375128537425776792/1412521613613858846/Gemini_Generated_Image_7kdjzk7kdjzk7kdj-fotor-20250902201422.png');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('send_erlc')
                    .setLabel('Send ER:LC Command')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('strict_on')
                    .setLabel('Activate Strict Mode')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('strict_off')
                    .setLabel('Deactivate Strict Mode')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [panelEmbed], components: [row], ephemeral: true });
    }
});

// === BUTTON HANDLER ===
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'send_erlc') {
        await interaction.reply({ content: 'Send an ER:LC command via DM to the bot owner.', ephemeral: true });
        // you could extend to collect command input
    }
    if (interaction.customId === 'strict_on') {
        strictMode = true;
        await sendERLCCommand(':m Strict mode activated!');
        await interaction.reply({ content: 'Strict mode is now ON.', ephemeral: true });
    }
    if (interaction.customId === 'strict_off') {
        strictMode = false;
        await sendERLCCommand(':m Strict mode deactivated!');
        await interaction.reply({ content: 'Strict mode is now OFF.', ephemeral: true });
    }
});

// === ERROR HANDLER ===
process.on('unhandledRejection', async error => {
    console.error('Unhandled promise rejection:', error);
    await sendDM(BOT_OWNER_ID, `Unhandled error: ${error}`);
});

process.on('exit', async code => {
    await sendDM(BOT_OWNER_ID, `Bot is shutting down. Exit code: ${code}`);
});

// === LOGIN ===
client.login(process.env.DISCORD_TOKEN);
