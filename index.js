import {
  Client,
  GatewayIntentBits,
  MessageFlags,
  PermissionsBitField
} from "discord.js";
import {
  pool,
  testDbConnection,
  initDb,
  setGuildMode,
  getGuildMode,
  addAllowedChannel,
  removeAllowedChannel,
  getAllowedChannels,
  addAllowedBot,
  removeAllowedBot,
  getAllowedBots,
  addKeywordAny,
  removeKeywordAny,
  getKeywordsAny,
  addBlockedKeyword,
  removeBlockedKeyword,
  getBlockedKeywords,
  setAuditChannel,
  clearAuditChannel,
  getAuditChannel,
  addChannelPublishFilter,
  removeChannelPublishFilter,
  getChannelPublishFilters
} from "./db.js";
import { maybeAddSupportMessage } from "./src/shared/supportDevelopment.js";

const envToken = process.env.BOT_TOKEN;

const token = process.env.BOT_TOKEN;

console.log("Starting bot...");
console.log("BOT_TOKEN in env:", Boolean(process.env.BOT_TOKEN));
console.log("BOT_TOKEN length:", token ? token.length : 0);
console.log("Token exists:", Boolean(token));
console.log("Client ID:", process.env.CLIENT_ID);
console.log("Guild ID:", process.env.GUILD_ID);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function normalize(text) {
  return (text ?? "").toLowerCase().trim();
}

async function replySuccess(interaction, content) {
  const contentWithSupport = maybeAddSupportMessage(content);

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      content: contentWithSupport,
    });
    return;
  }

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: contentWithSupport,
  });
}

function buildSearchableContent(message) {
  const parts = [];

  if (message?.content) {
    parts.push(message.content);
  }

  if (Array.isArray(message?.embeds)) {
    for (const embed of message.embeds) {
      if (!embed) continue;

      if (embed.title) parts.push(embed.title);
      if (embed.description) parts.push(embed.description);

      if (Array.isArray(embed.fields)) {
        for (const field of embed.fields) {
          if (!field) continue;
          if (field.name) parts.push(field.name);
          if (field.value) parts.push(field.value);
        }
      }
    }
  }

  return normalize(parts.join(" "));
}

function getCheckedContentTypes(message) {
  const types = [];

  if (message?.content) {
    types.push("message.content");
  }

  if (Array.isArray(message?.embeds) && message.embeds.length > 0) {
    types.push("embeds[].title");
    types.push("embeds[].description");

    const hasFields = message.embeds.some(
      (embed) => Array.isArray(embed?.fields) && embed.fields.length > 0
    );

    if (hasFields) {
      types.push("embeds[].fields");
    }
  }

  return types;
}

function getSearchablePreview(message, maxLength = 100) {
  const combined = buildSearchableContent(message);

  if (!combined) return "(empty)";

  return combined.length > maxLength
    ? combined.slice(0, maxLength) + "..."
    : combined;
}

async function isAllowedChannel(message) {
  const allowedChannels = await getAllowedChannels(message.guildId);

  if (!allowedChannels.length) return false;

  return allowedChannels.includes(message.channelId);
}

function isAlreadyPublished(message) {
  return (
    message.flags?.has(MessageFlags.Crossposted) ||
    message.flags?.has(MessageFlags.IsCrosspost)
  );
}

async function matchesMode(message) {
  const guildId = message.guild.id;
  const channelId = message.channelId;

  const channelFilters = await getChannelPublishFilters(guildId, channelId);

  const channelAllowedBots = channelFilters
    .filter((filter) => filter.filter_type === "allowed_bot")
    .map((filter) => filter.value);

  if (channelAllowedBots.length > 0) {
    if (!message.author.bot) return false;
    return channelAllowedBots.includes(message.author.id);
  }

  const mode = await getGuildMode(guildId);

  if (mode === "all") return true;

  if (mode === "only_bots") {
    return message.author.bot === true;
  }

  if (mode === "allowed_bots") {
    if (!message.author.bot) return false;

    const allowedBots = await getAllowedBots(guildId);
    return allowedBots.includes(message.author.id);
  }

  return false;
}

async function matchesKeywords(message) {
  const content = buildSearchableContent(message);
  const guildId = message.guild.id;
  const channelId = message.channelId;

  const channelFilters = await getChannelPublishFilters(guildId, channelId);

  const channelBlocked = channelFilters
    .filter((filter) => filter.filter_type === "blocked_keyword")
    .map((filter) => normalize(filter.value));

  if (channelBlocked.some((keyword) => keyword && content.includes(keyword))) {
    return false;
  }

  const channelAllowed = channelFilters
    .filter((filter) => filter.filter_type === "allowed_keyword")
    .map((filter) => normalize(filter.value));

  if (channelAllowed.length > 0) {
    return channelAllowed.some(
      (keyword) => keyword && content.includes(keyword)
    );
  }

  const hasAnyChannelFilter = channelFilters.length > 0;

  if (hasAnyChannelFilter) {
    return true;
  }

  const globalBlocked = (await getBlockedKeywords(guildId)).map(normalize);

  if (globalBlocked.some((keyword) => keyword && content.includes(keyword))) {
    return false;
  }

  const globalAllowed = (await getKeywordsAny(guildId)).map(normalize);

  if (!globalAllowed.length) return true;

  return globalAllowed.some(
    (keyword) => keyword && content.includes(keyword)
  );
}

async function sendAuditLog(message, result, reason) {
  const guildId = message.guild.id;

  const settings = await pool.query(
    `
      SELECT audit_channel_id
      FROM guild_settings
      WHERE guild_id = $1
      LIMIT 1
    `,
    [guildId]
  );

  const auditChannelId = settings.rows[0]?.audit_channel_id;

  if (!auditChannelId) return;

  const channel = await client.channels.fetch(auditChannelId).catch(() => null);
  if (!channel) return;

  const checkedContentTypes = getCheckedContentTypes(message);
  const searchablePreview = getSearchablePreview(message, 100);
  const embedCount = Array.isArray(message?.embeds) ? message.embeds.length : 0;

  await channel.send(
  `**${result.toUpperCase()}**\n` +
  `Author: ${message.author.tag} (${message.author.bot ? "bot" : "user"})\n` +
  `Channel: <#${message.channelId}>\n` +
  `Message ID: ${message.id}\n` +
  `Reason: ${reason}\n` +
  `Embed count: ${embedCount}\n` +
  `Content types checked: ${checkedContentTypes.length ? checkedContentTypes.join(", ") : "(none)"}\n` +
  `Search preview: ${searchablePreview}`
);
}

client.on("messageCreate", async (message) => {
  try {
    if (!message.inGuild()) return;
    if (message.author.id === client.user.id) return;
    if (message.system) return;

    console.log("MESSAGE DEBUG", {
      channelId: message.channelId,
      authorTag: message.author?.tag,
      authorId: message.author?.id,
      authorBot: message.author?.bot,
      webhookId: message.webhookId,
      type: message.type,
      content: message.content
    });
    if (!(await isAllowedChannel(message))) {
  await sendAuditLog(message, "skipped", "channel not allowed");
  return;
}
    if (isAlreadyPublished(message)) {
  await sendAuditLog(message, "skipped", "already published");
  return;
}
    if (!(await matchesMode(message))) {
  await sendAuditLog(message, "skipped", "mode mismatch");
  return;
}
    if (!(await matchesKeywords(message))) {
  await sendAuditLog(message, "skipped", "keyword mismatch");
  return;
}

    console.log("MATCHED:", message.author.tag, message.content);
    
    await message.crosspost();

await sendAuditLog(message, "published", "passed all filters");

console.log(
  "Published message " +
    message.id +
    " from " +
    message.author.tag +
    " in " +
    message.channelId
);
  } catch (error) {
  await sendAuditLog(
    message,
    "failed",
    error instanceof Error ? error.message : String(error)
  );

  console.error("Failed to publish message " + message.id + ":", error);
}
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    const adminOnly = interaction.memberPermissions?.has(
      PermissionsBitField.Flags.ManageGuild
    );

    if (!adminOnly) {
      await interaction.reply({
        content: "You need Manage Server to use this.",
        ephemeral: true
      });
      return;
    }

    const name = interaction.commandName;

   if (name === "status") {
  const mode = await getGuildMode(interaction.guildId);
  const allowedChannels = await getAllowedChannels(interaction.guildId);
  const allowedBots = await getAllowedBots(interaction.guildId);
  const keywordsAny = await getKeywordsAny(interaction.guildId);
  const blockedKeywords = await getBlockedKeywords(interaction.guildId);
  const auditChannelId = await getAuditChannel(interaction.guildId);

  const channelsText = allowedChannels.length
    ? allowedChannels.map((id) => "<#" + id + ">").join(", ")
    : "None";

  const botsText = allowedBots.length
    ? allowedBots.join(", ")
    : "None";

  const keywordsText = keywordsAny.length
    ? keywordsAny.join(", ")
    : "None";

  const blockedKeywordsText = blockedKeywords.length
    ? blockedKeywords.join(", ")
    : "None";

  const auditText = auditChannelId
    ? "<#" + auditChannelId + ">"
    : "None";

  const channelFilterSections = [];

  for (const channelId of allowedChannels) {
    const filters = await getChannelPublishFilters(interaction.guildId, channelId);

    if (!filters.length) {
      channelFilterSections.push(
        "<#" + channelId + ">:\n" +
        "- No channel-specific filters set. Uses legacy/global fallback."
      );
      continue;
    }

    const allowedBotFilters = filters
      .filter((filter) => filter.filter_type === "allowed_bot")
      .map((filter) => filter.value);

    const allowedKeywordFilters = filters
      .filter((filter) => filter.filter_type === "allowed_keyword")
      .map((filter) => filter.value);

    const blockedKeywordFilters = filters
      .filter((filter) => filter.filter_type === "blocked_keyword")
      .map((filter) => filter.value);

    channelFilterSections.push(
      "<#" + channelId + ">:\n" +
      "- Allowed bots: " +
      (allowedBotFilters.length ? allowedBotFilters.join(", ") : "Any/global fallback") +
      "\n- Allowed keywords: " +
      (allowedKeywordFilters.length ? allowedKeywordFilters.join(", ") : "None required") +
      "\n- Blocked keywords: " +
      (blockedKeywordFilters.length ? blockedKeywordFilters.join(", ") : "None")
    );
  }

  const channelFiltersText = channelFilterSections.length
    ? channelFilterSections.join("\n\n")
    : "No allowed channels set.";

  await interaction.reply({
    content:
      "**Auto Publisher Status**\n\n" +
      "**Mode:** " + mode + "\n" +
      "**Audit channel:** " + auditText + "\n\n" +

      "**Allowed channels:**\n" +
      channelsText + "\n\n" +

      "**Channel-specific filters:**\n" +
      channelFiltersText + "\n\n" +

      "**Legacy/global fallback:**\n" +
      "- Allowed bots: " + botsText + "\n" +
      "- Allowed keywords: " + keywordsText + "\n" +
      "- Blocked keywords: " + blockedKeywordsText,
    ephemeral: true
  });
  return;
}

    if (name === "mode") {
      const value = interaction.options.getString("value", true);

      await setGuildMode(interaction.guildId, value);

      await replySuccess(interaction, "Mode set to " + value + " (saved to DB).");
      return;
    }

    if (name === "bot-add") {
      const id = interaction.options.getString("id", true);

      await addAllowedBot(interaction.guildId, id);

      await replySuccess(interaction, "Added bot ID " + id + " (saved to DB).");
      return;
    }

    if (name === "bot-remove") {
      const id = interaction.options.getString("id", true);

      await removeAllowedBot(interaction.guildId, id);

      await replySuccess(interaction, "Removed bot ID " + id + " (removed from DB).");
      return;
    }

    if (name === "bot-list") {
      const botIds = await getAllowedBots(interaction.guildId);

      await interaction.reply({
        content: botIds.length
          ? botIds.join("\n")
          : "No allowed bot IDs set.",
        ephemeral: true
      });
      return;
    }

    if (name === "keyword-add") {
  const word = normalize(interaction.options.getString("word", true));

  await addKeywordAny(interaction.guildId, word);

  await replySuccess(interaction, "Added keyword " + word + " (saved to DB).");
  return;
}

    if (name === "keyword-remove") {
  const word = normalize(interaction.options.getString("word", true));

  await removeKeywordAny(interaction.guildId, word);

  await replySuccess(interaction, "Removed keyword " + word + " (removed from DB).");
  return;
}

    if (name === "keyword-list") {
  const keywordsAny = await getKeywordsAny(interaction.guildId);

  await interaction.reply({
    content: keywordsAny.length
      ? keywordsAny.join("\n")
      : "No keywords set.",
    ephemeral: true
  });
  return;
}

    if (name === "blockedkeyword-add") {
  const word = normalize(interaction.options.getString("word", true));

  await addBlockedKeyword(interaction.guildId, word);

  await replySuccess(interaction, "Added blocked keyword " + word + " (saved to DB).");
  return;
}

    if (name === "blockedkeyword-remove") {
  const word = normalize(interaction.options.getString("word", true));

  await removeBlockedKeyword(interaction.guildId, word);

  await replySuccess(interaction, "Removed blocked keyword " + word + " (removed from DB).");
  return;
}

    if (name === "blockedkeyword-list") {
  const blockedKeywords = await getBlockedKeywords(interaction.guildId);

  await interaction.reply({
    content: blockedKeywords.length
      ? blockedKeywords.join("\n")
      : "No blocked keywords set.",
    ephemeral: true
  });
  return;
}

   if (name === "channel-filter-add") {
  const channelId = interaction.options.getString("channel_id", true);

  const allowedBot = interaction.options.getString("allowed_bot");
  const allowedKeyword = interaction.options.getString("allowed_keyword");
  const blockedKeyword = interaction.options.getString("blocked_keyword");

  const added = [];

  if (allowedBot) {
    const value = allowedBot.trim();
    await addChannelPublishFilter(interaction.guildId, channelId, "allowed_bot", value);
    added.push("`allowed_bot`: `" + value + "`");
  }

  if (allowedKeyword) {
    const value = normalize(allowedKeyword);
    await addChannelPublishFilter(interaction.guildId, channelId, "allowed_keyword", value);
    added.push("`allowed_keyword`: `" + value + "`");
  }

  if (blockedKeyword) {
    const value = normalize(blockedKeyword);
    await addChannelPublishFilter(interaction.guildId, channelId, "blocked_keyword", value);
    added.push("`blocked_keyword`: `" + value + "`");
  }

  if (!added.length) {
    await interaction.reply({
      content: "Please provide at least one filter: allowed_bot, allowed_keyword, or blocked_keyword.",
      ephemeral: true
    });
    return;
  }

  await replySuccess(
    interaction,
    "Added channel filter(s) for <#" + channelId + ">:\n" +
      added.join("\n")
  );
  return;
}

if (name === "channel-filter-remove") {
  const channelId = interaction.options.getString("channel_id", true);
  const type = interaction.options.getString("type", true);
  const valueRaw = interaction.options.getString("value", true);
  const value = type === "allowed_bot" ? valueRaw.trim() : normalize(valueRaw);

  await removeChannelPublishFilter(interaction.guildId, channelId, type, value);

  await replySuccess(
    interaction,
    "Removed channel filter:\n" +
      "Channel: <#" + channelId + ">\n" +
      "Type: `" + type + "`\n" +
      "Value: `" + value + "`"
  );
  return;
}

if (name === "channel-filter-list") {
  const channelId = interaction.options.getString("channel_id", true);
  const filters = await getChannelPublishFilters(interaction.guildId, channelId);

  const text = filters.length
    ? filters
        .map((filter) => "`" + filter.filter_type + "`: `" + filter.value + "`")
        .join("\n")
    : "No channel-specific filters set.";

  await interaction.reply({
    content: "Filters for <#" + channelId + ">:\n" + text,
    ephemeral: true
  });
  return;
}

    if (name === "channel-add") {
      const id = interaction.options.getString("id", true);

      await addAllowedChannel(interaction.guildId, id);

      await replySuccess(interaction, "Added channel ID " + id + " (saved to DB).");
      return;
    }

    if (name === "channel-remove") {
      const id = interaction.options.getString("id", true);

      await removeAllowedChannel(interaction.guildId, id);

      await replySuccess(interaction, "Removed channel ID " + id + " (removed from DB).");
      return;
    }

    if (name === "channel-list") {
      const allowedChannels = await getAllowedChannels(interaction.guildId);

      await interaction.reply({
        content: allowedChannels.length
          ? allowedChannels.map((id) => "<#" + id + ">").join("\n")
          : "No allowed channels set.",
        ephemeral: true
      });
      return;
    }

    if (name === "audit-channel-set") {
  const id = interaction.options.getString("id", true);

  await setAuditChannel(interaction.guildId, id);

  await replySuccess(interaction, "Audit channel set to <#" + id + ">.");
  return;
}

if (name === "audit-channel-clear") {
  await clearAuditChannel(interaction.guildId);

  await replySuccess(interaction, "Audit channel cleared.");
  return;
}

if (name === "audit-channel-show") {
  const auditChannelId = await getAuditChannel(interaction.guildId);

  await interaction.reply({
    content: auditChannelId
      ? "Audit channel: <#" + auditChannelId + ">"
      : "No audit channel set.",
    ephemeral: true
  });
  return;
}

  } catch (error) {
    console.error("Interaction error:", error);
  }
});

try {
  console.log("Running DB startup...");
  await testDbConnection();
  console.log("Running initDb...");
  await initDb();
  console.log("Finished initDb");
} catch (error) {
  console.error("Database startup failed:", error);
}

client.login(token)
  .then(() => console.log("Login success"))
  .catch((err) => console.error("Login failed:", err));
  