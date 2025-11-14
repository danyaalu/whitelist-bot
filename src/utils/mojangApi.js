const https = require('https');

class MojangAPI {
  /**
   * Validate a Java Edition username and get UUID
   * @param {string} username - Minecraft Java username
   * @returns {Promise<{uuid: string, username: string}>}
   */
  async getUUID(username) {
    return new Promise((resolve, reject) => {
      const url = `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              // Format UUID with dashes (Mojang API returns without dashes)
              const uuid = this.formatUUID(parsed.id);
              resolve({
                uuid: uuid,
                username: parsed.name
              });
            } catch (error) {
              reject(new Error('Failed to parse Mojang API response'));
            }
          } else if (res.statusCode === 204 || res.statusCode === 404) {
            reject(new Error('Username not found. Please check the spelling.'));
          } else if (res.statusCode === 429) {
            reject(new Error('Too many requests to Mojang API. Please try again later.'));
          } else {
            reject(new Error(`Mojang API error: ${res.statusCode}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Failed to connect to Mojang API: ${error.message}`));
      });
    });
  }

  /**
   * Format UUID string with dashes
   * @param {string} uuid - UUID without dashes
   * @returns {string} UUID with dashes
   */
  formatUUID(uuid) {
    return `${uuid.substr(0, 8)}-${uuid.substr(8, 4)}-${uuid.substr(12, 4)}-${uuid.substr(16, 4)}-${uuid.substr(20)}`;
  }

  /**
   * Validate username format (basic check)
   * @param {string} username - Username to validate
   * @returns {boolean}
   */
  isValidUsername(username) {
    // Minecraft usernames: 3-16 characters, alphanumeric and underscore only
    const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
    return usernameRegex.test(username);
  }
}

module.exports = new MojangAPI();
