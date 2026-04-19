import "dotenv/config";

console.log("Deploying commands...");

import { REST, Routes, SlashCommandBuilder } from "discord.js";

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show current auto-publish settings"),

  new SlashCommandBuilder()
    .setName("mode")
    .setDescription("Set publish mode")
    .addStringOption(option =>
      option
        .setName("value")
        .setDescription("Publishing mode")
        .setRequired(true)
        .addChoices(
          { name: "all", value: "all" },
          { name: "only_bots", value: "only_bots" },
          { name: "allowed_bots", value: "allowed_bots" }
        )
    ),

  new SlashCommandBuilder()
    .setName("bot-add")
    .setDescription("Allow one bot by ID")
    .addStringOption(option =>
      option
        .setName("id")
        .setDescription("Bot user ID")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("bot-remove")
    .setDescription("Remove one allowed bot by ID")
    .addStringOption(option =>
      option
        .setName("id")
        .setDescription("Bot user ID")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("bot-list")
    .setDescription("List allowed bot IDs"),

  new SlashCommandBuilder()
    .setName("keyword-add")
    .setDescription("Add a keyword")
    .addStringOption(option =>
      option
        .setName("word")
        .setDescription("Keyword to allow")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("keyword-remove")
    .setDescription("Remove a keyword")
    .addStringOption(option =>
      option
        .setName("word")
        .setDescription("Keyword to remove")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("keyword-list")
    .setDescription("List allowed keywords"),

      new SlashCommandBuilder()
    .setName("blockedkeyword-add")
    .setDescription("Add a blocked keyword")
    .addStringOption(option =>
      option
        .setName("word")
        .setDescription("Keyword to block")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("blockedkeyword-remove")
    .setDescription("Remove a blocked keyword")
    .addStringOption(option =>
      option
        .setName("word")
        .setDescription("Keyword to remove from blocked list")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("blockedkeyword-list")
    .setDescription("List blocked keywords"),

  new SlashCommandBuilder()
    .setName("channel-add")
    .setDescription("Add an allowed channel")
    .addStringOption(option =>
      option
        .setName("id")
        .setDescription("Channel ID")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("channel-remove")
    .setDescription("Remove an allowed channel")
    .addStringOption(option =>
      option
        .setName("id")
        .setDescription("Channel ID")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("channel-list")
    .setDescription("List allowed channel IDs"),

new SlashCommandBuilder()
  .setName("audit-channel-set")
  .setDescription("Set audit channel")
  .addStringOption(option =>
    option.setName("id").setDescription("Channel ID").setRequired(true)
  ),

new SlashCommandBuilder()
  .setName("audit-channel-clear")
  .setDescription("Clear audit channel"),

new SlashCommandBuilder()
  .setName("audit-channel-show")
  .setDescription("Show audit channel"),

].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

try {
  console.log("Deploying slash commands...");
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );
  console.log("Slash commands deployed.");
} catch (error) {
  console.error(error);
}

console.log("Token exists:", Boolean(token));
console.log("Done!");
