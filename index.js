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
  getAuditChannel
} from "./db.js";

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
  const content = normalize(message.content);
  const guildId = message.guild.id;

  const blocked = (await getBlockedKeywords(guildId)).map(normalize);
  if (blocked.some((keyword) => keyword && content.includes(keyword))) {
    return false;
  }

  const keywords = (await getKeywordsAny(guildId)).map(normalize);
  if (!keywords.length) return true;

  return keywords.some((keyword) => keyword && content.includes(keyword));
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

  const contentPreview = (message.content ?? "").slice(0, 200) || "(no content)";

  await channel.send(
    `**${result.toUpperCase()}**\n` +
    `Author: ${message.author.tag} (${message.author.bot ? "bot" : "user"})\n` +
    `Channel: <#${message.channelId}>\n` +
    `Message ID: ${message.id}\n` +
    `Reason: ${reason}\n` +
    `Content: ${contentPreview}`
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

      const channelsText = allowedChannels.length
        ? allowedChannels.map((id) => "<#" + id + ">").join(", ")
        : "None";

      const botsText = allowedBots.length
        ? allowedBots.join(", ")
        : "None";

      const keywordsAny = await getKeywordsAny(interaction.guildId);
const blockedKeywords = await getBlockedKeywords(interaction.guildId);

const keywordsText = keywordsAny.length
  ? keywordsAny.join(", ")
  : "None";

const blockedKeywordsText = blockedKeywords.length
  ? blockedKeywords.join(", ")
  : "None";

      await interaction.reply({
        content:
          "**Mode:** " +
          mode +
          "\n**Allowed channels:** " +
          channelsText +
          "\n**Allowed bots:** " +
          botsText +
          "\n**Keywords:** " +
          keywordsText +
          "\n**Blocked keywords:** " +
          blockedKeywordsText,
        ephemeral: true
      });
      return;
    }

    if (name === "mode") {
      const value = interaction.options.getString("value", true);

      await setGuildMode(interaction.guildId, value);

      await interaction.reply({
        content: "Mode set to " + value + " (saved to DB).",
        ephemeral: true
      });
      return;
    }

    if (name === "bot-add") {
      const id = interaction.options.getString("id", true);

      await addAllowedBot(interaction.guildId, id);

      await interaction.reply({
        content: "Added bot ID " + id + " (saved to DB).",
        ephemeral: true
      });
      return;
    }

    if (name === "bot-remove") {
      const id = interaction.options.getString("id", true);

      await removeAllowedBot(interaction.guildId, id);

      await interaction.reply({
        content: "Removed bot ID " + id + " (removed from DB).",
        ephemeral: true
      });
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

  await interaction.reply({
    content: "Added keyword " + word + " (saved to DB).",
    ephemeral: true
  });
  return;
}

    if (name === "keyword-remove") {
  const word = normalize(interaction.options.getString("word", true));

  await removeKeywordAny(interaction.guildId, word);

  await interaction.reply({
    content: "Removed keyword " + word + " (removed from DB).",
    ephemeral: true
  });
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

  await interaction.reply({
    content: "Added blocked keyword " + word + " (saved to DB).",
    ephemeral: true
  });
  return;
}

    if (name === "blockedkeyword-remove") {
  const word = normalize(interaction.options.getString("word", true));

  await removeBlockedKeyword(interaction.guildId, word);

  await interaction.reply({
    content: "Removed blocked keyword " + word + " (removed from DB).",
    ephemeral: true
  });
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

    if (name === "channel-add") {
      const id = interaction.options.getString("id", true);

      await addAllowedChannel(interaction.guildId, id);

      await interaction.reply({
        content: "Added channel ID " + id + " (saved to DB).",
        ephemeral: true
      });
      return;
    }

    if (name === "channel-remove") {
      const id = interaction.options.getString("id", true);

      await removeAllowedChannel(interaction.guildId, id);

      await interaction.reply({
        content: "Removed channel ID " + id + " (removed from DB).",
        ephemeral: true
      });
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

  await interaction.reply({
    content: "Audit channel set to <#" + id + ">.",
    ephemeral: true
  });
  return;
}

if (name === "audit-channel-clear") {
  await clearAuditChannel(interaction.guildId);

  await interaction.reply({
    content: "Audit channel cleared.",
    ephemeral: true
  });
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