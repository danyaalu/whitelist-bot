const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class FileManager {
  constructor() {
    this.usersFilePath = path.join(__dirname, '../../data/users.json');
    this.serversFilePath = path.join(__dirname, '../../data/servers.json');
    this.serversExamplePath = path.join(__dirname, '../../data/servers.json.example');
  }

  /**
   * Load users.json or create empty file if it doesn't exist
   * @returns {Promise<Object>} Users data
   */
  async loadUsers() {
    try {
      const data = await fs.readFile(this.usersFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create it with empty object
        await this.ensureDataDirectory();
        await fs.writeFile(this.usersFilePath, '{}', 'utf8');
        logger.log('✅ Created users.json');
        return {};
      }
      throw new Error(`Failed to load users.json: ${error.message}`);
    }
  }

  /**
   * Load servers.json - throws error if missing or invalid
   * @returns {Promise<Object>} Servers configuration
   */
  async loadServers() {
    try {
      const data = await fs.readFile(this.serversFilePath, 'utf8');
      const config = JSON.parse(data);
      
      // Validate new structure
      if (!config.discordServers || !config.minecraftServers) {
        throw new Error('servers.json must contain "discordServers" and "minecraftServers" sections');
      }
      
      // Validate Discord servers
      if (Object.keys(config.discordServers).length === 0) {
        throw new Error('No Discord servers configured in servers.json');
      }
      
      // Validate Minecraft servers
      if (Object.keys(config.minecraftServers).length === 0) {
        throw new Error('No Minecraft servers configured in servers.json');
      }
      
      // Validate each Minecraft server has required fields
      for (const [serverId, serverConfig] of Object.entries(config.minecraftServers)) {
        if (!serverConfig.rconHost || serverConfig.rconPort === undefined || serverConfig.rconPassword === undefined) {
          const missing = [];
          if (!serverConfig.rconHost) missing.push('rconHost');
          if (serverConfig.rconPort === undefined) missing.push('rconPort');
          if (serverConfig.rconPassword === undefined) missing.push('rconPassword');
          throw new Error(`Minecraft server "${serverId}" is missing required RCON configuration: ${missing.join(', ')}`);
        }
        if (!serverConfig.whitelistCommandJava || !serverConfig.whitelistCommandBedrock) {
          throw new Error(`Minecraft server "${serverId}" is missing whitelist command configuration`);
        }
        if (!serverConfig.displayName) {
          throw new Error(`Minecraft server "${serverId}" is missing displayName`);
        }
      }
      
      // Validate Discord server mappings reference valid Minecraft servers
      for (const [discordId, discordConfig] of Object.entries(config.discordServers)) {
        if (!discordConfig.minecraftServers || !Array.isArray(discordConfig.minecraftServers)) {
          throw new Error(`Discord server "${discordId}" must have a "minecraftServers" array`);
        }
        for (const mcServerId of discordConfig.minecraftServers) {
          if (!config.minecraftServers[mcServerId]) {
            throw new Error(`Discord server "${discordId}" references unknown Minecraft server "${mcServerId}"`);
          }
        }
      }
      
      logger.log(`✅ Loaded ${Object.keys(config.discordServers).length} Discord server(s) and ${Object.keys(config.minecraftServers).length} Minecraft server(s)`);
      return config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Try to copy from example if it exists
        try {
          await fs.copyFile(this.serversExamplePath, this.serversFilePath);
          logger.warn('⚠️ servers.json not found. Created one from servers.json.example. Please configure it!');
          // Read the newly created file
          const data = await fs.readFile(this.serversFilePath, 'utf8');
          return JSON.parse(data);
        } catch (copyError) {
          throw new Error('servers.json not found and failed to create from example! Please create it with your server configuration.');
        }
      }
      throw new Error(`Failed to load servers.json: ${error.message}`);
    }
  }

  /**
   * Save users data to users.json
   * @param {Object} users - Users data to save
   */
  async saveUsers(users) {
    try {
      await this.ensureDataDirectory();
      await fs.writeFile(this.usersFilePath, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save users.json: ${error.message}`);
    }
  }

  /**
   * Check if a Discord user already has a whitelist entry for a specific server
   * @param {Object} users - Users data
   * @param {string} discordUserId - Discord user ID
   * @param {string} serverId - Minecraft server ID
   * @returns {boolean}
   */
  userExistsOnServer(users, discordUserId, serverId) {
    return users[discordUserId] && users[discordUserId].servers && users[discordUserId].servers[serverId];
  }

  /**
   * Add or update a user entry for a specific server
   * @param {Object} users - Users data
   * @param {string} discordUserId - Discord user ID
   * @param {string} serverId - Minecraft server ID
   * @param {string} platform - "java" or "bedrock"
   * @param {string} username - Minecraft username
   * @param {string|null} uuid - UUID for Java, null for Bedrock
   * @returns {Object} Updated users data
   */
  addUserToServer(users, discordUserId, serverId, platform, username, uuid = null) {
    if (!users[discordUserId]) {
      users[discordUserId] = {
        servers: {}
      };
    }
    
    if (!users[discordUserId].servers) {
      users[discordUserId].servers = {};
    }
    
    users[discordUserId].servers[serverId] = {
      platform,
      username,
      uuid,
      whitelistedAt: new Date().toISOString()
    };
    
    return users;
  }

  /**
   * Get available Minecraft servers for a Discord guild
   * @param {Object} serversConfig - Server configuration
   * @param {string} guildId - Discord guild ID
   * @returns {Array} Array of available Minecraft server IDs
   */
  getAvailableServers(serversConfig, guildId) {
    const discordServer = serversConfig.discordServers[guildId];
    if (!discordServer) {
      return [];
    }
    return discordServer.minecraftServers || [];
  }

  /**
   * Ensure the data directory exists
   */
  async ensureDataDirectory() {
    const dataDir = path.join(__dirname, '../../data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory already exists, ignore
    }
  }
}

module.exports = new FileManager();
