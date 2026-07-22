# LK Backend v2 — PostgreSQL (Supabase) + Render

## اللي اتغير عن النسخة القديمة

- **قاعدة البيانات**: من SQLite (ملف `auth.db`) إلى PostgreSQL على Supabase، عبر مكتبة `pg`.
- **الحماية**:
  - `helmet` لضبط HTTP security headers.
  - `express-rate-limit`: limiter عام على `/api`، وlimiter أشد على `send-otp` (5 طلبات/10 دقايق) و`verify-otp` (10
    محاولات/10 دقايق) لمنع الإغراق والتخمين.
  - كود الـ OTP بقى بيتولد بـ `crypto.randomInt` بدل `Math.random` (أأمن لأي كود سري).
  - مدة صلاحية الـ OTP بقت 5 دقايق بدل 30 ثانية (30 ثانية كانت غير عملية للمستخدم الحقيقي).
  - الكود بيتمسح من الجدول بعد ما يتستخدم مرة واحدة (single-use).
  - مقارنة `x-admin-key` بقت بـ `timingSafeEqual` عشان تمنع timing attacks.
  - حجم الـ JSON body محدود بـ 50kb.
  - الكود مش بيتطبع في اللوج لو `NODE_ENV=production`.
- **تنظيف OTP التلقائي**: `node-cron` بيشغّل job كل 5 دقايق بيمسح أي OTP منتهي من الجدول (`otpCleanup.js`)، وبيتشغل مرة
  كمان لما السيرفر يشتغل.
- **CORS**: بدل `cors()` المفتوحة للكل، دلوقتي فيه whitelist من `ALLOWED_ORIGINS` في الـ env، وأي origin مش فيها بيترفض.

## خطوات الإعداد

### 1) Supabase

1. اعمل مشروع على supabase.com.
2. من **Project Settings → Database → Connection string → URI**، خد نسخة **Connection pooling** (بورت 6543) — دي الأنسب
   لـ Render.
3. حطها في `DATABASE_URL` في الـ `.env`.

الجداول بتتعمل تلقائي أول ما السيرفر يشتغل (`initSchema` في `db.js`) — مفيش داعي لأي migration يدوي.

### 2) متغيرات البيئة

انسخ `.env.example` لـ `.env` واملى القيم:

- `DATABASE_URL` من Supabase.
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` (App Password من Google، مش الباسورد العادي).
- `ADMIN_KEY`: قيمة عشوائية طويلة (فيه أمر جاهز في التعليق جوه الملف).
- `ALLOWED_ORIGINS`: الدومينات اللي هيكلم منها الفرونت اند بس، مفصولة بفاصلة.

### 3) النشر على Render

1. ادفع الكود على GitHub (تأكد إن `.env` مش متبعوت — موجود في `.gitignore`).
2. Render → New → Web Service → اختار الريبو.
3. Build command: `npm install`
4. Start command: `npm start`
5. في **Environment**، ضيف نفس المتغيرات اللي في `.env.example` بالقيم الحقيقية.
6. Health check path: `/health` (متوفر جاهز في السيرفر).

### 4) تشغيل محلي

```bash
npm install
cp .env.example .env   # واملى القيم
npm start
```

## ملاحظة مهمة

شلت `auth.db` بتاع SQLite من النسخة الجديدة خالص لأن كل حاجة بقت في Supabase. لو محتاج تنقل بيانات موجودة فيه فعلاً
(مستخدمين حاليين أو requests قديمة)، قولي وهساعدك تعمل script بسيط ينقلها لـ Postgres قبل ما تشيله نهائي.