const { SlashCommandBuilder } = require('discord.js');
const fileManager = require('../utils/fileManager');
const mojangApi = require('../utils/mojangApi');
const rconManager = require('../utils/rconManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Add yourself to the Minecraft server whitelist')
    .addSubcommand(subcommand =>
      subcommand
        .setName('java')
        .setDescription('Whitelist your Java Edition username')
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
            .setName('gamertag')
            .setDescription('Your Minecraft Bedrock Edition gamertag')
            .setRequired(true)
        )
    ),

  async execute(interaction, servers) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const subcommand = interaction.options.getSubcommand();
      const discordUserId = interaction.user.id;

      // Load users data
      let users = await fileManager.loadUsers();

      // Check if user already has an entry
      if (fileManager.userExists(users, discordUserId)) {
        const existingEntry = users[discordUserId];
        return await interaction.editReply({
          content: `❌ You are already whitelisted!\n\n` +
            `**Platform:** ${existingEntry.platform}\n` +
            `**Username:** ${existingEntry.username}\n\n` +
            `If you need to change your entry, please contact an administrator.`,
        });
      }

      if (subcommand === 'java') {
        await this.handleJavaWhitelist(interaction, users, discordUserId, servers);
      } else if (subcommand === 'bedrock') {
        await this.handleBedrockWhitelist(interaction, users, discordUserId, servers);
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

  async handleJavaWhitelist(interaction, users, discordUserId, servers) {
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

    // Send whitelist command to all servers
    await interaction.editReply({
      content: `⏳ Adding **${mojangData.username}** to server whitelist(s)...`,
    });

    const results = await rconManager.whitelistOnAllServers(servers, 'java', mojangData.username, mojangData.uuid);

    // Check if at least one server succeeded
    if (rconManager.hasAnySuccess(results)) {
      // Save to users.json
      users = fileManager.addUser(users, discordUserId, 'java', mojangData.username, mojangData.uuid);
      await fileManager.saveUsers(users);

      const resultsMessage = rconManager.formatResults(results);
      
      await interaction.editReply({
        content: `✅ **Successfully whitelisted!**\n\n` +
          `**Platform:** Java Edition\n` +
          `**Username:** ${mojangData.username}\n` +
          `**UUID:** ${mojangData.uuid}\n\n` +
          resultsMessage,
      });
    } else {
      // All servers failed
      const resultsMessage = rconManager.formatResults(results);
      
      await interaction.editReply({
        content: `❌ **Failed to whitelist on any server**\n\n` +
          resultsMessage +
          `\nPlease contact an administrator for assistance.`,
      });
    }
  },

  async handleBedrockWhitelist(interaction, users, discordUserId, servers) {
    const gamertag = interaction.options.getString('gamertag');

    // Basic validation (Bedrock gamertags have different rules)
    if (gamertag.length < 3 || gamertag.length > 16) {
      return await interaction.editReply({
        content: `❌ Invalid gamertag format. Gamertags must be 3-16 characters.`,
      });
    }

    // Send whitelist command to all servers
    await interaction.editReply({
      content: `⏳ Adding **${gamertag}** to server whitelist(s)...`,
    });

    const results = await rconManager.whitelistOnAllServers(servers, 'bedrock', gamertag);

    // Check if at least one server succeeded
    if (rconManager.hasAnySuccess(results)) {
      // Save to users.json
      users = fileManager.addUser(users, discordUserId, 'bedrock', gamertag, null);
      await fileManager.saveUsers(users);

      const resultsMessage = rconManager.formatResults(results);
      
      await interaction.editReply({
        content: `✅ **Successfully whitelisted!**\n\n` +
          `**Platform:** Bedrock Edition\n` +
          `**Gamertag:** ${gamertag}\n\n` +
          resultsMessage,
      });
    } else {
      // All servers failed
      const resultsMessage = rconManager.formatResults(results);
      
      await interaction.editReply({
        content: `❌ **Failed to whitelist on any server**\n\n` +
          resultsMessage +
          `\nPlease contact an administrator for assistance.`,
      });
    }
  },
};
