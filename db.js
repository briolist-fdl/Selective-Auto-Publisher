import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set. DB features will not work yet.");
}

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost")
        ? false
        : { rejectUnauthorized: false }
    })
  : null;

export async function testDbConnection() {
  if (!pool) {
    console.warn("Skipping DB connection test because DATABASE_URL is missing.");
    return false;
  }

  const client = await pool.connect();
  try {
    const result = await client.query("SELECT NOW() AS now");
    console.log("DB connected:", result.rows[0].now);
    return true;
  } finally {
    client.release();
  }
}

export async function initDb() {
  if (!pool) {
    console.warn("Skipping DB init because DATABASE_URL is missing.");
    return false;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      mode TEXT NOT NULL DEFAULT 'allowed_bots',
      audit_channel_id TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS allowed_channels (
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, channel_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS allowed_bots (
      guild_id TEXT NOT NULL,
      bot_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, bot_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS keywords_any (
      guild_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      PRIMARY KEY (guild_id, keyword)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocked_keywords (
      guild_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      PRIMARY KEY (guild_id, keyword)
    )
  `);

  console.log("DB schema initialized");
  return true;
}

export async function setGuildMode(guildId, mode) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      INSERT INTO guild_settings (guild_id, mode, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (guild_id)
      DO UPDATE SET mode = EXCLUDED.mode, updated_at = NOW()
    `,
    [guildId, mode]
  );
}

export async function getGuildMode(guildId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `
      SELECT mode
      FROM guild_settings
      WHERE guild_id = $1
      LIMIT 1
    `,
    [guildId]
  );

  return result.rows[0]?.mode ?? "allowed_bots";
}

export async function addAllowedChannel(guildId, channelId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      INSERT INTO allowed_channels (guild_id, channel_id)
      VALUES ($1, $2)
      ON CONFLICT (guild_id, channel_id) DO NOTHING
    `,
    [guildId, channelId]
  );
}

export async function removeAllowedChannel(guildId, channelId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      DELETE FROM allowed_channels
      WHERE guild_id = $1 AND channel_id = $2
    `,
    [guildId, channelId]
  );
}

export async function getAllowedChannels(guildId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `
      SELECT channel_id
      FROM allowed_channels
      WHERE guild_id = $1
      ORDER BY channel_id
    `,
    [guildId]
  );

  return result.rows.map((row) => row.channel_id);
}

export async function addAllowedBot(guildId, botId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      INSERT INTO allowed_bots (guild_id, bot_id)
      VALUES ($1, $2)
      ON CONFLICT (guild_id, bot_id) DO NOTHING
    `,
    [guildId, botId]
  );
}

export async function removeAllowedBot(guildId, botId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      DELETE FROM allowed_bots
      WHERE guild_id = $1 AND bot_id = $2
    `,
    [guildId, botId]
  );
}

export async function getAllowedBots(guildId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `
      SELECT bot_id
      FROM allowed_bots
      WHERE guild_id = $1
      ORDER BY bot_id
    `,
    [guildId]
  );

  return result.rows.map((row) => row.bot_id);
}

export async function addKeywordAny(guildId, keyword) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      INSERT INTO keywords_any (guild_id, keyword)
      VALUES ($1, $2)
      ON CONFLICT (guild_id, keyword) DO NOTHING
    `,
    [guildId, keyword]
  );
}

export async function removeKeywordAny(guildId, keyword) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      DELETE FROM keywords_any
      WHERE guild_id = $1 AND keyword = $2
    `,
    [guildId, keyword]
  );
}

export async function getKeywordsAny(guildId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `
      SELECT keyword
      FROM keywords_any
      WHERE guild_id = $1
      ORDER BY keyword
    `,
    [guildId]
  );

  return result.rows.map((row) => row.keyword);
}

export async function addBlockedKeyword(guildId, keyword) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      INSERT INTO blocked_keywords (guild_id, keyword)
      VALUES ($1, $2)
      ON CONFLICT (guild_id, keyword) DO NOTHING
    `,
    [guildId, keyword]
  );
}

export async function removeBlockedKeyword(guildId, keyword) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      DELETE FROM blocked_keywords
      WHERE guild_id = $1 AND keyword = $2
    `,
    [guildId, keyword]
  );
}

export async function getBlockedKeywords(guildId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `
      SELECT keyword
      FROM blocked_keywords
      WHERE guild_id = $1
      ORDER BY keyword
    `,
    [guildId]
  );

  return result.rows.map((row) => row.keyword);
}

export async function setAuditChannel(guildId, channelId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      INSERT INTO guild_settings (guild_id, audit_channel_id, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (guild_id)
      DO UPDATE SET audit_channel_id = EXCLUDED.audit_channel_id, updated_at = NOW()
    `,
    [guildId, channelId]
  );
}

export async function clearAuditChannel(guildId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(
    `
      UPDATE guild_settings
      SET audit_channel_id = NULL, updated_at = NOW()
      WHERE guild_id = $1
    `,
    [guildId]
  );
}

export async function getAuditChannel(guildId) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  const result = await pool.query(
    `
      SELECT audit_channel_id
      FROM guild_settings
      WHERE guild_id = $1
      LIMIT 1
    `,
    [guildId]
  );

  return result.rows[0]?.audit_channel_id ?? null;
}