// ALLOWED_ORIGINS is a comma-separated list in .env, e.g.:
// ALLOWED_ORIGINS=https://e1awadi.com,https://www.e1awadi.com,https://<user>.github.io
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
   .split(",")
   .map((o) => o.trim())
   .filter(Boolean);

if (allowedOrigins.length === 0) {
   console.warn(
      "[cors] WARNING: ALLOWED_ORIGINS is empty — no browser origin will be allowed. Set it in your .env / Render environment variables."
   );
}

const corsOptions = {
   origin(origin, callback) {
      // Allow non-browser tools (curl, Postman, server-to-server) which send no Origin header.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
         return callback(null, true);
      }

      console.warn(`[cors] Blocked request from origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
   },
   methods: ["GET", "POST", "PATCH"],
   allowedHeaders: ["Content-Type", "x-admin-key"],
   credentials: false,
   maxAge: 86400 // cache preflight for a day
};

module.exports = corsOptions;