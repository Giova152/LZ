const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || key === 'COLLE_ICI_LA_SERVICE_ROLE_KEY') {
  console.error('❌ Manque SUPABASE_SERVICE_ROLE_KEY dans .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('🔧 Migration Supabase...');

  // 1. Table content
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS content (
        id INT PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE content ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Service role full access" ON content FOR ALL USING (auth.role() = 'service_role');
    `
  });
  if (e1) console.error('content:', e1.message); else console.log('✅ content');

  // 2. Table admin
  const { error: e2 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS admin (
        id INT PRIMARY KEY DEFAULT 1,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Service role full access" ON admin FOR ALL USING (auth.role() = 'service_role');
    `
  });
  if (e2) console.error('admin:', e2.message); else console.log('✅ admin');

  // 3. Table sessions
  const { error: e3 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL
      );
      ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Service role full access" ON sessions FOR ALL USING (auth.role() = 'service_role');
      CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);
    `
  });
  if (e3) console.error('sessions:', e3.message); else console.log('✅ sessions');

  // 4. Bucket uploads
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some(b => b.name === 'uploads')) {
    const { error: e4 } = await supabase.storage.createBucket('uploads', { public: true });
    if (e4) console.error('bucket:', e4.message); else console.log('✅ bucket uploads');
  } else {
    console.log('✅ bucket uploads (existe)');
  }

  // 5. Insérer admin par défaut si absent
  const { data: admin } = await supabase.from('admin').select('*').eq('id', 1).maybeSingle();
  if (!admin) {
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.createHash('sha256').update(salt + 'admin123').digest('hex');
    const { error } = await supabase.from('admin').insert({ id: 1, username: 'admin', password_hash: passwordHash, salt });
    if (error) console.error('admin insert:', error.message); else console.log('✅ admin par défaut créé (admin/admin123)');
  } else {
    console.log('✅ admin existe déjà');
  }

  // 6. Insérer contenu par défaut si absent
  const { data: content } = await supabase.from('content').select('*').eq('id', 1).maybeSingle();
  if (!content) {
    const defaultContent = {
      site: { title: 'Lynette Zoumenou', creditName: 'Giovanny Gandonou', creditEmail: 'midogiova@gmail.com' },
      profile: {},
      services: [],
      shop: { ebooks: [], products: [] },
      popups: [],
      pages: {}
    };
    const { error } = await supabase.from('content').insert({ id: 1, data: defaultContent });
    if (error) console.error('content insert:', error.message); else console.log('✅ contenu par défaut créé');
  } else {
    console.log('✅ contenu existe déjà');
  }

  console.log('\n🎉 Migration terminée !');
}

run().catch(console.error);