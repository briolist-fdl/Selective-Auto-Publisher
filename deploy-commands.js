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
  .setName("channel-filter-add")
  .setDescription("Add one or more channel-specific publish filters")
  .addStringOption(option =>
    option
      .setName("channel_id")
      .setDescription("Channel ID")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("allowed_bot")
      .setDescription("Allowed bot user ID")
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName("allowed_keyword")
      .setDescription("Keyword required for this channel")
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName("blocked_keyword")
      .setDescription("Keyword blocked for this channel")
      .setRequired(false)
  ),

  new SlashCommandBuilder()
  .setName("channel-filter-remove")
  .setDescription("Remove a channel-specific publish filter")
  .addStringOption(option =>
    option
      .setName("channel_id")
      .setDescription("Channel ID")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("type")
      .setDescription("Filter type")
      .setRequired(true)
      .addChoices(
        { name: "allowed_keyword", value: "allowed_keyword" },
        { name: "blocked_keyword", value: "blocked_keyword" },
        { name: "allowed_bot", value: "allowed_bot" }
      )
  )
  .addStringOption(option =>
    option
      .setName("value")
      .setDescription("Keyword or bot ID")
      .setRequired(true)
  ),

  new SlashCommandBuilder()
  .setName("channel-filter-list")
  .setDescription("List channel-specific publish filters")
  .addStringOption(option =>
    option
      .setName("channel_id")
      .setDescription("Channel ID")
      .setRequired(true)
  ),
  
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

const deployGlobalCommands =
  String(process.env.DEPLOY_GLOBAL_COMMANDS || "").toLowerCase() === "true";

async function deployCommands() {
  console.log("Deploying Selective Auto Publisher slash commands...");
  console.log("Client ID:", clientId);
  console.log("Guild ID:", guildId || "(none)");
  console.log("Deploy global:", deployGlobalCommands);

  if (!token) {
    throw new Error("Missing BOT_TOKEN");
  }

  if (!clientId) {
    throw new Error("Missing CLIENT_ID");
  }

  if (!deployGlobalCommands && !guildId) {
    throw new Error(
      "Missing GUILD_ID for guild deploy. Set DEPLOY_GLOBAL_COMMANDS=true to deploy globally."
    );
  }

  const route = deployGlobalCommands
    ? Routes.applicationCommands(clientId)
    : Routes.applicationGuildCommands(clientId, guildId);

  console.log(
    deployGlobalCommands
      ? "Deploying Selective Auto Publisher commands globally."
      : `Deploying Selective Auto Publisher commands to guild ${guildId}.`
  );

  await rest.put(route, {
    body: commands,
  });

  console.log("Selective Auto Publisher slash commands deployed.");
}

deployCommands().catch((error) => {
  console.error("Failed to deploy Selective Auto Publisher slash commands:", error);
  process.exit(1);
});
