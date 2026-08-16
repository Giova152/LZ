const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const TEMP_UPLOAD_DIR = path.join(__dirname, 'tmp_uploads');

/* Supabase client */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

/* Ensure dirs */
for (const dir of [PUBLIC_DIR, UPLOAD_DIR, TEMP_UPLOAD_DIR]) {
  require('fs').mkdirSync(dir, { recursive: true });
}

/* ---------- SHA256 ---------- */
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

/* ---------- Session tokens (in Supabase sessions table) ---------- */
async function issueToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('sessions').insert({ token, expires_at: expiresAt });
  if (error) throw new Error(error.message);
  return token;
}

async function validateToken(token) {
  const { data, error } = await supabase.from('sessions').select('expires_at').eq('token', token).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return false;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await supabase.from('sessions').delete().eq('token', token);
    return false;
  }
  return true;
}

async function deleteToken(token) {
  await supabase.from('sessions').delete().eq('token', token);
}

/* ---------- Admin ---------- */
async function getAdmin() {
  const { data, error } = await supabase.from('admin').select('username, password_hash, salt').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Admin non configuré');
  return { username: data.username, passwordHash: data.password_hash, salt: data.salt };
}

async function updateAdmin({ passwordHash, salt }) {
  const { error } = await supabase.from('admin').upsert({ id: 1, password_hash: passwordHash, salt }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

/* ---------- Content ---------- */
async function loadContent() {
  const { data, error } = await supabase.from('content').select('data').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return defaultContent();
  return data.data;
}

async function saveContent(content) {
  const { error } = await supabase.from('content').upsert({ id: 1, data: content }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

function defaultContent() {
  return {
    site: { title: 'Lynette Zoumenou', creditName: 'Giovanny Gandonou', creditEmail: 'midogiova@gmail.com' },
    profile: {},
    services: [],
    shop: { ebooks: [], products: [] },
    popups: [],
    pages: {}
  };
}

/* ---------- Uploads (Supabase Storage) ---------- */
const BUCKET = 'uploads';

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets && buckets.some(b => b.name === BUCKET)) return;
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error) throw new Error(error.message);
}

async function uploadToSupabase(buffer, filename, contentType) {
  await ensureBucket();
  const safe = filename.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^\.+/, '').slice(0, 80);
  const { error } = await supabase.storage.from(BUCKET).upload(safe, buffer, {
    contentType,
    upsert: true
  });
  if (error) throw new Error(error.message);
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${safe}`;
}

/* Multer: stocker en mémoire pour upload vers Supabase */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|gif|webp|svg\+xml|avif)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Format de fichier non autorisé'), ok);
  }
});

/* ---------- App ---------- */
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

/* No cache for admin & HTML/JS/CSS */
app.use((req, res, next) => {
  const p = req.path;
  if (p.startsWith('/admin/')) res.set('Cache-Control', 'no-store');
  else if (p === '/' || /\.(html|js|css)$/i.test(p)) res.set('Cache-Control', 'no-cache, must-revalidate');
  next();
});

/* Auth middleware */
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  const valid = await validateToken(token);
  if (!valid) return res.status(401).json({ error: 'Non authentifié ou session expirée' });
  req.token = token;
  next();
}

/* ---------- Routes ---------- */
app.get('/api/content', async (req, res) => {
  try {
    const content = await loadContent();
    res.json(content);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const admin = await getAdmin();
    if (admin.username === username && admin.passwordHash === sha256(admin.salt + (password || ''))) {
      const token = await issueToken();
      return res.json({ token });
    }
    res.status(401).json({ error: 'Identifiants incorrects' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/content', authMiddleware, async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Données invalides' });
    }
    await saveContent(body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 4 caractères' });
    }
    const admin = await getAdmin();
    if (admin.passwordHash !== sha256(admin.salt + (currentPassword || ''))) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = sha256(salt + newPassword);
    await updateAdmin({ passwordHash, salt });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const url = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ url });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* Static files */
app.use(express.static(PUBLIC_DIR));

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`\n  🌿 Lynette Zoumenou — serveur démarré (Supabase)`);
  console.log(`  • Site      : http://localhost:${PORT}`);
  console.log(`  • Admin     : http://localhost:${PORT}/admin/\n`);
});