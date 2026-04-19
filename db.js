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