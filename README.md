# SelectiveAutoPublisher

SelectiveAutoPublisher, or SAP, is a Discord bot for selectively publishing messages from announcement channels.

It is built for servers that need more control over which bot-generated messages should be published, based on allowed bots, allowed keywords, blocked keywords, channels, and channel-specific filters.

## Add SelectiveAutoPublisher to a server

[Install SelectiveAutoPublisher](https://discord.com/oauth2/authorize?client_id=1493291008509739158&scope=bot%20applications.commands&permissions=93184&integration_type=0)

The link requests Guild Install with permission to view announcement channels, read message history, send messages, embed links and manage messages. A server administrator chooses the channels SAP may process.

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

## Publishing rules

SAP is a general-purpose publisher. It has no built-in game, source-bot, feed, or opt-out phrase rules. Each server chooses which channels and authors are eligible; it can enable any combination of channels or none.

After channel and author/mode checks, blocked keywords take precedence over allowed keywords. Server-wide blocked keywords apply to every allowed channel, including channels with their own filters. Channel-specific blocked keywords add restrictions for that channel only. A match in either list prevents publishing and is reported as `blocked_keyword` in the audit. Existing mode rejections remain `mode_mismatch`.

Matching is case-insensitive substring matching against message text and supported embed text (titles, descriptions, field names and values). No phrase is reserved: configure any source's opt-out text as a blocked keyword wherever that convention should apply. Without that configuration, SAP gives the phrase no special meaning. Administrators are responsible for selecting rules appropriate to their sources and consent requirements.

Channel-specific allowed keywords take precedence over server-wide allowed keywords. As before, a channel with any channel-specific filter but no allowed keywords does not require a server-wide allowed-keyword match. Server-wide blocked keywords still apply.

Compatibility note: server-wide blocked keywords previously acted only as a fallback. Review those existing settings before deploying this revision: they now also restrict channels with custom filters. Use channel-specific blocked keywords for restrictions that should apply to only one channel.

## Commands

SAP uses multiple slash commands. All commands are for server use and require Manage Server (or Administrator). Registration sets Manage Server as the default permission; the bot also checks permissions at runtime, even if command visibility is overridden in Discord. Global commands are restricted to server installations and server contexts, not direct messages or personal installations.

Changes to command registration take effect only after running the deployment script for the intended scope. Restarting the bot alone does not update command visibility.

### About and support

`/about` is available to all server members. It gives a short setup path and links to [join BrioBots](https://discord.gg/eN75kTXWjb) or [open #selective-auto-publisher](https://discord.com/channels/1550119459891576852/1557068949412380782) if already a member. The invite was checked against Discord on 2026-10-08: it points to the SAP channel in BrioBots and has no expiration time. The response suppresses link previews for a compact layout. The global command is used in every server; do not also register a guild-specific `/about`, which would make it appear twice.

SAP only processes announcement channels that an administrator explicitly adds. It needs Manage Messages in those channels to publish qualifying posts to follower servers. Administrators can limit the SAP bot role to the channels selected for publishing.

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

Controls which channels SAP is allowed to process. Adding a source channel or adding channel-specific filters requires an announcement channel in the current server. SAP checks its effective View Channel, Send Messages, and Manage Messages permissions before saving. Administrator is not required. These checks do not activate a channel when only filters are added. Existing entries can still be removed if the channel is deleted or access is lost.

Validation checks the permissions at configuration time. Later permission changes can still prevent publication; existing stored entries are not automatically migrated or removed.

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
* manage messages in the announcement channels selected for publishing
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

SelectiveAutoPublisher is built as an open source community tool.

If it helps your server, you can support further development by voting for the bot when voting pages are available, contributing feedback or issues on GitHub, or supporting the developer here:

https://buymeacoffee.com/briolist

## Links

* GitHub: https://github.com/briolist-fdl/selective-auto-publisher
* Support development: https://buymeacoffee.com/briolist

## License

No license has been specified yet.
