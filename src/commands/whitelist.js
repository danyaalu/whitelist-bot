const { SlashCommandBuilder } = require('discord.js');
const fileManager = require('../utils/fileManager');
const mojangApi = require('../utils/mojangApi');
const rconManager = require('../utils/rconManager');

// Helper function to format platform name
function formatPlatform(platform) {
  return platform === 'java' ? 'Java' : 'Bedrock';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage Minecraft server whitelist')
    .addSubcommandGroup(group =>
      group
        .setName('add')
        .setDescription('Add yourself to a server whitelist')
        .addSubcommand(subcommand =>
          subcommand
            .setName('java')
            .setDescription('Add your Java Edition username to whitelist')
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
            .setDescription('Add your Bedrock Edition gamertag to whitelist')
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
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('remove')
        .setDescription('Remove yourself from a server whitelist')
        .addSubcommand(subcommand =>
          subcommand
            .setName('java')
            .setDescription('Remove your Java Edition whitelist entry')
            .addStringOption(option =>
              option
                .setName('server')
                .setDescription('The Minecraft server to remove from')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('bedrock')
            .setDescription('Remove your Bedrock Edition whitelist entry')
            .addStringOption(option =>
              option
                .setName('server')
                .setDescription('The Minecraft server to remove from')
                .setRequired(true)
                .setAutocomplete(true)
            )
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
      const subcommandGroup = interaction.options.getSubcommandGroup();
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

      if (subcommandGroup === 'add') {
        // Load users data
        let users = await fileManager.loadUsers();

        // Check if user already has an entry for this server
        if (fileManager.userExistsOnServer(users, discordUserId, serverId)) {
          const existingEntry = users[discordUserId].servers[serverId];
          return await interaction.editReply({
            content: `❌ You are already whitelisted on **${serverConfig.displayName}**!\n\n` +
              `**Platform:** ${formatPlatform(existingEntry.platform)}\n` +
              `**Username:** ${existingEntry.username}\n\n` +
              `If you need to change your entry, please contact an administrator.`,
          });
        }

        if (subcommand === 'java') {
          await this.handleJavaAdd(interaction, users, discordUserId, serverId, serverConfig, serversConfig);
        } else if (subcommand === 'bedrock') {
          await this.handleBedrockAdd(interaction, users, discordUserId, serverId, serverConfig, serversConfig);
        }
      } else if (subcommandGroup === 'remove') {
        // Load users data
        let users = await fileManager.loadUsers();

        // Check if user has an entry for this server
        if (!fileManager.userExistsOnServer(users, discordUserId, serverId)) {
          return await interaction.editReply({
            content: `❌ You are not whitelisted on **${serverConfig.displayName}**.\n\nUse \`/whitelist add ${subcommand}\` to add yourself first.`,
          });
        }

        const userEntry = users[discordUserId].servers[serverId];
        
        // Validate that the platform matches the subcommand
        if ((subcommand === 'java' && userEntry.platform !== 'java') || (subcommand === 'bedrock' && userEntry.platform !== 'bedrock')) {
          return await interaction.editReply({
            content: `❌ You are whitelisted on **${serverConfig.displayName}** as **${userEntry.platform === 'java' ? 'Java' : 'Bedrock'} Edition**.\n\nUse \`/whitelist remove ${userEntry.platform}\` instead.`,
          });
        }

        if (subcommand === 'java') {
          await this.handleJavaRemove(interaction, users, discordUserId, serverId, serverConfig, userEntry);
        } else if (subcommand === 'bedrock') {
          await this.handleBedrockRemove(interaction, users, discordUserId, serverId, serverConfig, userEntry);
        }
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

  async handleJavaAdd(interaction, users, discordUserId, serverId, serverConfig, serversConfig) {
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
      content: `⏳ Adding **${mojangData.username}** to **${serverConfig.displayName}**...\n\n_This may take up to 15 seconds._`,
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
          `**Username:** ${mojangData.username}\n`,
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

  async handleBedrockAdd(interaction, users, discordUserId, serverId, serverConfig, serversConfig) {
    const gamertag = interaction.options.getString('gamertag');

    // Basic validation (Bedrock gamertags have different rules)
    if (gamertag.length < 3 || gamertag.length > 16) {
      return await interaction.editReply({
        content: `❌ Invalid gamertag format. Gamertags must be 3-16 characters.`,
      });
    }

    // Send whitelist command to the selected server
    await interaction.editReply({
      content: `⏳ Adding **${gamertag}** to **${serverConfig.displayName}**...\n\n_This may take up to 15 seconds._`,
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

  async handleJavaRemove(interaction, users, discordUserId, serverId, serverConfig, userEntry) {
    const username = userEntry.username;

    // Send remove command to the server
    await interaction.editReply({
      content: `⏳ Removing **${username}** from **${serverConfig.displayName}**...\n\n_This may take up to 15 seconds._`,
    });

    // Build remove command
    const removeCommand = serverConfig.whitelistRemoveCommandJava || 'whitelist remove {username}';
    const command = removeCommand
      .replace('{uuid}', userEntry.uuid || username)
      .replace('{username}', username);

    const result = await rconManager.executeCommand(serverConfig, command, serverId);

    if (result.success) {
      // Remove from users.json
      delete users[discordUserId].servers[serverId];
      
      // If user has no more servers, remove the entire entry
      if (Object.keys(users[discordUserId].servers).length === 0) {
        delete users[discordUserId];
      }
      
      await fileManager.saveUsers(users);

      await interaction.editReply({
        content: `✅ **Successfully removed from whitelist!**\n\n` +
          `**Server:** ${serverConfig.displayName}\n` +
          `**Platform:** Java Edition\n` +
          `**Username:** ${username}`,
      });
    } else {
      await interaction.editReply({
        content: `❌ **Failed to remove from whitelist**\n\n` +
          `**Server:** ${serverConfig.displayName}\n` +
          `**Error:** ${result.error}\n\n` +
          `Your entry has NOT been removed from the bot's database.\nPlease contact an administrator for assistance.`,
      });
    }
  },

  async handleBedrockRemove(interaction, users, discordUserId, serverId, serverConfig, userEntry) {
    const gamertag = userEntry.username;

    // Send remove command to the server
    await interaction.editReply({
      content: `⏳ Removing **${gamertag}** from **${serverConfig.displayName}**...\n\n_This may take up to 15 seconds._`,
    });

    // Build remove command
    const removeCommand = serverConfig.whitelistRemoveCommandBedrock || 'fwhitelist remove {gamertag}';
    const command = removeCommand.replace('{gamertag}', gamertag);

    const result = await rconManager.executeCommand(serverConfig, command, serverId);

    if (result.success) {
      // Remove from users.json
      delete users[discordUserId].servers[serverId];
      
      // If user has no more servers, remove the entire entry
      if (Object.keys(users[discordUserId].servers).length === 0) {
        delete users[discordUserId];
      }
      
      await fileManager.saveUsers(users);

      await interaction.editReply({
        content: `✅ **Successfully removed from whitelist!**\n\n` +
          `**Server:** ${serverConfig.displayName}\n` +
          `**Platform:** Bedrock Edition\n` +
          `**Gamertag:** ${gamertag}`,
      });
    } else {
      await interaction.editReply({
        content: `❌ **Failed to remove from whitelist**\n\n` +
          `**Server:** ${serverConfig.displayName}\n` +
          `**Error:** ${result.error}\n\n` +
          `Your entry has NOT been removed from the bot's database.\nPlease contact an administrator for assistance.`,
      });
    }
  },
};
