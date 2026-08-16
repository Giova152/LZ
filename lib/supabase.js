/* Accès Supabase (production) — contenu, admin, sessions, uploads.
   Utilisé par les fonctions serverless /api/* sur Vercel.
   Si les variables SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ne sont pas
   définies, les fonctions renvoient une erreur de configuration claire. */
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client = null;
if (url && key) {
  client = createClient(url, key, { auth: { persistSession: false } });
}

function missingConfig() {
  return !url || !key;
}

/* ---------- Contenu ---------- */
const DEFAULT_CONTENT = {
  site: { title: 'Lynette Zoumenou', creditName: 'Giovanny Gandonou', creditEmail: 'midogiova@gmail.com' },
  profile: {},
  services: [],
  shop: { ebooks: [], products: [] },
  popups: [],
  pages: {}
};

async function getContent() {
  const { data, error } = await client.from('content').select('data').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? data.data : DEFAULT_CONTENT;
}

async function saveContent(content) {
  const { error } = await client.from('content').upsert({ id: 1, data: content }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ---------- Compte admin ---------- */
async function getAdmin() {
  const { data, error } = await client.from('admin').select('username, password_hash, salt').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Compte admin non configuré — lancez scripts/migrate.js');
  return { username: data.username, passwordHash: data.password_hash, salt: data.salt };
}

async function updateAdmin({ username, passwordHash, salt }) {
  const { error } = await client.from('admin').upsert(
    { id: 1, username, password_hash: passwordHash, salt },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ---------- Sessions ---------- */
async function createSession(token, expiresAt) {
  const { error } = await client.from('sessions').insert({ token, expires_at: expiresAt.toISOString() });
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function getSession(token) {
  const { data, error } = await client.from('sessions').select('token, expires_at').eq('token', token).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await client.from('sessions').delete().eq('token', token);
    return null;
  }
  return data;
}

async function deleteSession(token) {
  await client.from('sessions').delete().eq('token', token);
}

/* ---------- Uploads (Storage) ---------- */
const BUCKET = 'uploads';

async function ensureBucket() {
  const { data: buckets } = await client.storage.listBuckets();
  if (buckets && buckets.some(b => b.name === BUCKET)) return;
  const { error } = await client.storage.createBucket(BUCKET, { public: true });
  if (error) throw new Error(error.message);
}

async function uploadImage(buffer, filename, contentType) {
  await ensureBucket();
  const safe = filename.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^\.+/, '').slice(0, 80);
  const { error } = await client.storage.from(BUCKET).upload(safe, buffer, {
    contentType,
    upsert: true
  });
  if (error) throw new Error(error.message);
  return `${url}/storage/v1/object/public/${BUCKET}/${safe}`;
}

module.exports = {
  missingConfig,
  getContent,
  saveContent,
  getAdmin,
  updateAdmin,
  createSession,
  getSession,
  deleteSession,
  uploadImage,
  ensureBucket,
  BUCKET
};
