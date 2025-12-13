# Deploying on Pterodactyl

This bot is ready to be deployed on Pterodactyl using the generic **Node.js** egg.

## Prerequisites

1.  A Pterodactyl Panel instance.
2.  A Discord Bot Token and Client ID.

## Installation Steps

1.  **Create Server**: Create a new server in Pterodactyl using the **Node.js** egg.
2.  **Upload Files**: Upload all files from this repository to the server (excluding `node_modules`).
3.  **Startup Command**: Set the Startup Command to:
    ```bash
    node index.js
    ```
4.  **Environment Variables**: Configure the following variables in the "Startup" tab or `env` configuration:
    *   `DISCORD_TOKEN`: Your Discord Bot Token.
    *   `CLIENT_ID`: Your Discord Application ID.
    *   `SERVER_PORT`: (Optional) The port assigned by Pterodactyl. The bot will start a small HTTP server on this port to keep the status "Online".

## Configuration

On the first run, the bot will generate a `data/servers.json` file from the example.

1.  Start the server once.
2.  Stop the server.
3.  Go to the **File Manager**.
4.  Edit `data/servers.json` with your Minecraft server RCON details and Discord server mappings.
5.  Start the server again.

## Troubleshooting

*   **Bot stays "Starting"**: Ensure the `SERVER_PORT` variable matches the Primary Port assigned to the server in Pterodactyl.
*   **RCON Errors**: Double-check the IP, Port, and Password in `data/servers.json`. Ensure the Pterodactyl server can reach the Minecraft server IPs.
