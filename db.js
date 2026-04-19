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