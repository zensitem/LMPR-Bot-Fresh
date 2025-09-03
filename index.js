// === EXPRESS SERVER FOR RENDER & UPTIMEROBOT ===
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('LMPR-Bot is alive!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// === DISCORD CLIENT SETUP ===
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    TextInputBuilder, 
    ModalBuilder, 
    TextInputStyle,
    InteractionType
} = require('discord.js');
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
const COMMAND_LOG_CHANNEL = '1395398680953225370';
const ERLC_API_KEY = process.env.ERLC_API_KEY || '';
const ERLC_SERVER_API = 'https://api.policeroleplay.community/v1/server/command';

let strictMode = false;
let reminders = [
    "Reminder: park properly.",
    "Reminder: join our Discord server.",
    "Reminder: strict roleplay mode may be active.",
    "Reminder: no weapons in safezones."
];

// === HELPER FUNCTIONS ===
async function sendERLCCommand(command) {
    try {
        const res = await fetch(ERLC_SERVER_API, {
            method: 'POST',
            headers: { 'Server-Key': ERLC_API_KEY, 'Content-Type': 'application/json' },
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

// === REMINDERS INTERVAL ===
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

// === MESSAGE HANDLER FOR !staffpanel ===
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content.toLowerCase() === '!staffpanel') {
        if (!message.member.roles.cache.has(STAFF_ROLE_ID) && message.author.id !== BOT_OWNER_ID) {
            return message.reply('You do not have permission to open the staff panel.');
        }

        // Staff Panel Embed
        const panelEmbed = new EmbedBuilder()
            .setTitle('LMPR Staff Panel')
            .setDescription('Manage ER:LC commands and strict mode.')
            .setColor('#1a1a1a') // black
            .setFooter({ text: 'LMPR | Staff Panel' });

        // Buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('strict_on')
                    .setLabel('Activate Strict Mode')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('strict_off')
                    .setLabel('Deactivate Strict Mode')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('erlc_modal')
                    .setLabel('Send ER:LC Command')
                    .setStyle(ButtonStyle.Primary)
            );

        await message.reply({ embeds: [panelEmbed], components: [row] });
    }
});

// === INTERACTION HANDLER ===
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === 'strict_on') {
            strictMode = true;
            await sendERLCCommand(':m Strict mode activated!');
            await interaction.reply({ content: 'Strict Mode is now ON.', ephemeral: true });
        }
        if (interaction.customId === 'strict_off') {
            strictMode = false;
            await sendERLCCommand(':m Strict mode deactivated!');
            await interaction.reply({ content: 'Strict Mode is now OFF.', ephemeral: true });
        }
        if (interaction.customId === 'erlc_modal') {
            // Show a modal for ER:LC command input
            const modal = new ModalBuilder()
                .setCustomId('erlc_input_modal')
                .setTitle('Send ER:LC Command');

            const input = new TextInputBuilder()
                .setCustomId('erlc_command')
                .setLabel('Enter your ER:LC command')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., :m Hello World!')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(input);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }
    }

    // Handle Modal Submission
    if (interaction.type === InteractionType.ModalSubmit) {
        if (interaction.customId === 'erlc_input_modal') {
            const command = interaction.fields.getTextInputValue('erlc_command');
            const res = await sendERLCCommand(command);
            if (res.success) {
                await interaction.reply({ content: `✅ Command sent: \`${command}\``, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ Failed: ${res.error || JSON.stringify(res.data)}`, ephemeral: true });
            }
        }
    }
});

// === ERROR HANDLING ===
process.on('unhandledRejection', async error => {
    console.error('Unhandled promise rejection:', error);
    await sendDM(BOT_OWNER_ID, `Unhandled error: ${error}`);
});

process.on('exit', async code => {
    await sendDM(BOT_OWNER_ID, `Bot shutting down. Exit code: ${code}`);
});

// === LOGIN ===
client.login(process.env.DISCORD_TOKEN);
