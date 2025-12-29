# Whitelist Bot Changes - Custom awhitelist Implementation

## Summary
The whitelist bot has been updated to use MCProfile.io for player validation and your custom `awhitelist` commands instead of vanilla Minecraft whitelist commands.

## Changes Made

### 1. API Migration (mojangApi.js → MCProfileAPI)
- **Changed from:** Mojang API (`api.mojang.com`) and multiple fallback APIs
- **Changed to:** MCProfile.io API (`mcprofile.io`)
- **New methods:**
  - `getJavaProfile(username)` - Returns `{ uuid, username }` for Java players
  - `getBedrockProfile(gamertag)` - Returns `{ xuid, gamertag, floodgateUuid }` for Bedrock players
  - `isValidGamertag(gamertag)` - Basic validation for Bedrock gamertags

### 2. Command Format (rconManager.js)
- **Old format:**
  - Java: `whitelist add <username>`
  - Bedrock: `fwhitelist add <gamertag>`
  
- **New format:**
  - Java: `awhitelist add <username> <uuid>`
  - Bedrock: `awhitelist add .<gamertag> <floodgate_uuid>`
  
- **Remove format:**
  - Java: `awhitelist remove <username>`
  - Bedrock: `awhitelist remove .<gamertag>`

### 3. Key Features
- **UUID Required:** Both Java and Bedrock players now require UUIDs for whitelisting
- **Bedrock Prefix:** Bedrock players automatically get a `.` prefix (e.g., `.mnhq`)
- **Floodgate UUID:** Uses Floodgate UUID from MCProfile for Bedrock players
- **Single API:** All validation goes through MCProfile.io
- **Queue System:** Already implemented - multiple requests are queued per server

## MCProfile API Endpoints Used

### Java Players
```
GET https://mcprofile.io/api/v1/java/username/{username}
Response: { "uuid": "...", "username": "..." }
```

### Bedrock Players
```
GET https://mcprofile.io/api/v1/bedrock/gamertag/{gamertag}
Response: { "xuid": "...", "gamertag": "...", "floodgateuid": "..." }
```

## Command Examples

### Java Player Whitelist
```
Input: /whitelist add java username:Notch
RCON Command: awhitelist add Notch 069a79f4-44e9-4726-a5be-fca90e38aaf5
```

### Bedrock Player Whitelist
```
Input: /whitelist add bedrock gamertag:mnhq
RCON Command: awhitelist add .mnhq 00000000-0000-0000-0009-01f645e67c6c
```

### Remove Commands
```
Java: awhitelist remove Notch
Bedrock: awhitelist remove .mnhq
```

## Server Configuration
Your `servers.json` no longer needs the following fields:
- `whitelistCommandJava`
- `whitelistCommandBedrock`
- `whitelistRemoveCommandJava`
- `whitelistRemoveCommandBedrock`

The bot now uses hardcoded `awhitelist` commands.

## Testing Checklist
- [ ] Test Java player whitelist add
- [ ] Test Bedrock player whitelist add
- [ ] Test Java player whitelist remove
- [ ] Test Bedrock player whitelist remove
- [ ] Verify `.` prefix appears for Bedrock players in RCON logs
- [ ] Verify Floodgate UUIDs are correct
- [ ] Test with invalid usernames/gamertags
- [ ] Test queue system with multiple simultaneous requests

## Notes
- MCProfile.io provides both XUID and Floodgate UUID for Bedrock players
- The bot stores Floodgate UUID in users.json for Bedrock players
- The bot stores Mojang UUID in users.json for Java players
- All validation happens before RCON commands are sent
- Error handling remains the same (404 = not found, 429 = rate limit, etc.)
