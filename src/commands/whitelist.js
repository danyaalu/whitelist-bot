const { SlashCommandBuilder } = require('discord.js');
const fileManager = require('../utils/fileManager');
const mojangApi = require('../utils/mojangApi');
const rconManager = require('../utils/rconManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Add yourself to a Minecraft server whitelist')
    .addSubcommand(subcommand =>
      subcommand
        .setName('java')
        .setDescription('Whitelist your Java Edition username')
        .addStringOption(option =>
          option
            .setName('server')
            .setDescription('The Minecraft server to whitelist on')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('username')
            .setDescription('Your Minecraft Java Edition username')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('bedrock')
        .setDescription('Whitelist your Bedrock Edition gamertag')
        .addStringOption(option =>
          option
            .setName('server')
            .setDescription('The Minecraft server to whitelist on')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('gamertag')
            .setDescription('Your Minecraft Bedrock Edition gamertag')
            .setRequired(true)
        )
    ),

  async autocomplete(interaction, serversConfig) {
    const guildId = interaction.guildId;
    
    // Get available servers for this Discord server
    const availableServers = fileManager.getAvailableServers(serversConfig, guildId);
    
    // Build choices with display names
    const choices = availableServers.map(serverId => {
      const server = serversConfig.minecraftServers[serverId];
      return {
        name: server.displayName,
        value: serverId
      };
    });
    
    await interaction.respond(choices);
  },

  async execute(interaction, serversConfig) {
    // Check if bot is in a guild
    if (!interaction.guildId) {
      return await interaction.reply({
        content: '❌ This command can only be used in a server, not in DMs.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const subcommand = interaction.options.getSubcommand();
      const serverId = interaction.options.getString('server');
      const discordUserId = interaction.user.id;
      const guildId = interaction.guildId;

      // Validate that this Discord server has access to the selected Minecraft server
      const availableServers = fileManager.getAvailableServers(serversConfig, guildId);
      
      if (availableServers.length === 0) {
        return await interaction.editReply({
          content: '❌ This Discord server is not configured to manage any Minecraft servers. Please contact an administrator.',
        });
      }
      
      if (!availableServers.includes(serverId)) {
        return await interaction.editReply({
          content: '❌ Invalid server selected. This Discord server does not have access to that Minecraft server.',
        });
      }

      const serverConfig = serversConfig.minecraftServers[serverId];
      
      // Load users data
      let users = await fileManager.loadUsers();

      // Check if user already has an entry for this server
      if (fileManager.userExistsOnServer(users, discordUserId, serverId)) {
        const existingEntry = users[discordUserId].servers[serverId];
        return await interaction.editReply({
          content: `❌ You are already whitelisted on **${serverConfig.displayName}**!\n\n` +
            `**Platform:** ${existingEntry.platform}\n` +
            `**Username:** ${existingEntry.username}\n\n` +
            `If you need to change your entry, please contact an administrator.`,
        });
      }

      if (subcommand === 'java') {
        await this.handleJavaWhitelist(interaction, users, discordUserId, serverId, serverConfig, serversConfig);
      } else if (subcommand === 'bedrock') {
        await this.handleBedrockWhitelist(interaction, users, discordUserId, serverId, serverConfig, serversConfig);
      }
    } catch (error) {
      console.error('Error in whitelist command:', error);
      
      const errorMessage = error.message || 'An unexpected error occurred';
      
      try {
        await interaction.editReply({
          content: `❌ **Error:** ${errorMessage}`,
        });
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  },

  async handleJavaWhitelist(interaction, users, discordUserId, serverId, serverConfig, serversConfig) {
    const username = interaction.options.getString('username');

    // Basic validation
    if (!mojangApi.isValidUsername(username)) {
      return await interaction.editReply({
        content: `❌ Invalid username format. Minecraft usernames must be 3-16 characters and contain only letters, numbers, and underscores.`,
      });
    }

    // Validate with Mojang API
    await interaction.editReply({
      content: `⏳ Validating username with Mojang API...`,
    });

    let mojangData;
    try {
      mojangData = await mojangApi.getUUID(username);
    } catch (error) {
      return await interaction.editReply({
        content: `❌ **Failed to validate username:** ${error.message}`,
      });
    }

    // Send whitelist command to the selected server
    await interaction.editReply({
      content: `⏳ Adding **${mojangData.username}** to **${serverConfig.displayName}**...`,
    });

    const result = await rconManager.whitelistOnServer(
      serverConfig,
      serverId,
      'java',
      mojangData.username,
      mojangData.uuid
    );

    if (result.success) {
      // Save to users.json
      users = fileManager.addUserToServer(users, discordUserId, serverId, 'java', mojangData.username, mojangData.uuid);
      await fileManager.saveUsers(users);

      await interaction.editReply({
        content: `✅ **Successfully whitelisted!**\n\n` +
          `**Server:** ${serverConfig.displayName}\n` +
          `**Platform:** Java Edition\n` +
          `**Username:** ${mojangData.username}\n` +
          `**UUID:** ${mojangData.uuid}`,
      });
    } else {
      await interaction.editReply({
        content: `❌ **Failed to whitelist**\n\n` +
          `**Server:** ${serverConfig.displayName}\n` +
          `**Error:** ${result.error}\n\n` +
          `Please contact an administrator for assistance.`,
      });
    }
  },

  async handleBedrockWhitelist(interaction, users, discordUserId, serverId, serverConfig, serversConfig) {
    const gamertag = interaction.options.getString('gamertag');

    // Basic validation (Bedrock gamertags have different rules)
    if (gamertag.length < 3 || gamertag.length > 16) {
      return await interaction.editReply({
        content: `❌ Invalid gamertag format. Gamertags must be 3-16 characters.`,
      });
    }

    // Send whitelist command to the selected server
    await interaction.editReply({
      content: `⏳ Adding **${gamertag}** to **${serverConfig.displayName}**...`,
    });

    const result = await rconManager.whitelistOnServer(
      serverConfig,
      serverId,
      'bedrock',
      gamertag,
      null
    );

    if (result.success) {
      // Save to users.json
      users = fileManager.addUserToServer(users, discordUserId, serverId, 'bedrock', gamertag, null);
      await fileManager.saveUsers(users);

      await interaction.editReply({
        content: `✅ **Successfully whitelisted!**\n\n` +
          `**Server:** ${serverConfig.displayName}\n` +
          `**Platform:** Bedrock Edition\n` +
          `**Gamertag:** ${gamertag}`,
      });
    } else {
      await interaction.editReply({
        content: `❌ **Failed to whitelist**\n\n` +
          `**Server:** ${serverConfig.displayName}\n` +
          `**Error:** ${result.error}\n\n` +
          `Please contact an administrator for assistance.`,
      });
    }
  },
};
