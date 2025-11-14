# Minecraft Whitelist Discord Bot

A production-ready Discord bot for managing Minecraft server whitelists via RCON. Supports both Java Edition and Bedrock Edition (via Floodgate).

## Features

✅ **Slash Commands** - Modern Discord slash commands (`/whitelist java` and `/whitelist bedrock`)  
✅ **Mojang API Validation** - Validates Java Edition usernames and fetches UUIDs  
✅ **Multi-Server Support** - Apply whitelist to multiple servers simultaneously  
✅ **RCON Integration** - Sends whitelist commands directly to your Minecraft servers  
✅ **Duplicate Prevention** - Prevents users from linking multiple accounts  
✅ **JSON Storage** - Lightweight storage with no database required  
✅ **Error Handling** - Comprehensive error handling and user feedback  
✅ **Bedrock Support** - Works with Floodgate for Bedrock Edition players

## Project Structure

```
whitelist-bot/
├── index.js                    # Main bot entry point
├── package.json                # Dependencies
├── .env                        # Environment variables (create from .env.example)
├── .env.example                # Example environment configuration
├── .gitignore                  # Git ignore rules
├── data/
│   ├── servers.json            # Server configuration
│   ├── users.json              # User whitelist data (auto-created)
│   └── users.json.example      # Example user data structure
└── src/
    ├── commands/
    │   └── whitelist.js        # Whitelist command handler
    └── utils/
        ├── fileManager.js      # JSON file operations
        ├── mojangApi.js        # Mojang API integration
        └── rconManager.js      # RCON connection manager
```

## Installation

### Prerequisites

- **Node.js** v16.9.0 or higher
- **npm** (comes with Node.js)
- A **Discord bot** with proper permissions
- **Minecraft server(s)** with RCON enabled

### Step 1: Clone or Download

```bash
cd /home/danyaal/Documents/development/whitelist-bot
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `discord.js` v14.14.1 - Discord API library
- `rcon-client` v4.2.3 - RCON connection library
- `dotenv` v16.4.5 - Environment variable management

### Step 3: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under "Token", click "Reset Token" and copy it (keep it secret!)
5. Copy your Application ID from the "General Information" tab
6. Enable "MESSAGE CONTENT INTENT" in the Bot tab (if needed)

### Step 4: Invite Bot to Your Server

Use this URL (replace `YOUR_CLIENT_ID` with your Application ID):

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147483648&scope=bot%20applications.commands
```

Permissions included:
- Use Application Commands
- Send Messages

### Step 5: Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_bot_client_id_here

# Optional: For instant command registration during testing
GUILD_ID=your_test_server_id_here
```

**Important:** If you set `GUILD_ID`, commands will register instantly but only work in that server. Leave it empty for global commands (takes up to 1 hour to propagate).

### Step 6: Configure Servers

Edit `data/servers.json` with your Minecraft server details:

```json
{
  "main_server": {
    "rconHost": "127.0.0.1",
    "rconPort": 25575,
    "rconPassword": "your_rcon_password_here",
    "whitelistCommandJava": "whitelist add {username}",
    "whitelistCommandBedrock": "fwhitelist add {gamertag}"
  },
  "survival_server": {
    "rconHost": "192.168.1.100",
    "rconPort": 25575,
    "rconPassword": "another_password",
    "whitelistCommandJava": "whitelist add {username}",
    "whitelistCommandBedrock": "fwhitelist add {gamertag}"
  }
}
```

**Configuration Options:**
- `rconHost` - Server IP address or hostname
- `rconPort` - RCON port (usually 25575)
- `rconPassword` - RCON password from server.properties
- `whitelistCommandJava` - Command template for Java (use `{username}` or `{uuid}`)
- `whitelistCommandBedrock` - Command template for Bedrock (use `{gamertag}`)

**Note:** For Bedrock support, you need [Floodgate](https://geysermc.org/download#floodgate) installed on your server.

### Step 7: Enable RCON on Your Minecraft Server

Edit your `server.properties`:

```properties
enable-rcon=true
rcon.port=25575
rcon.password=your_secure_password_here
```

Restart your Minecraft server after making changes.

## Usage

### Start the Bot

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

You should see:
```
✅ Loaded command: whitelist
✅ Logged in as YourBot#1234
✅ Loaded 2 server(s) from servers.json
✅ Created users.json
✅ All configuration files loaded successfully
✅ Successfully registered 1 application (/) commands
```

### Using Slash Commands

#### Java Edition

```
/whitelist java username:Notch
```

The bot will:
1. Validate the username format
2. Query Mojang API to get the UUID
3. Check if user already has an entry
4. Send whitelist command to all servers
5. Save the data to `users.json`

#### Bedrock Edition

```
/whitelist bedrock gamertag:BedrockPlayer
```

The bot will:
1. Validate the gamertag format
2. Check if user already has an entry
3. Send Floodgate whitelist command to all servers
4. Save the data to `users.json`

## Data Storage

### users.json Format

```json
{
  "123456789012345678": {
    "platform": "java",
    "username": "Notch",
    "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5"
  },
  "987654321098765432": {
    "platform": "bedrock",
    "username": "BedrockPlayer",
    "uuid": null
  }
}
```

- **Key:** Discord User ID
- **platform:** "java" or "bedrock"
- **username:** Minecraft username/gamertag
- **uuid:** Player UUID (Java only, null for Bedrock)

## How It Works

### Command Flow

```
User runs /whitelist java <username>
         ↓
Validate username format
         ↓
Query Mojang API for UUID
         ↓
Check for existing entry
         ↓
Connect to each server via RCON
         ↓
Send whitelist command
         ↓
Save to users.json
         ↓
Send success/error message
```

### Architecture

- **index.js** - Bot initialization, command registration, event handlers
- **whitelist.js** - Command logic, handles both Java and Bedrock
- **fileManager.js** - JSON file I/O operations
- **mojangApi.js** - Validates Java usernames via Mojang API
- **rconManager.js** - RCON connection and command execution

### Error Handling

The bot handles:
- Invalid usernames/gamertags
- Non-existent Mojang accounts
- RCON connection failures
- Invalid server configuration
- Duplicate whitelist attempts
- API rate limits

## Troubleshooting

### Bot doesn't respond to commands

- Wait up to 1 hour for global command registration, OR set `GUILD_ID` in `.env`
- Check bot has proper permissions in Discord server
- Verify bot token is correct in `.env`

### "Failed to connect to server"

- Check RCON is enabled in `server.properties`
- Verify `rconHost`, `rconPort`, and `rconPassword` in `servers.json`
- Ensure firewall allows RCON port (default 25575)
- Test RCON manually with a tool like `mcrcon`

### "Username not found"

- Username may not exist or be spelled incorrectly
- Mojang API may be temporarily down
- Check Mojang API status: https://status.mojang.com/

### Bedrock whitelist not working

- Ensure [Floodgate](https://geysermc.org/download#floodgate) is installed
- Verify the command in `whitelistCommandBedrock` is correct for your setup
- Default Floodgate command: `fwhitelist add {gamertag}`

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit `.env`** - Contains sensitive bot token
2. **Never commit `users.json`** - Contains user data
3. **Protect RCON passwords** - Use strong, unique passwords
4. **Restrict RCON access** - Use firewall to limit RCON port access
5. **Regular backups** - Backup `users.json` regularly

## Advanced Configuration

### Custom Commands

You can customize whitelist commands per server:

```json
{
  "custom_server": {
    "rconHost": "mc.example.com",
    "rconPort": 25575,
    "rconPassword": "password",
    "whitelistCommandJava": "lp user {uuid} permission set minecraft.whitelist true",
    "whitelistCommandBedrock": "lp user {gamertag} permission set minecraft.whitelist true"
  }
}
```

This example uses LuckPerms instead of vanilla whitelist.

### Multiple Bots

Run multiple instances by:
1. Duplicate the folder
2. Create a new Discord application
3. Use different bot tokens
4. Point to different server configurations

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - See LICENSE file for details

## Support

For help:
- Check the troubleshooting section
- Review Discord bot logs
- Check Minecraft server console
- Verify RCON connectivity

---

**Made with ❤️ for the Minecraft community**
