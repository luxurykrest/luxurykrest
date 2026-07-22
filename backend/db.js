const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
   console.error(
      "FATAL: DATABASE_URL is not set. Copy the connection string from your Supabase project (Settings → Database → Connection string → URI, use the 'Connection pooling' one for Render)."
   );
   process.exit(1);
}

// Supabase requires SSL. Render's outbound connections are fine with
// rejectUnauthorized: false since Supabase uses a managed cert chain
// that isn't always in Node's default trust store.
const pool = new Pool({
   connectionString: process.env.DATABASE_URL,
   ssl: { rejectUnauthorized: false },
   max: 10,
   idleTimeoutMillis: 30000
});

pool.on("error", (err) => {
   console.error("Unexpected error on idle Postgres client:", err);
});

async function initSchema() {
   await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
         id SERIAL PRIMARY KEY,
         email TEXT UNIQUE NOT NULL,
         first_name TEXT,
         last_name TEXT,
         verified BOOLEAN DEFAULT FALSE,
         created_at TIMESTAMPTZ DEFAULT NOW()
      );
   `);

   await pool.query(`
      CREATE TABLE IF NOT EXISTS otps (
         id SERIAL PRIMARY KEY,
         email TEXT NOT NULL,
         code TEXT NOT NULL,
         expires_at BIGINT NOT NULL,
         created_at TIMESTAMPTZ DEFAULT NOW()
      );
   `);

   // Speeds up the cleanup job's DELETE ... WHERE expires_at < ... and
   // the lookup in verify-otp.
   await pool.query(`CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps (expires_at);`);
   await pool.query(`CREATE INDEX IF NOT EXISTS idx_otps_email ON otps (email);`);

   await pool.query(`
      CREATE TABLE IF NOT EXISTS requests (
         id SERIAL PRIMARY KEY,
         email TEXT NOT NULL,
         name TEXT NOT NULL,
         project_type TEXT NOT NULL,
         project_name TEXT,
         contact TEXT,
         status TEXT DEFAULT 'pending',
         created_at TIMESTAMPTZ DEFAULT NOW()
      );
   `);

   await pool.query(`CREATE INDEX IF NOT EXISTS idx_requests_email ON requests (email);`);

   console.log("[db] Schema ready");
}

module.exports = { pool, initSchema };