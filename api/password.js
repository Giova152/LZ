const { supabase } = require('./_supabase');
const { sha256, randomSalt, randomToken } = require('./_crypto');

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

async function updateAdmin({ passwordHash, salt }) {
  const { error } = await supabase.from('admin').upsert({ id: 1, password_hash: passwordHash, salt }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    const valid = await validateToken(token);
    if (!valid) return res.status(401).json({ error: 'Non authentifié ou session expirée' });

    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 4 caractères' });
    }

    const admin = await getAdmin();
    if (admin.passwordHash !== sha256(admin.salt + (currentPassword || ''))) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const salt = randomSalt();
    const passwordHash = sha256(salt + newPassword);
    await updateAdmin({ passwordHash, salt });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};