# Privacy Policy for SelectiveAutoPublisher

Revision date: 2026-09-29 (applies when this revision is deployed)

SelectiveAutoPublisher, or SAP, is a Discord bot for selectively publishing messages from announcement channels.

This privacy policy explains what data SAP stores and why.

## Data SAP may store

SAP may store configuration data needed to operate the bot, including:

* Discord server IDs
* channel IDs
* allowed bot user IDs
* allowed keywords
* blocked keywords
* channel-specific filters
* audit channel IDs
* publish mode settings

SAP may process message content when checking whether a message should be published or skipped according to the configured rules.

SAP may send audit messages only to a configured text channel in the same server as the source message. Audit messages may include author name and ID, source channel and message IDs, webhook ID, embed count, checked content types, configured or matched filters, and the publish/skip reason. A preview contains up to 100 characters of normalized message and embed text, followed by an ellipsis when truncated. Server administrators control who can view this channel. Audit messages do not trigger mentions.

Operational logs do not intentionally include message bodies, embeds, audit previews, or raw error payloads. They may contain message and channel IDs, publication outcomes, and generic failure notices. Content filtering and audit generation occur only after the source channel is confirmed as allowed. SAP receives server message events according to its Discord access; restrict its channel access to what is needed.

## Why this data is used

SAP uses this data to:

* decide whether a message should be published
* apply allowed bot filters
* apply allowed keyword filters
* apply blocked keyword filters
* apply channel-specific filters
* limit publishing to configured channels
* show current configuration to server administrators
* provide audit visibility for publish and skip decisions

## What SAP does not do

SAP is not designed as a general-purpose message archive.

SAP does not sell user data.

SAP does not share stored configuration data with advertisers or third parties.

## Data retention

SAP stores configuration data for as long as the bot is configured for a server.

Server administrators can remove or change stored configuration using the bot commands.

Removing the bot from a server may not automatically delete all stored configuration data from the database.

SAP does not automatically expire audit messages. They remain in Discord until removed by server administrators or other server retention controls. Clearing the audit channel setting stops future audit output; it does not delete earlier audit messages.

Operational log retention is controlled by the hosting provider and operator, not by SAP. A verified retention period has not yet been established for public distribution. Older deployments may have logged message content; this revision does not delete historical logs or backups. These require a separate operator review before public distribution.

## Data deletion

To request deletion of stored SAP data for a server, contact the maintainer through the GitHub repository:

https://github.com/briolist-fdl/selective-auto-publisher

## Open source

SAP is built as an open source community tool.

The source code is available here:

https://github.com/briolist-fdl/selective-auto-publisher

## Changes

This policy may be updated when SAP changes how it stores or processes data.
