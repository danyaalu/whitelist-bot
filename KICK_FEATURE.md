# Auto-Kick Feature

## Overview

When a player removes themselves from the whitelist using `/whitelist remove`, the bot now automatically kicks them from the Minecraft server via RCON.

## Implementation Details

### How It Works

1. User executes `/whitelist remove java` or `/whitelist remove bedrock`
2. Bot removes player from the whitelist via RCON
3. **NEW:** Bot executes a `kick <username>` command via RCON
4. Bot updates the database (users.json)
5. Bot confirms removal to the user

### Bedrock Player Handling

Bedrock players (via Floodgate) require a **`.` prefix** when executing kick commands:

- **Java Edition:** `kick PlayerName`
- **Bedrock Edition:** `kick .PlayerGamertag`

The bot automatically adds the `.` prefix for Bedrock players.

## Technical Implementation

### Modified Files

1. **`src/commands/whitelist.js`**
   - Updated `handleJavaRemove()` to call kick command
   - Updated `handleBedrockRemove()` to call kick command with `.` prefix

2. **`src/utils/rconManager.js`**
   - Added `executeKickCommand()` method
   - Automatically adds `.` prefix for Bedrock players
   - Handles errors gracefully (player might not be online)

### Code Flow

```javascript
// In handleJavaRemove()
if (result.success) {
  // Kick the player from the server
  await rconManager.executeKickCommand(
    serverConfig,
    serverId,
    'java',
    username
  );
  
  // ... continue with database update
}

// In handleBedrockRemove()
if (result.success) {
  // Kick the player from the server (Bedrock players need '.' prefix)
  await rconManager.executeKickCommand(
    serverConfig,
    serverId,
    'bedrock',
    gamertag
  );
  
  // ... continue with database update
}
```

### The executeKickCommand() Method

```javascript
async executeKickCommand(serverConfig, serverId, platform, username) {
  // For Bedrock players, add '.' prefix
  const playerName = platform === 'bedrock' ? `.${username}` : username;
  
  // Construct kick command
  const kickCommand = `kick ${playerName}`;
  
  console.log(`[${serverId}] Executing kick command for ${platform}: ${kickCommand}`);
  
  // Execute the kick command (ignore if it fails, player might not be online)
  try {
    const result = await this.executeCommand(serverConfig, kickCommand, serverId);
    if (result.success) {
      console.log(`[${serverId}] Successfully kicked ${playerName}`);
    } else {
      console.log(`[${serverId}] Failed to kick ${playerName} (player might not be online): ${result.error}`);
    }
    return result;
  } catch (error) {
    console.log(`[${serverId}] Error kicking ${playerName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

## Error Handling

The kick command is **non-critical** - it will not prevent the whitelist removal from succeeding:

- ✅ If the player is online: They will be kicked
- ✅ If the player is offline: The kick fails silently, whitelist removal continues
- ✅ If RCON fails: Error is logged, whitelist removal continues

The bot does not report kick failures to the user to avoid confusion.

## Examples

### Java Edition Player Removal

```
User executes: /whitelist remove java
Bot executes via RCON:
  1. whitelist remove PlayerName
  2. kick PlayerName
```

### Bedrock Edition Player Removal

```
User executes: /whitelist remove bedrock
Bot executes via RCON:
  1. fwhitelist remove PlayerGamertag
  2. kick .PlayerGamertag  ← Note the '.' prefix
```

## Benefits

1. **Immediate Effect**: Players are removed from the server instantly
2. **Security**: Prevents players from staying on after removing themselves
3. **User Experience**: Smooth transition - players see they've been kicked after removing themselves
4. **Non-Intrusive**: If kick fails (player offline), the process still completes successfully

## Logging

All kick commands are logged to console:

```
[s1] Executing kick command for java: kick Steve
[s1] Successfully kicked Steve

[s2] Executing kick command for bedrock: kick .BedrockPlayer
[s2] Successfully kicked .BedrockPlayer

[s3] Executing kick command for java: kick Alex
[s3] Failed to kick Alex (player might not be online): Connection refused
```

This helps with debugging and monitoring.
