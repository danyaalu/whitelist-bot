require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const fileManager = require('./src/utils/fileManager');
const logger = require('./src/utils/logger');
const commandLoader = require('./src/utils/commandLoader');

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
client.login(process.env.DISCORD_TOKEN);

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
  } else if (command === 'stop' || command === 'exit') {
    logger.log('🛑 Shutting down...');
    client.destroy();
    process.exit(0);
  }
});
