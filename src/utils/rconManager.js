const { Rcon } = require('rcon-client');

class RconManager {
  constructor() {
    this.connectionTimeout = 10000; // 10 seconds for connection
    this.commandTimeout = 5000;     // 5 seconds for command execution
  }

  /**
   * Create a timeout promise
   * @param {number} ms - Milliseconds to wait
   * @param {string} operation - Operation name for error message
   */
  createTimeout(ms, operation) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms / 1000} seconds: ${operation}`));
      }, ms);
    });
  }

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
      // Wrap entire operation in a timeout
      const operationPromise = (async () => {
        rcon = await Rcon.connect({
          host: serverConfig.rconHost,
          port: serverConfig.rconPort,
          password: serverConfig.rconPassword,
          timeout: this.connectionTimeout
        });

        const response = await rcon.send(command);
        return response;
      })();

      const response = await Promise.race([
        operationPromise,
        this.createTimeout(this.connectionTimeout + this.commandTimeout, 'RCON connection and command execution')
      ]);
      
      return {
        success: true,
        serverName,
        response
      };
    } catch (error) {
      let errorMessage = error.message;
      
      // Provide more helpful error messages
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Check if RCON is enabled and the server is running.';
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timed out')) {
        errorMessage = 'Connection timed out. Server may be offline or overloaded.';
      } else if (error.message.includes('authentication')) {
        errorMessage = 'Authentication failed. Check RCON password.';
      }
      
      return {
        success: false,
        serverName,
        error: errorMessage
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
   * Execute a whitelist command (add or remove) on a specific server
   * @param {Object} serverConfig - Minecraft server configuration
   * @param {string} serverId - Server ID for logging
   * @param {'add'|'remove'} action - The action to perform
   * @param {string} platform - "java" or "bedrock"
   * @param {string} username - Username or gamertag
   * @param {string|null} uuid - UUID (Java only, stored for record-keeping but not used in commands)
   * @returns {Promise<Object>} Result from server
   */
  async executeWhitelistCommand(serverConfig, serverId, action, platform, username, uuid = null) {
    // Get the appropriate command template with defaults
    let commandTemplate;
    if (action === 'add') {
      commandTemplate = platform === 'java' 
        ? serverConfig.whitelistCommandJava 
        : serverConfig.whitelistCommandBedrock;
    } else { // action === 'remove'
      // Use configured remove command or default to standard Minecraft commands
      if (platform === 'java') {
        commandTemplate = serverConfig.whitelistRemoveCommandJava || 'whitelist remove {username}';
      } else {
        commandTemplate = serverConfig.whitelistRemoveCommandBedrock || 'fwhitelist remove {gamertag}';
      }
    }

    if (!commandTemplate) {
      return {
        success: false,
        serverName: serverId,
        error: `${action} command for ${platform} is not configured for this server.`
      };
    }

    // Build command with placeholders
    // NOTE: For Java Edition, we always use {username} instead of {uuid} because:
    // 1. Vanilla Minecraft's whitelist command accepts usernames
    // 2. Online-mode servers will automatically resolve to Mojang UUIDs
    // 3. Offline-mode servers generate different UUIDs, so using Mojang UUIDs would fail
    // The UUID is fetched and stored for validation and record-keeping only
    const command = commandTemplate
      .replace('{uuid}', username)  // Always use username even if {uuid} placeholder is used
      .replace('{username}', username)
      .replace('{gamertag}', username);
    
    const result = await this.executeCommand(serverConfig, command, serverId);
    
    // Check if the response indicates an error
    if (result.success && result.response) {
      const response = result.response.toLowerCase();
      
      // Check for common error patterns in the response
      if (response.includes('unknown') || 
          response.includes('usage:') ||
          response.includes('error') ||
          response.includes('failed') ||
          response.includes('invalid') ||
          response.includes('not found')) {
        
        // Clean up the error message
        let errorMsg = result.response.trim();
        
        // Remove Minecraft formatting markers (like <--[HERE])
        errorMsg = errorMsg.replace(/<--\[HERE\]/g, '');
        
        // Extract the most relevant part of the error
        if (errorMsg.toLowerCase().includes('unknown')) {
          if (platform === 'bedrock') {
            errorMsg = 'Server does not support Bedrock players. Floodgate may not be installed.';
          } else {
            errorMsg = 'Unknown command. Please check your server configuration.';
          }
        } else if (errorMsg.toLowerCase().includes('usage:')) {
          errorMsg = 'Invalid command syntax. Please check your whitelist command configuration.';
        }
        
        return {
          success: false,
          serverName: serverId,
          error: errorMsg
        };
      }
    }
    
    return result;
  }

  /**
   * Execute whitelist add command on a specific server (legacy compatibility)
   * @param {Object} serverConfig - Minecraft server configuration
   * @param {string} serverId - Server ID for logging
   * @param {string} platform - "java" or "bedrock"
   * @param {string} username - Username or gamertag
   * @param {string|null} uuid - UUID (Java only)
   * @returns {Promise<Object>} Result from server
   */
  async whitelistOnServer(serverConfig, serverId, platform, username, uuid = null) {
    return this.executeWhitelistCommand(serverConfig, serverId, 'add', platform, username, uuid);
  }

  /**
   * Format result into a user-friendly message
   * @param {Object} result - Result from server
   * @param {string} displayName - Display name of server
   * @returns {string} Formatted message
   */
  formatResult(result, displayName) {
    if (result.success) {
      return `✅ Successfully whitelisted on **${displayName}**`;
    } else {
      return `❌ Failed to whitelist on **${displayName}**: ${result.error}`;
    }
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
