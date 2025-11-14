const { Rcon } = require('rcon-client');

class RconManager {
  /**
   * Execute a command on a single server via RCON
   * @param {Object} serverConfig - Server configuration
   * @param {string} command - Command to execute
   * @param {string} serverName - Server name for logging
   * @returns {Promise<{success: boolean, serverName: string, response?: string, error?: string}>}
   */
  async executeCommand(serverConfig, command, serverName) {
    let rcon;
    
    try {
      rcon = await Rcon.connect({
        host: serverConfig.rconHost,
        port: serverConfig.rconPort,
        password: serverConfig.rconPassword,
        timeout: 10000 // 10 second timeout
      });

      const response = await rcon.send(command);
      
      return {
        success: true,
        serverName,
        response
      };
    } catch (error) {
      return {
        success: false,
        serverName,
        error: error.message
      };
    } finally {
      if (rcon) {
        try {
          await rcon.end();
        } catch (error) {
          // Ignore errors when closing connection
        }
      }
    }
  }

  /**
   * Execute whitelist command on all configured servers
   * @param {Object} servers - All server configurations
   * @param {string} platform - "java" or "bedrock"
   * @param {string} username - Username or gamertag
   * @param {string|null} uuid - UUID (Java only)
   * @returns {Promise<Array>} Results from all servers
   */
  async whitelistOnAllServers(servers, platform, username, uuid = null) {
    const results = [];
    
    for (const [serverName, config] of Object.entries(servers)) {
      // Build command based on platform
      let command;
      if (platform === 'java') {
        command = config.whitelistCommandJava
          .replace('{uuid}', uuid || username)
          .replace('{username}', username);
      } else {
        command = config.whitelistCommandBedrock.replace('{gamertag}', username);
      }
      
      const result = await this.executeCommand(config, command, serverName);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Format results into a user-friendly message
   * @param {Array} results - Results from all servers
   * @returns {string} Formatted message
   */
  formatResults(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    let message = '';
    
    if (successful.length > 0) {
      message += `✅ **Successfully whitelisted on ${successful.length} server(s):**\n`;
      successful.forEach(r => {
        message += `• ${r.serverName}\n`;
      });
    }
    
    if (failed.length > 0) {
      if (message) message += '\n';
      message += `❌ **Failed on ${failed.length} server(s):**\n`;
      failed.forEach(r => {
        message += `• ${r.serverName}: ${r.error}\n`;
      });
    }
    
    return message;
  }

  /**
   * Check if at least one server succeeded
   * @param {Array} results - Results from all servers
   * @returns {boolean}
   */
  hasAnySuccess(results) {
    return results.some(r => r.success);
  }
}

module.exports = new RconManager();
