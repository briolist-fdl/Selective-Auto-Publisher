import fs from "node:fs";
import {
  Client,
  GatewayIntentBits,
  MessageFlags,
  PermissionsBitField
} from "discord.js";
import rawConfig from "./config.json" with { type: "json" };
import {
  testDbConnection,
  initDb,
  setGuildMode,
  getGuildMode,
  addAllowedChannel,
  removeAllowedChannel,
  getAllowedChannels,
  addAllowedBot,
  removeAllowedBot,
  getAllowedBots
} from "./db.js";

const envToken = process.env.BOT_TOKEN;

const config = {
  ...rawConfig,
  token: envToken || rawConfig.token
};

const CONFIG_PATH = "./config.json";

console.log("Starting bot...");
console.log("BOT_TOKEN in env:", "BOT_TOKEN" in process.env);
console.log("BOT_TOKEN length:", envToken ? envToken.length : 0);
console.log("Token exists:", Boolean(config.token));
console.log("Client ID:", config.clientId);
console.log("Guild ID:", config.guildId);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

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

function matchesKeywords(message) {
  const content = normalize(message.content);

  const blocked = (config.filters?.blockedKeywords ?? []).map(normalize);
  if (blocked.some((keyword) => keyword && content.includes(keyword))) {
    return false;
  }

  const keywords = (config.filters?.keywordsAny ?? []).map(normalize);
  if (!keywords.length) return true;

  return keywords.some((keyword) => keyword && content.includes(keyword));
}

client.once("clientReady", () => {
  console.log("Logged in as " + client.user.tag);
});

client.on("messageCreate", async (message) => {
  try {
    if (!message.inGuild()) return;
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
    if (!(await isAllowedChannel(message))) return;
    if (isAlreadyPublished(message)) return;
    if (!(await matchesMode(message))) return;
    if (!matchesKeywords(message)) return;

    console.log("MATCHED:", message.author.tag, message.content);
    
    await message.crosspost();
    console.log(
      "Published message " +
        message.id +
        " from " +
        message.author.tag +
        " in " +
        message.channelId
    );
  } catch (error) {
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

      const keywordsText = (config.filters?.keywordsAny ?? []).length
        ? config.filters.keywordsAny.join(", ")
        : "None";

      const blockedKeywordsText = (config.filters?.blockedKeywords ?? []).length
        ? config.filters.blockedKeywords.join(", ")
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
      const word = interaction.options.getString("word", true).trim();
      if (!config.filters.keywordsAny.includes(word)) {
        config.filters.keywordsAny.push(word);
        saveConfig();
      }
      await interaction.reply({
        content: "Added keyword " + word + ".",
        ephemeral: true
      });
      return;
    }

    if (name === "keyword-remove") {
      const word = interaction.options.getString("word", true).trim();
      config.filters.keywordsAny = config.filters.keywordsAny.filter(
        (keyword) => keyword !== word
      );
      saveConfig();
      await interaction.reply({
        content: "Removed keyword " + word + ".",
        ephemeral: true
      });
      return;
    }

    if (name === "keyword-list") {
      await interaction.reply({
        content: config.filters.keywordsAny.length
          ? config.filters.keywordsAny.join("\n")
          : "No keywords set.",
        ephemeral: true
      });
      return;
    }

    if (name === "blockedkeyword-add") {
      const word = interaction.options.getString("word", true).trim().toLowerCase();
      config.filters.blockedKeywords ??= [];

      if (!config.filters.blockedKeywords.includes(word)) {
        config.filters.blockedKeywords.push(word);
        saveConfig();
      }

      await interaction.reply({
        content: "Added blocked keyword " + word + ".",
        ephemeral: true
      });
      return;
    }

    if (name === "blockedkeyword-remove") {
      const word = interaction.options.getString("word", true).trim().toLowerCase();
      config.filters.blockedKeywords ??= [];

      config.filters.blockedKeywords = config.filters.blockedKeywords.filter(
        (keyword) => keyword !== word
      );
      saveConfig();

      await interaction.reply({
        content: "Removed blocked keyword " + word + ".",
        ephemeral: true
      });
      return;
    }

    if (name === "blockedkeyword-list") {
      config.filters.blockedKeywords ??= [];

      await interaction.reply({
        content: config.filters.blockedKeywords.length
          ? config.filters.blockedKeywords.join("\n")
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

client.login(config.token)
  .then(() => console.log("Login success"))
  .catch((err) => console.error("Login failed:", err));