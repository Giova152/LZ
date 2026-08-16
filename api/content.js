const { supabase } = require('./_supabase');
const { sha256, randomToken } = require('./_crypto');

const DEFAULT_CONTENT = {
  site: { title: 'Lynette Zoumenou', creditName: 'Giovanny Gandonou', creditEmail: 'midogiova@gmail.com' },
  profile: {},
  services: [],
  shop: { ebooks: [], products: [] },
  popups: [],
  pages: {}
};

async function getAdmin() {
  const { data, error } = await supabase.from('admin').select('username, password_hash, salt').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Admin non configuré');
  return { username: data.username, passwordHash: data.password_hash, salt: data.salt };
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

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('content').select('data').eq('id', 1).maybeSingle();
      if (error) throw new Error(error.message);
      return res.status(200).json(data?.data || DEFAULT_CONTENT);
    }

    if (req.method === 'PUT') {
      const auth = req.headers.authorization || '';
      const token = auth.replace(/^Bearer\s+/i, '');
      const valid = await validateToken(token);
      if (!valid) return res.status(401).json({ error: 'Non authentifié ou session expirée' });

      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: 'Données invalides' });
      }

      const { error } = await supabase.from('content').upsert({ id: 1, data: body }, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};