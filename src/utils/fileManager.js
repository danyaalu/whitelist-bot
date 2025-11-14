const fs = require('fs').promises;
const path = require('path');

class FileManager {
  constructor() {
    this.usersFilePath = path.join(__dirname, '../../data/users.json');
    this.serversFilePath = path.join(__dirname, '../../data/servers.json');
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
        console.log('✅ Created users.json');
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
      const servers = JSON.parse(data);
      
      // Validate server configuration
      if (Object.keys(servers).length === 0) {
        throw new Error('servers.json is empty');
      }
      
      // Validate each server has required fields
      for (const [serverName, config] of Object.entries(servers)) {
        if (!config.rconHost || config.rconPort === undefined || config.rconPassword === undefined) {
          const missing = [];
          if (!config.rconHost) missing.push('rconHost');
          if (config.rconPort === undefined) missing.push('rconPort');
          if (config.rconPassword === undefined) missing.push('rconPassword');
          throw new Error(`Server "${serverName}" is missing required RCON configuration: ${missing.join(', ')}`);
        }
        if (!config.whitelistCommandJava || !config.whitelistCommandBedrock) {
          throw new Error(`Server "${serverName}" is missing whitelist command configuration`);
        }
      }
      
      console.log(`✅ Loaded ${Object.keys(servers).length} server(s) from servers.json`);
      return servers;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('servers.json not found! Please create it with your server configuration.');
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
   * Check if a Discord user already has a whitelist entry
   * @param {Object} users - Users data
   * @param {string} discordUserId - Discord user ID
   * @returns {boolean}
   */
  userExists(users, discordUserId) {
    return users.hasOwnProperty(discordUserId);
  }

  /**
   * Add or update a user entry
   * @param {Object} users - Users data
   * @param {string} discordUserId - Discord user ID
   * @param {string} platform - "java" or "bedrock"
   * @param {string} username - Minecraft username
   * @param {string|null} uuid - UUID for Java, null for Bedrock
   * @returns {Object} Updated users data
   */
  addUser(users, discordUserId, platform, username, uuid = null) {
    users[discordUserId] = {
      platform,
      username,
      uuid
    };
    return users;
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
