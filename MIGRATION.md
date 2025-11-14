# Migration Guide: Old to New Configuration

If you're upgrading from the previous version of the bot, you'll need to migrate your `servers.json` configuration.

## What Changed

### Before (Old Format)
```json
{
  "main_server": {
    "rconHost": "127.0.0.1",
    "rconPort": 25575,
    "rconPassword": "password",
    "whitelistCommandJava": "whitelist add {username}",
    "whitelistCommandBedrock": "fwhitelist add {gamertag}"
  }
}
```

### After (New Format)
```json
{
  "discordServers": {
    "YOUR_DISCORD_SERVER_ID": {
      "name": "My Discord Server",
      "minecraftServers": ["main_server"]
    }
  },
  "minecraftServers": {
    "main_server": {
      "displayName": "Main Server",
      "rconHost": "127.0.0.1",
      "rconPort": 25575,
      "rconPassword": "password",
      "whitelistCommandJava": "whitelist add {username}",
      "whitelistCommandBedrock": "fwhitelist add {gamertag}"
    }
  }
}
```

## Migration Steps

### 1. Get Your Discord Server ID

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode (enable)
2. Right-click your Discord server icon
3. Click "Copy Server ID"
4. Save this ID for the next step

### 2. Restructure servers.json

```json
{
  "discordServers": {
    "PASTE_YOUR_DISCORD_ID_HERE": {
      "name": "Your Server Name",
      "minecraftServers": ["server1", "server2"]
    }
  },
  "minecraftServers": {
    "server1": {
      "displayName": "Survival Server",
      // ... your existing config ...
    },
    "server2": {
      "displayName": "Creative Server",
      // ... your existing config ...
    }
  }
}
```

### 3. Add Display Names

Each Minecraft server now needs a `displayName` field that will be shown to users:

```json
"main_server": {
  "displayName": "Main Survival Server",  // Add this line
  "rconHost": "127.0.0.1",
  // ... rest of config
}
```

### 4. Users.json Migration

**Old users.json:**
```json
{
  "123456789012345678": {
    "platform": "java",
    "username": "Notch",
    "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5"
  }
}
```

**New users.json:**
```json
{
  "123456789012345678": {
    "servers": {
      "main_server": {
        "platform": "java",
        "username": "Notch",
        "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
        "whitelistedAt": "2025-11-14T00:00:00.000Z"
      }
    }
  }
}
```

**Migration Script:**

If you have many users, you can use this Node.js script to migrate:

```javascript
const fs = require('fs');

// Read old users.json
const oldUsers = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));

// Define which server to migrate to
const defaultServerId = 'main_server'; // Change this to your server ID

// Convert to new format
const newUsers = {};
for (const [userId, userData] of Object.entries(oldUsers)) {
  newUsers[userId] = {
    servers: {
      [defaultServerId]: {
        ...userData,
        whitelistedAt: new Date().toISOString()
      }
    }
  };
}

// Backup old file
fs.writeFileSync('data/users.json.backup', JSON.stringify(oldUsers, null, 2));

// Write new format
fs.writeFileSync('data/users.json', JSON.stringify(newUsers, null, 2));

console.log('Migration complete! Old file backed up to users.json.backup');
```

Save this as `migrate.js` and run: `node migrate.js`

## Key Differences

1. **Server Selection**: Users must now select which server to whitelist on
2. **Per-Server Entries**: Users can be whitelisted on multiple servers with different usernames
3. **Discord-Specific**: Each Discord server only sees its configured Minecraft servers
4. **Autocomplete**: Server selection uses Discord's autocomplete feature
5. **Display Names**: Servers have user-friendly names shown in Discord

## Command Changes

**Old:**
```
/whitelist java username:Steve
```

**New:**
```
/whitelist java server:[Select Server] username:Steve
```

Users will see a dropdown with server options like "Survival Server", "Creative Server", etc.
