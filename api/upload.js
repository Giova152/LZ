const { supabase, ensureBucket, BUCKET } = require('./_supabase');
const { randomToken } = require('./_crypto');
const Busboy = require('busboy');

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

    await ensureBucket();

    const busboy = Busboy({ headers: req.headers, limits: { fileSize: 8 * 1024 * 1024 } });

    return new Promise((resolve, reject) => {
      let fileBuffer = null;
      let fileName = null;
      let fileType = null;
      let fileError = null;

      busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        if (!/^image\/(png|jpe?g|gif|webp|svg\+xml|avif)$/i.test(mimeType)) {
          fileError = 'Format de fichier non autorisé';
          file.resume();
          return;
        }
        fileName = filename;
        fileType = mimeType;
        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
      });

      busboy.on('error', (err) => {
        fileError = err.message;
      });

      busboy.on('finish', async () => {
        if (fileError) return res.status(400).json({ error: fileError });
        if (!fileBuffer) return res.status(400).json({ error: 'Aucun fichier reçu' });

        try {
          const safe = fileName.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^\.+/, '').slice(0, 80);
          const { error } = await supabase.storage.from(BUCKET).upload(safe, fileBuffer, {
            contentType: fileType,
            upsert: true
          });
          if (error) throw new Error(error.message);

          const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${safe}`;
          res.status(200).json({ url });
        } catch (e) {
          res.status(400).json({ error: e.message });
        }
        resolve();
      });

      req.pipe(busboy);
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};