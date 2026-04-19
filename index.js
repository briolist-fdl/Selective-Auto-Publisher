import fs from "node:fs";
import {
  Client,
  GatewayIntentBits,
  MessageFlags,
  PermissionsBitField
} from "discord.js";
import rawConfig from "./config.json" with { type: "json" };

const envToken = process.env.BOT_TOKEN;

const config = {
  ...rawConfig,
  token: envToken || rawConfig.token
};

console.log("Starting bot...");
console.log("BOT_TOKEN in env:", "BOT_TOKEN" in process.env);
console.log("BOT_TOKEN length:", envToken ? envToken.length : 0);
console.log("Token exists:", Boolean(config.token));
console.log("Client ID:", config.clientId);
console.log("Guild ID:", config.guildId);

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

const isAdmin = interaction.member.permissions.has('Administrator');

if (!isAdmin) {
  return interaction.reply({
    content: 'This command is restricted.',
    ephemeral: true
  });
}

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function normalize(text) {
  return (text ?? "").toLowerCase().trim();
}

function isAllowedChannel(message) {
  if (!config.allowedChannelIds.length) return false;
  return config.allowedChannelIds.includes(message.channelId);
}

function isAlreadyPublished(message) {
  return (
    message.flags?.has(MessageFlags.Crossposted) ||
    message.flags?.has(MessageFlags.IsCrosspost)
  );
}

function matchesMode(message) {
  const mode = config.filters.mode;

  if (mode === "all") return true;

  if (mode === "only_bots") {
    return message.author?.bot === true;
  }

  if (mode === "allowed_bots") {
    return (
      message.author?.bot === true &&
      config.filters.allowedBotIds.includes(message.author.id)
    );
  }

  return false;
}

function matchesKeywords(message) {
  const keywords = config.filters.keywordsAny ?? [];
  if (!keywords.length) return true;

  const embedText = message.embeds
    .map((embed) => {
      const fields =
        embed.fields?.map((f) => (f.name ?? "") + " " + (f.value ?? "")).join(" ") ?? "";
      return (embed.title ?? "") + " " + (embed.description ?? "") + " " + fields;
    })
    .join(" ");

  const fullText = normalize((message.content ?? "") + " " + embedText);

  return keywords.some((word) => fullText.includes(normalize(word)));
}

client.once("clientReady", () => {
  console.log("Logged in as " + client.user.tag);
});

client.on("messageCreate", async (message) => {
  try {
    if (!message.inGuild()) return;
    if (message.system) return;
    if (!isAllowedChannel(message)) return;
    if (isAlreadyPublished(message)) return;
    if (!matchesMode(message)) return;
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
      const channelsText = config.allowedChannelIds.length
        ? config.allowedChannelIds.map((id) => "<#" + id + ">").join(", ")
        : "None";

      const botsText = config.filters.allowedBotIds.length
        ? config.filters.allowedBotIds.join(", ")
        : "None";

      const keywordsText = config.filters.keywordsAny.length
        ? config.filters.keywordsAny.join(", ")
        : "None";

      await interaction.reply({
        content:
          "**Mode:** " +
          config.filters.mode +
          "\n**Allowed channels:** " +
          channelsText +
          "\n**Allowed bots:** " +
          botsText +
          "\n**Keywords:** " +
          keywordsText,
        ephemeral: true
      });
      return;
    }

    if (name === "mode") {
      config.filters.mode = interaction.options.getString("value", true);
      saveConfig();
      await interaction.reply({
        content: "Mode set to " + config.filters.mode + ".",
        ephemeral: true
      });
      return;
    }

    if (name === "bot-add") {
      const id = interaction.options.getString("id", true);
      if (!config.filters.allowedBotIds.includes(id)) {
        config.filters.allowedBotIds.push(id);
        saveConfig();
      }
      await interaction.reply({
        content: "Added bot ID " + id + ".",
        ephemeral: true
      });
      return;
    }

    if (name === "bot-remove") {
      const id = interaction.options.getString("id", true);
      config.filters.allowedBotIds = config.filters.allowedBotIds.filter(
        (botId) => botId !== id
      );
      saveConfig();
      await interaction.reply({
        content: "Removed bot ID " + id + ".",
        ephemeral: true
      });
      return;
    }

    if (name === "bot-list") {
      await interaction.reply({
        content: config.filters.allowedBotIds.length
          ? config.filters.allowedBotIds.join("\n")
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

    if (name === "channel-add") {
      const id = interaction.options.getString("id", true);
      if (!config.allowedChannelIds.includes(id)) {
        config.allowedChannelIds.push(id);
        saveConfig();
      }
      await interaction.reply({
        content: "Added channel ID " + id + ".",
        ephemeral: true
      });
      return;
    }

    if (name === "channel-remove") {
      const id = interaction.options.getString("id", true);
      config.allowedChannelIds = config.allowedChannelIds.filter(
        (channelId) => channelId !== id
      );
      saveConfig();
      await interaction.reply({
        content: "Removed channel ID " + id + ".",
        ephemeral: true
      });
      return;
    }

    if (name === "channel-list") {
      await interaction.reply({
        content: config.allowedChannelIds.length
          ? config.allowedChannelIds.map((id) => "<#" + id + ">").join("\n")
          : "No allowed channels set.",
        ephemeral: true
      });
      return;
    }
  } catch (error) {
    console.error("Interaction error:", error);
  }
});

client.on("error", (error) => {
  console.error("Client error:", error);
});

client.on("warn", (info) => {
  console.warn("Warning:", info);
});

client.login(config.token)
  .then(() => console.log("Login success"))
  .catch((err) => console.error("Login failed:", err));