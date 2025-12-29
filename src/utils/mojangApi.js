const https = require('https');

class MCProfileAPI {
  /**
   * Validate a Java Edition username and get UUID using MCProfile
   * @param {string} username - Minecraft Java username
   * @returns {Promise<{uuid: string, username: string}>}
   */
  async getJavaProfile(username) {
    return new Promise((resolve, reject) => {
      const url = `https://mcprofile.io/api/v1/java/username/${encodeURIComponent(username)}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.uuid && parsed.username) {
                resolve({
                  uuid: parsed.uuid,
                  username: parsed.username
                });
              } else {
                reject(new Error('Invalid response from MCProfile API'));
              }
            } catch (error) {
              reject(new Error('Failed to parse MCProfile API response'));
            }
          } else if (res.statusCode === 404) {
            reject(new Error('Username not found. Please check the spelling.'));
          } else if (res.statusCode === 429) {
            reject(new Error('Too many requests to MCProfile API. Please try again later.'));
          } else {
            reject(new Error(`MCProfile API error: ${res.statusCode}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Failed to connect to MCProfile API: ${error.message}`));
      });
    });
  }

  /**
   * Validate a Bedrock Edition gamertag and get XUID and Floodgate UUID using MCProfile
   * @param {string} gamertag - Minecraft Bedrock gamertag
   * @returns {Promise<{xuid: string, gamertag: string, floodgateUuid: string}>}
   */
  async getBedrockProfile(gamertag) {
    return new Promise((resolve, reject) => {
      const url = `https://mcprofile.io/api/v1/bedrock/gamertag/${encodeURIComponent(gamertag)}`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.xuid && parsed.gamertag && parsed.floodgateuid) {
                resolve({
                  xuid: parsed.xuid,
                  gamertag: parsed.gamertag,
                  floodgateUuid: parsed.floodgateuid
                });
              } else {
                reject(new Error('Invalid response from MCProfile API'));
              }
            } catch (error) {
              reject(new Error('Failed to parse MCProfile API response'));
            }
          } else if (res.statusCode === 404) {
            reject(new Error('Gamertag not found. Please check the spelling.'));
          } else if (res.statusCode === 429) {
            reject(new Error('Too many requests to MCProfile API. Please try again later.'));
          } else {
            reject(new Error(`MCProfile API error: ${res.statusCode}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Failed to connect to MCProfile API: ${error.message}`));
      });
    });
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

  /**
   * Validate gamertag format (basic check)
   * @param {string} gamertag - Gamertag to validate
   * @returns {boolean}
   */
  isValidGamertag(gamertag) {
    // Bedrock gamertags: 3-16 characters
    return gamertag.length >= 3 && gamertag.length <= 16;
  }
}

module.exports = new MCProfileAPI();
