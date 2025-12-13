require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const fileManager = require('./src/utils/fileManager');
const logger = require('./src/utils/logger');
const commandLoader = require('./src/utils/commandLoader');
const rconManager = require('./src/utils/rconManager');

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  logger.error('❌ Error: DISCORD_TOKEN is not set in .env file');
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  logger.error('❌ Error: CLIENT_ID is not set in .env file');
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Load commands
commandLoader.loadCommands(client);

// Event: Bot is ready
client.once('clientReady', async (c) => {
  logger.log(`✅ Logged in as ${c.user.tag}`);
  logger.log(`📊 Serving ${c.guilds.cache.size} server(s)`);
  
  // Load configuration files
  try {
    await fileManager.loadUsers();
    client.config = await fileManager.loadServers();
    logger.log('✅ All configuration files loaded successfully');
  } catch (error) {
    logger.error(`❌ Configuration error: ${error.message}`);
    process.exit(1);
  }
});

// Event: Interaction created
client.on('interactionCreate', async interaction => {
  // Handle autocomplete
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command || !command.autocomplete) {
      return;
    }
    
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      logger.error(`Error handling autocomplete for ${interaction.commandName}: ${error.message}`);
    }
    return;
  }

  // Handle commands
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing ${interaction.commandName}: ${error.message}`);
    
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

// Error handling
process.on('unhandledRejection', error => {
  logger.error(`Unhandled promise rejection: ${error.message}`);
});

process.on('uncaughtException', error => {
  logger.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Login to Discord
if (process.env.DISCORD_TOKEN) {
  // Check for whitespace
  if (process.env.DISCORD_TOKEN.trim() !== process.env.DISCORD_TOKEN) {
    logger.warn('⚠️ Warning: DISCORD_TOKEN has leading or trailing whitespace. Trimming it.');
    process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN.trim();
  }
  logger.log(`🔑 Token loaded (Length: ${process.env.DISCORD_TOKEN.length})`);
}

client.login(process.env.DISCORD_TOKEN).catch(error => {
  logger.error(`❌ Login failed: ${error.message}`);
  if (error.message.includes('token')) {
    logger.error('👉 Please check your .env file and ensure DISCORD_TOKEN is correct.');
  }
  process.exit(1);
});

// Terminal command handler
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', async (input) => {
  const command = input.trim();
  
  if (command === 'reload') {
    logger.log('🔄 Reloading configuration and commands...');
    
    try {
      // Reload servers config
      client.config = await fileManager.loadServers();
      logger.log('✅ Configuration reloaded');

      // Reload commands
      commandLoader.loadCommands(client);
      await commandLoader.registerCommands(client);
      logger.log('✅ Commands reloaded');
    } catch (error) {
      logger.error(`❌ Failed to reload: ${error.message}`);
    }
  } else if (command === 'test connections') {
    logger.log('🔍 Testing connection to all servers...');
    
    if (!client.config || !client.config.minecraftServers) {
      logger.error('❌ No server configuration loaded.');
    } else {
      const servers = client.config.minecraftServers;
      const serverIds = Object.keys(servers);
      
      if (serverIds.length === 0) {
        logger.warn('⚠️ No servers configured.');
      } else {
        for (const serverId of serverIds) {
          const serverConfig = servers[serverId];
          const serverName = serverConfig.displayName || serverId;
          
          // Use 'list' command as a ping
          const result = await rconManager.executeCommand(serverConfig, 'list', serverName);
          
          if (result.success) {
            logger.success(`${serverName}: Online`);
          } else {
            logger.error(`${serverName}: Offline - ${result.error}`);
          }
        }
      }
    }
    logger.log('🏁 Connection test complete.');
  } else if (command === 'stop' || command === 'exit') {
    logger.log('🛑 Shutting down...');
    client.destroy();
    process.exit(0);
  }
});
