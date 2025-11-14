# Refactoring Summary

## Changes Made

The bot has been refactored to support multiple Discord servers managing different Minecraft servers.

### New Features

1. **Multi-Discord Server Support**
   - One bot instance can serve multiple Discord communities
   - Each Discord server sees only its configured Minecraft servers

2. **Per-Server Whitelisting**
   - Users can be whitelisted on different servers independently
   - Same user can have different usernames on different servers
   - Tracks when each whitelist was added

3. **Server Selection**
   - Users choose which Minecraft server to whitelist on
   - Autocomplete dropdown with friendly server names
   - Validates Discord server has access to selected Minecraft server

4. **Better Organization**
   - Clear separation between Discord servers and Minecraft servers
   - User-friendly display names for servers
   - Structured configuration file

## Updated Files

### Core Files
- ✅ `src/utils/fileManager.js` - New structure handling and validation
- ✅ `src/utils/rconManager.js` - Added single-server whitelist method
- ✅ `src/commands/whitelist.js` - Complete rewrite with server selection
- ✅ `index.js` - Added autocomplete handler

### Configuration
- ✅ `data/servers.json` - New two-section structure
- ✅ `data/servers.json.example` - Multi-server example
- ✅ `data/users.json.example` - Per-server user structure

### Documentation
- ✅ `README.md` - Updated with new configuration format
- ✅ `MIGRATION.md` - Migration guide from old format

## Configuration Structure

### servers.json
```json
{
  "discordServers": {
    "<Discord Server ID>": {
      "name": "Server Name",
      "minecraftServers": ["mc_server_1", "mc_server_2"]
    }
  },
  "minecraftServers": {
    "mc_server_1": {
      "displayName": "User-Friendly Name",
      "rconHost": "...",
      "rconPort": 25575,
      "rconPassword": "...",
      "whitelistCommandJava": "whitelist add {username}",
      "whitelistCommandBedrock": "fwhitelist add {gamertag}"
    }
  }
}
```

### users.json
```json
{
  "<Discord User ID>": {
    "servers": {
      "<Minecraft Server ID>": {
        "platform": "java" | "bedrock",
        "username": "...",
        "uuid": "..." | null,
        "whitelistedAt": "ISO timestamp"
      }
    }
  }
}
```

## Command Usage

### Old Format
```
/whitelist java username:Steve
```

### New Format
```
/whitelist java server:[Dropdown Selection] username:Steve
```

## Example Scenarios

### Scenario 1: Single Discord, Multiple Minecraft Servers
```json
{
  "discordServers": {
    "123456789": {
      "name": "Main Discord",
      "minecraftServers": ["survival", "creative", "skyblock"]
    }
  }
}
```
Users in this Discord can choose from 3 servers.

### Scenario 2: Multiple Discord Servers
```json
{
  "discordServers": {
    "111111111": {
      "name": "Public Discord",
      "minecraftServers": ["public_survival"]
    },
    "222222222": {
      "name": "VIP Discord",
      "minecraftServers": ["vip_survival", "vip_creative"]
    }
  }
}
```
- Public Discord users see only "Public Survival"
- VIP Discord users see "VIP Survival" and "VIP Creative"

### Scenario 3: Shared Servers
```json
{
  "discordServers": {
    "333333333": {
      "name": "Discord A",
      "minecraftServers": ["shared_server", "server_a"]
    },
    "444444444": {
      "name": "Discord B",
      "minecraftServers": ["shared_server", "server_b"]
    }
  }
}
```
Both Discord servers can whitelist on "shared_server", but each has their own exclusive server too.

## Testing

Bot starts successfully with new configuration:
```
✅ Loaded command: whitelist
✅ Logged in as MC Whitelist#5649
✅ Loaded 1 Discord server(s) and 1 Minecraft server(s)
✅ All configuration files loaded successfully
✅ Successfully registered 1 global command(s)
```

## Backward Compatibility

**Not backward compatible** - requires configuration migration.

See `MIGRATION.md` for step-by-step migration instructions.
