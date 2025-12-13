const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const logger = require('./logger');

module.exports = {
  /**
   * Load commands from the commands directory
   * @param {Client} client - The Discord client
   */
  loadCommands: (client) => {
    // Initialize commands collection if it doesn't exist
    if (!client.commands) {
      const { Collection } = require('discord.js');
      client.commands = new Collection();
    } else {
      client.commands.clear();
    }

    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
      logger.warn('⚠️ Commands directory not found.');
      return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      
      // Clear require cache to ensure fresh load
      delete require.cache[require.resolve(filePath)];
      
      try {
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          logger.log(`✅ Loaded command: ${command.data.name}`);
        } else {
          logger.warn(`⚠️  Command at ${filePath} is missing required "data" or "execute" property`);
        }
      } catch (error) {
        logger.error(`❌ Error loading command ${file}: ${error.message}`);
      }
    }
  },

  /**
   * Register slash commands with Discord
   * @param {Client} client - The Discord client
   */
  registerCommands: async (client) => {
    const commands = [];
    
    for (const command of client.commands.values()) {
      commands.push(command.data.toJSON());
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    try {
      logger.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

      // Register commands globally or to a specific guild
      if (process.env.GUILD_ID) {
        // Register to a specific guild (instant updates, good for testing)
        const data = await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
          { body: commands }
        );
        logger.log(`✅ Successfully registered ${data.length} guild command(s) for guild ${process.env.GUILD_ID}`);
      } else {
        // Register globally (takes up to 1 hour to propagate)
        const data = await rest.put(
          Routes.applicationCommands(process.env.CLIENT_ID),
          { body: commands }
        );
        logger.log(`✅ Successfully registered ${data.length} global command(s)`);
      }
    } catch (error) {
      logger.error(`❌ Error registering commands: ${error.message}`);
      throw error;
    }
  }
};
