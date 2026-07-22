const cron = require("node-cron");
const { pool } = require("./db");

async function cleanExpiredOtps() {
   try {
      const result = await pool.query("DELETE FROM otps WHERE expires_at < $1", [Date.now()]);
      if (result.rowCount > 0) {
         console.log(`[otp-cleanup] Removed ${result.rowCount} expired OTP(s)`);
      }
   } catch (err) {
      console.error("[otp-cleanup] Failed:", err.message);
   }
}

function startOtpCleanupJob() {
   // Run once on boot so stale rows don't sit around until the first tick.
   cleanExpiredOtps();

   // Every 5 minutes.
   cron.schedule("*/5 * * * *", cleanExpiredOtps);
   console.log("[otp-cleanup] Scheduled job started (every 5 min)");
}

module.exports = { startOtpCleanupJob, cleanExpiredOtps };