# Privacy Policy for Selective Auto Publisher

Effective date: 2026-07-03

Selective Auto Publisher, or SAP, is a Discord bot for selectively publishing messages from announcement channels.

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

SAP may also send audit messages to a configured audit channel. These audit messages may include decision details such as the source channel, author or bot, message ID, publish/skip reason, matched filters, and a limited content preview.

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

## Data deletion

To request deletion of stored SAP data for a server, contact the maintainer through the GitHub repository:

https://github.com/briolist-fdl/selective-auto-publisher

## Open source

SAP is built as an open source community tool.

The source code is available here:

https://github.com/briolist-fdl/selective-auto-publisher

## Changes

This policy may be updated when SAP changes how it stores or processes data.
