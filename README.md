# Selective Auto Publisher

Selective Auto Publisher, or SAP, is a Discord bot for selectively publishing messages from announcement channels.

It is built for servers that need more control over which bot-generated messages should be published, based on allowed bots, allowed keywords, blocked keywords, channels, and channel-specific filters.

## Features

* Automatically publish matching messages
* Restrict publishing to specific source channels
* Restrict publishing to specific bot users
* Require allowed keywords
* Block messages with blocked keywords
* Add channel-specific filters
* Configure an audit channel
* Show current configuration
* PostgreSQL-backed configuration storage
* Ephemeral admin responses for configuration commands

## Commands

SAP uses multiple slash commands.

### Status

```text id="m66rmw"
/status
```

Shows current auto-publish settings.

### Publish mode

```text id="jozwh4"
/mode
```

Sets the publishing mode.

### Allowed bots

```text id="02nj7l"
/bot-add
/bot-remove
/bot-list
```

Controls which bot user IDs are allowed.

### Allowed keywords

```text id="ngmk68"
/keyword-add
/keyword-remove
/keyword-list
```

Controls keywords that can allow a message to be published.

### Blocked keywords

```text id="wklrtp"
/blockedkeyword-add
/blockedkeyword-remove
/blockedkeyword-list
```

Controls keywords that block a message from being published.

### Channel-specific filters

```text id="5q8q17"
/channel-filter-add
/channel-filter-remove
/channel-filter-list
```

Adds, removes, or lists filters for a specific channel.

Channel-specific filters can include:

```text id="ewh7v6"
allowed_bot
allowed_keyword
blocked_keyword
```

### Allowed channels

```text id="lngfda"
/channel-add
/channel-remove
/channel-list
```

Controls which channels SAP is allowed to process.

### Audit channel

```text id="p9nuz0"
/audit-channel-set
/audit-channel-clear
/audit-channel-show
```

Configures or shows the audit channel used for publish decisions and configuration visibility.

## Requirements

* Node.js
* PostgreSQL database
* Discord bot application
* Discord server where slash commands can be registered
* Announcement channels where publishing/crossposting is relevant

## Environment variables

SAP is configured through environment variables.

```env id="y9i5tp"
BOT_TOKEN=
CLIENT_ID=
GUILD_ID=
DEPLOY_GLOBAL_COMMANDS=
DATABASE_URL=

BOT_ID=sap
SUPPORT_MESSAGES_ENABLED=true
```

`DEPLOY_GLOBAL_COMMANDS=true` is only needed when deploying slash commands globally for public bot usage.

Optional support-message override:

```env id="3o4uaw"
SUPPORT_MESSAGE_CHANCE=
```

`SUPPORT_MESSAGE_CHANCE` is intended for testing or temporary override only. Do not set it permanently unless you specifically want to override the bot default.

## Installation

Install dependencies:

```bash
npm install
```

Deploy slash commands to the configured development/test guild:

```bash
npm run deploy
```

Deploy slash commands globally for public bot usage:

```bash
DEPLOY_GLOBAL_COMMANDS=true npm run deploy
```

On Windows PowerShell:

```powershell
$env:DEPLOY_GLOBAL_COMMANDS="true"
npm run deploy
Remove-Item Env:\DEPLOY_GLOBAL_COMMANDS
```

Guild deploy is useful for testing because commands update quickly. Global deploy is needed when the bot is installed in other servers.

Start the bot:

```bash
npm start
```

## Database

SAP uses PostgreSQL.

The database connection is read from:

```env id="mg55b1"
DATABASE_URL=
```

SAP stores server configuration such as allowed bots, allowed channels, keywords, blocked keywords, channel-specific filters, publish mode, and audit channel configuration.

## Permissions

SAP needs the Discord permissions required to:

* read relevant announcement channels
* publish messages in announcement channels
* use slash commands
* send ephemeral command responses
* write to the configured audit channel, if one is set

## Privacy and data

SAP stores configuration needed to decide whether messages should be published.

This may include:

* Discord server ID
* channel IDs
* bot user IDs
* allowed keywords
* blocked keywords
* channel-specific filter values
* audit channel ID
* publish mode

SAP is not designed as a general-purpose message archive.

## Support development

Selective Auto Publisher is built as an open source community tool.

If it helps your server, you can support further development by voting for the bot when voting pages are available, contributing feedback or issues on GitHub, or supporting the developer here:

https://buymeacoffee.com/andreasviken

## Links

* GitHub: https://github.com/briolist-fdl/selective-auto-publisher
* Support development: https://buymeacoffee.com/andreasviken

## License

No license has been specified yet.
