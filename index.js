require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const fileManager = require('./src/utils/fileManager');

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ Error: DISCORD_TOKEN is not set in .env file');
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error('❌ Error: CLIENT_ID is not set in .env file');
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Initialize commands collection
client.commands = new Collection();

// Load servers configuration (will be used by commands)
let servers;

// Load commands
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.warn(`⚠️  Command at ${filePath} is missing required "data" or "execute" property`);
  }
}

// Event: Bot is ready
client.once('clientReady', async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  console.log(`📊 Serving ${c.guilds.cache.size} server(s)`);
  
  // Load configuration files
  try {
    await fileManager.loadUsers();
    servers = await fileManager.loadServers();
    console.log('✅ All configuration files loaded successfully');
  } catch (error) {
    console.error(`❌ Configuration error: ${error.message}`);
    process.exit(1);
  }
  
  // Register slash commands
  await registerCommands();
});

// Event: Interaction created
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction, servers);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    
    const errorResponse = {
      content: '❌ There was an error executing this command!',
      ephemeral: true
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
});

// Register slash commands with Discord
async function registerCommands() {
  const commands = [];
  
  for (const command of client.commands.values()) {
    commands.push(command.data.toJSON());
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

    // Register commands globally or to a specific guild
    if (process.env.GUILD_ID) {
      // Register to a specific guild (instant updates, good for testing)
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${data.length} guild command(s) for guild ${process.env.GUILD_ID}`);
    } else {
      // Register globally (takes up to 1 hour to propagate)
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${data.length} global command(s)`);
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// Error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
