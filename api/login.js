const { supabase } = require('./_supabase');
const { sha256, randomToken } = require('./_crypto');

async function getAdmin() {
  const { data, error } = await supabase.from('admin').select('username, password_hash, salt').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Admin non configuré');
  return { username: data.username, passwordHash: data.password_hash, salt: data.salt };
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const { username, password } = req.body || {};
    const admin = await getAdmin();
    if (admin.username === username && admin.passwordHash === sha256(admin.salt + (password || ''))) {
      const token = randomToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('sessions').insert({ token, expires_at: expiresAt });
      if (error) throw new Error(error.message);
      return res.status(200).json({ token });
    }
    res.status(401).json({ error: 'Identifiants incorrects' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};