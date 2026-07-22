require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

const { pool, initSchema } = require("./db");
const { startOtpCleanupJob } = require("./otpCleanup");
const corsOptions = require("./corsConfig");

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

// Render sits behind a reverse proxy — needed for correct client IPs
// (rate limiting, logging) instead of everything looking like one IP.
app.set("trust proxy", 1);

// --- Email transporter (Gmail) ---
const transporter = nodemailer.createTransport({
   service: "gmail",
   auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
   }
});

// --- Core middleware ---
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "50kb" })); // small cap — this API never needs large bodies

// --- Rate limiting ---
// General limiter for the whole API.
app.use(
   "/api",
   rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." }
   })
);

// Tighter limiter specifically for OTP requests — this is the endpoint
// most worth protecting against abuse (email spam / brute force).
const otpSendLimiter = rateLimit({
   windowMs: 10 * 60 * 1000,
   limit: 5,
   standardHeaders: true,
   legacyHeaders: false,
   message: { error: "Too many code requests. Please wait a few minutes and try again." }
});

const otpVerifyLimiter = rateLimit({
   windowMs: 10 * 60 * 1000,
   limit: 10,
   standardHeaders: true,
   legacyHeaders: false,
   message: { error: "Too many attempts. Please wait a few minutes and try again." }
});

// --- Helpers ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
   return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email);
}

function generateOtp() {
   // crypto.randomInt is a CSPRNG — safer than Math.random for anything
   // used as a secret code.
   return crypto.randomInt(100000, 1000000).toString();
}

function timingSafeEqual(a, b) {
   const bufA = Buffer.from(String(a));
   const bufB = Buffer.from(String(b));
   if (bufA.length !== bufB.length) return false;
   return crypto.timingSafeEqual(bufA, bufB);
}

function checkAdmin(req, res, next) {
   const key = req.headers["x-admin-key"];
   if (!key || !process.env.ADMIN_KEY || !timingSafeEqual(key, process.env.ADMIN_KEY)) {
      return res.status(401).json({ error: "Unauthorized" });
   }
   next();
}

// --- Routes ---

app.get("/health", (req, res) => res.json({ ok: true }));

// Step 1: send OTP to an email
app.post("/api/send-otp", otpSendLimiter, async (req, res) => {
   const email = (req.body?.email || "").trim().toLowerCase();

   if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
   }

   const code = generateOtp();
   const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes — 30s was unusable for real users

   try {
      await pool.query("INSERT INTO otps (email, code, expires_at) VALUES ($1, $2, $3)", [email, code, expiresAt]);

      if (!isProd) {
         console.log(`[OTP] ${email} -> ${code} (dev only, not logged in production)`);
      }

      await transporter.sendMail({
         from: `"BRAND" <${process.env.GMAIL_USER}>`,
         to: email,
         subject: "Your verification code",
         text: `Your verification code is: ${code}. It expires in 5 minutes.`,
         html: `<p>Your verification code is: <b>${code}</b></p><p>It expires in 5 minutes.</p>`
      });

      res.json({ success: true, message: "Code sent" });
   } catch (err) {
      console.error("send-otp failed:", err.message);
      res.status(500).json({ error: "Failed to send code" });
   }
});

// Step 2: verify OTP
app.post("/api/verify-otp", otpVerifyLimiter, async (req, res) => {
   const email = (req.body?.email || "").trim().toLowerCase();
   const code = (req.body?.code || "").trim();

   if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Email and a valid 6-digit code are required" });
   }

   try {
      const { rows } = await pool.query("SELECT * FROM otps WHERE email = $1 AND code = $2 ORDER BY id DESC LIMIT 1", [
         email,
         code
      ]);
      const row = rows[0];

      if (!row) {
         return res.status(400).json({ error: "Invalid code" });
      }

      if (Date.now() > Number(row.expires_at)) {
         return res.status(400).json({ error: "Code expired" });
      }

      await pool.query(
         `INSERT INTO users (email, verified) VALUES ($1, TRUE)
          ON CONFLICT (email) DO UPDATE SET verified = TRUE`,
         [email]
      );

      // Codes are single-use — remove it so it can't be replayed.
      await pool.query("DELETE FROM otps WHERE id = $1", [row.id]);

      res.json({ success: true, message: "Verified" });
   } catch (err) {
      console.error("verify-otp failed:", err.message);
      res.status(500).json({ error: "Server error" });
   }
});

// Save first/last name (from details.html)
app.post("/api/save-name", async (req, res) => {
   const email = (req.body?.email || "").trim().toLowerCase();
   const firstName = (req.body?.firstName || "").trim();
   const lastName = (req.body?.lastName || "").trim();

   if (!isValidEmail(email) || !firstName || !lastName || firstName.length > 100 || lastName.length > 100) {
      return res.status(400).json({ error: "Email, first name, and last name are required" });
   }

   try {
      await pool.query(
         `INSERT INTO users (email, first_name, last_name) VALUES ($1, $2, $3)
          ON CONFLICT (email) DO UPDATE SET first_name = $2, last_name = $3`,
         [email, firstName, lastName]
      );
      res.json({ success: true });
   } catch (err) {
      console.error("save-name failed:", err.message);
      res.status(500).json({ error: "Server error" });
   }
});

// --- Website requests ---

// Customer submits the "New Project" wizard form
app.post("/api/submit-request", async (req, res) => {
   const email = (req.body?.email || "").trim().toLowerCase();
   const name = (req.body?.name || "").trim();
   const projectType = (req.body?.projectType || "").trim();
   const projectName = (req.body?.projectName || "").trim() || null;
   const contact = (req.body?.contact || "").trim() || null;

   if (!isValidEmail(email) || !name || !projectType) {
      return res.status(400).json({ error: "Missing required fields" });
   }

   try {
      const { rows } = await pool.query(
         `INSERT INTO requests (email, name, project_type, project_name, contact)
          VALUES ($1, $2, $3, $4, $5) RETURNING id`,
         [email, name, projectType, projectName, contact]
      );

      try {
         await transporter.sendMail({
            from: `"BRAND" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER,
            subject: `New project request: ${projectType}`,
            html: `
               <p><b>Name:</b> ${name}</p>
               <p><b>Email:</b> ${email}</p>
               <p><b>Type:</b> ${projectType}</p>
               <p><b>Project:</b> ${projectName || "-"}</p>
               <p><b>Contact:</b> ${contact || "-"}</p>
            `
         });
      } catch (mailErr) {
         console.error("Notification email failed:", mailErr.message); // don't fail the request over this
      }

      res.json({ success: true, requestId: rows[0].id });
   } catch (err) {
      console.error("submit-request failed:", err.message);
      res.status(500).json({ error: "Failed to save request" });
   }
});

// Customer: view their own requests
app.get("/api/my-requests", async (req, res) => {
   const email = (req.query?.email || "").trim().toLowerCase();

   if (!isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email is required" });
   }

   try {
      const { rows } = await pool.query("SELECT * FROM requests WHERE email = $1 ORDER BY id DESC", [email]);
      res.json({ requests: rows });
   } catch (err) {
      console.error("my-requests failed:", err.message);
      res.status(500).json({ error: "Server error" });
   }
});

// Customer: cancel their own request (only if still pending)
app.patch("/api/my-requests/:id/cancel", async (req, res) => {
   const id = Number(req.params.id);
   const email = (req.body?.email || "").trim().toLowerCase();

   if (!Number.isInteger(id) || !isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid request" });
   }

   try {
      const { rows } = await pool.query("SELECT * FROM requests WHERE id = $1 AND email = $2", [id, email]);
      const row = rows[0];

      if (!row) return res.status(404).json({ error: "Request not found" });
      if (row.status !== "pending") {
         return res.status(400).json({ error: "Only pending requests can be cancelled" });
      }

      await pool.query("UPDATE requests SET status = 'cancelled' WHERE id = $1", [id]);
      res.json({ success: true });
   } catch (err) {
      console.error("cancel-request failed:", err.message);
      res.status(500).json({ error: "Server error" });
   }
});

// --- Admin (you) ---

app.get("/api/admin/requests", checkAdmin, async (req, res) => {
   try {
      const { rows } = await pool.query("SELECT * FROM requests ORDER BY id DESC");
      res.json({ requests: rows });
   } catch (err) {
      console.error("admin/requests failed:", err.message);
      res.status(500).json({ error: "Server error" });
   }
});

app.get("/api/admin/requests/:id", checkAdmin, async (req, res) => {
   const id = Number(req.params.id);
   if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

   try {
      const { rows } = await pool.query("SELECT * FROM requests WHERE id = $1", [id]);
      if (!rows[0]) return res.status(404).json({ error: "Not found" });
      res.json({ request: rows[0] });
   } catch (err) {
      console.error("admin/requests/:id failed:", err.message);
      res.status(500).json({ error: "Server error" });
   }
});

app.patch("/api/admin/requests/:id/status", checkAdmin, async (req, res) => {
   const id = Number(req.params.id);
   const { status } = req.body || {};
   const validStatuses = ["pending", "in_progress", "completed", "cancelled"];

   if (!Number.isInteger(id) || !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
   }

   try {
      await pool.query("UPDATE requests SET status = $1 WHERE id = $2", [status, id]);
      res.json({ success: true });
   } catch (err) {
      console.error("admin/status failed:", err.message);
      res.status(500).json({ error: "Server error" });
   }
});

// --- Fallback error handler (e.g. CORS rejection) ---
app.use((err, req, res, next) => {
   if (err && err.message === "Not allowed by CORS") {
      return res.status(403).json({ error: "Origin not allowed" });
   }
   console.error("Unhandled error:", err);
   res.status(500).json({ error: "Server error" });
});

// --- Boot ---
async function start() {
   await initSchema();
   startOtpCleanupJob();
   app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
   });
}

start().catch((err) => {
   console.error("Failed to start server:", err);
   process.exit(1);
});