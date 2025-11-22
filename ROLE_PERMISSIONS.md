# Role-Based Permissions

## Overview

The bot now supports role-based permissions to control who can use the `/whitelist` command. This allows Discord server administrators to restrict whitelist access to specific roles.

## How It Works

- Each Discord server in your configuration can specify a `requiredRoles` array
- Users must have **at least ONE** of the specified roles to use the whitelist command
- If `requiredRoles` is empty or not specified, everyone can use the command (no restrictions)

## Configuration

### In `data/servers.json`:

```json
{
  "discordServers": {
    "123456789012345678": {
      "name": "My Discord Server",
      "minecraftServers": ["s1"],
      "requiredRoles": []
    }
  }
}
```

### Getting Role IDs

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode ✅

2. Get the Role ID:
   - Right-click the server icon → Server Settings → Roles
   - Right-click the desired role → Copy Role ID
   - Paste the ID into the `requiredRoles` array

## Examples

### No Restrictions (Everyone can use the command)
```json
"requiredRoles": []
```

### Require ONE specific role
```json
"requiredRoles": ["111111111111111111"]
```

### Require ONE of MULTIPLE roles (OR logic)
```json
"requiredRoles": ["111111111111111111", "222222222222222222", "333333333333333333"]
```
Users with role `111111111111111111` **OR** `222222222222222222` **OR** `333333333333333333` can use the command.

## User Experience

When a user without the required role tries to use `/whitelist`:
```
❌ You do not have permission to use this command. You need one of the required roles.
```

## Implementation Details

The permission check happens:
- **After** the Discord server validation
- **Before** any whitelist operations
- **In** the `execute()` function in `src/commands/whitelist.js`

The check uses `interaction.member.roles.cache.has(roleId)` to verify role membership.

## Migration

Existing configurations are automatically compatible. If your `servers.json` doesn't have `requiredRoles`, the bot treats it as an empty array (no restrictions).

To add role restrictions to an existing server, simply add the `requiredRoles` field:

```json
{
  "discordServers": {
    "123456789012345678": {
      "name": "My Server",
      "minecraftServers": ["s1"],
      "requiredRoles": ["YOUR_ROLE_ID_HERE"]  // ← Add this line
    }
  }
}
```

No restart required after editing `servers.json` - the bot reads it on each command execution.
