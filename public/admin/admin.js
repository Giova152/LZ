/* ═══ Admin — Lynette Zoumenou ═══ */
const ICON_OPTIONS = ['calendar', 'users', 'layers', 'book', 'star', 'heart', 'shield', 'sparkle', 'quote', 'chart', 'gift'];
const SECTION_TYPES = [
  ['list', 'Liste à puces'],
  ['tags', 'Étiquettes (thèmes)'],
  ['format', 'Format / inclus'],
  ['pourqui', 'Pour qui ?'],
  ['dark', 'Encadré sombre'],
  ['quote', 'Citation']
];
const CHECK_OPTIONS = [['accent', 'Vert'], ['rose', 'Rose'], ['green', 'Vert clair'], ['blue', 'Bleu'], ['soft', 'Violet']];
const SOCIAL_TYPES = [['facebook', 'Facebook'], ['whatsapp', 'WhatsApp'], ['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['email', 'Email']];
const PAGE_LABELS = {
  'appel-decouverte': 'Appel découverte',
  'coaching-individuel': 'Coaching individuel',
  'coaching-de-groupe': 'Coaching de groupe',
  'formation': 'Formation',
  'programme1': 'Programme 1 — Reprendre sa place',
  'programme2': 'Programme 2 — Femmes & Renaissance',
  'programme3': 'Programme 3 — Oser entreprendre'
};
const NAV = [
  { group: 'Contenu principal', items: [
    ['profil', 'Profil'],
    ['socials', 'Réseaux sociaux'],
    ['services', 'Services'],
    ['ebooks', 'E-books'],
    ['products', 'Produits'],
    ['popups', 'Popups']
  ]},
  { group: 'Pages', items: Object.keys(PAGE_LABELS).map(k => ['page:' + k, PAGE_LABELS[k]]) },
  { group: 'Système', items: [['settings', 'Réglages']] }
];

const $ = s => document.querySelector(s);
const state = { draft: null, view: 'profil', openSecs: new Set(), openAcc: new Set() };
let token = localStorage.getItem('admin_token') || '';

/* ── API ── */
async function api(path, opts = {}) {
  const headers = Object.assign({}, opts.headers);
  if (opts.json !== false) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(path, Object.assign({}, opts, { headers }));
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erreur serveur');
  }
  return res.json();
}
async function login(username, password) {
  const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  token = data.token;
  localStorage.setItem('admin_token', token);
}
async function saveAll() {
  await api('/api/content', { method: 'PUT', body: JSON.stringify(state.draft) });
}
async function changePassword(cur, next) {
  await api('/api/password', { method: 'POST', body: JSON.stringify({ currentPassword: cur, newPassword: next }) });
}
async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const data = await api('/api/upload', { method: 'POST', body: fd, json: false });
  return data.url;
}

/* ── Chemins d'accès ── */
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] == null ? (o[k] = {}) : o[k]), obj);
  target[last] = value;
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }

/* ── Rendu des champs ── */
document.addEventListener('input', bindEvent);
document.addEventListener('change', bindEvent);
function bindEvent(e) {
  const el = e.target.closest('[data-bind]');
  if (!el) return;
  if (el.type === 'checkbox') setPath(state.draft, el.dataset.bind, el.checked);
  else setPath(state.draft, el.dataset.bind, el.value);
}

function toggleField(path, cfg) {
  cfg = cfg || {};
  const wrap = document.createElement('div');
  wrap.className = 'af';
  const cb = document.createElement('label');
  cb.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:.78rem;font-weight:600;color:var(--muted);cursor:pointer';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.bind = path;
  input.checked = getPath(state.draft, path) !== false;
  cb.append(input, document.createTextNode(cfg.label || ''));
  wrap.appendChild(cb);
  return wrap;
}

function field(path, cfg) {
  cfg = cfg || {};
  const wrap = document.createElement('div');
  wrap.className = 'af';
  if (cfg.label) {
    const l = document.createElement('label');
    l.textContent = cfg.label;
    wrap.appendChild(l);
  }
  const val = getPath(state.draft, path);
  let input;
  if (cfg.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = cfg.rows || 3;
  } else if (cfg.type === 'select') {
    input = document.createElement('select');
    (cfg.options || []).forEach(([v, l]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = l;
      input.appendChild(o);
    });
  } else {
    input = document.createElement('input');
    input.type = 'text';
  }
  input.dataset.bind = path;
  if (val != null) input.value = val;
  if (cfg.placeholder) input.placeholder = cfg.placeholder;
  wrap.appendChild(input);
  if (cfg.hint) {
    const h = document.createElement('div');
    h.className = 'hint';
    h.textContent = cfg.hint;
    wrap.appendChild(h);
  }
  return wrap;
}

function imageField(path, cfg) {
  cfg = cfg || {};
  const wrap = document.createElement('div');
  wrap.className = 'af';
  if (cfg.label) {
    const l = document.createElement('label');
    l.textContent = cfg.label;
    wrap.appendChild(l);
  }
  const val = getPath(state.draft, path);
  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.bind = path;
  input.placeholder = 'URL de l\'image (https://…) ou /uploads/…';
  if (val) input.value = val;

  const pick = document.createElement('div');
  pick.className = 'img-pick';
  const preview = document.createElement('div');
  preview.className = 'empty';
  preview.textContent = 'Aperçu';

  function refreshPreview() {
    const v = getPath(state.draft, path);
    pick.querySelectorAll('img, .empty').forEach(n => n.remove());
    if (v) {
      const img = document.createElement('img');
      img.src = v;
      img.onerror = () => {
        img.remove();
        preview.textContent = 'Aperçu indisponible';
        pick.insertBefore(preview, actions);
      };
      pick.insertBefore(img, actions);
    } else {
      preview.textContent = 'Aucune image';
      pick.insertBefore(preview, actions);
    }
  }

  const actions = document.createElement('div');
  actions.className = 'img-actions';
  const up = document.createElement('button');
  up.type = 'button'; up.className = 'small-btn';
  up.textContent = '📤 Importer';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.hidden = true;
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files[0]) return;
    up.textContent = 'Envoi…';
    try {
      const url = await uploadFile(fileInput.files[0]);
      setPath(state.draft, path, url);
      input.value = url;
      refreshPreview();
      toast('Image importée ✔', 'ok');
    } catch (e) {
      toast(e.message, 'err');
    }
    up.textContent = '📤 Importer';
    fileInput.value = '';
  });
  up.addEventListener('click', () => fileInput.click());
  const del = document.createElement('button');
  del.type = 'button'; del.className = 'small-btn danger';
  del.textContent = '✕ Retirer';
  del.addEventListener('click', () => {
    setPath(state.draft, path, '');
    input.value = '';
    refreshPreview();
  });
  actions.append(up, del);

  pick.append(preview, actions);
  refreshPreview();
  input.addEventListener('input', refreshPreview);
  wrap.append(input, pick);
  return wrap;
}

/* ── Liste répétable ── */
function arrEditor(container, path, opts) {
  function render() {
    const items = getPath(state.draft, path) || [];
    container.innerHTML = '';
    items.forEach((it, i) => {
      const body = document.createElement('div');
      body.className = 'rbody';
      (opts.fields(path + '.' + i, it) || []).forEach(f => body.appendChild(f));

      const head = document.createElement('div');
      head.className = 'rhead';
      const idx = document.createElement('span');
      idx.className = 'ridx';
      idx.textContent = (opts.heading ? opts.heading : 'Élément') + ' ' + (i + 1);
      const btns = document.createElement('div');
      btns.className = 'rbtns';
      btns.append(
        iconBtn('↑', () => { move(i, -1); }),
        iconBtn('↓', () => { move(i, 1); }),
        iconBtn('✕', () => { items.splice(i, 1); render(); }, 'danger')
      );
      head.append(idx, btns);

      const wrap = document.createElement('div');
      wrap.className = 'rwrap';
      wrap.append(head, body);
      container.appendChild(wrap);
    });
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'add-btn';
    add.textContent = '+ ' + (opts.addLabel || 'Ajouter un élément');
    add.addEventListener('click', () => {
      items.push(clone(opts.newItem));
      render();
      if (opts.onStruc) opts.onStruc();
    });
    container.appendChild(add);
  }
  function move(i, d) {
    const items = getPath(state.draft, path) || [];
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const tmp = items[i]; items[i] = items[j]; items[j] = tmp;
    render();
    if (opts.onStruc) opts.onStruc();
  }
  function iconBtn(label, fn, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'small-btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', fn);
    return b;
  }
  render();
}

function stringList(path, label, addLabel) {
  const c = document.createElement('div');
  c.className = 'af';
  if (label) {
    const l = document.createElement('label');
    l.textContent = label;
    c.appendChild(l);
  }
  const box = document.createElement('div');
  arrEditor(box, path, {
    heading: 'Élément',
    newItem: '',
    addLabel: addLabel || 'Ajouter',
    fields: p => [stringField(p)]
  });
  c.appendChild(box);
  return c;
}
function stringField(path) {
  const wrap = document.createElement('div');
  wrap.className = 'af';
  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.bind = path;
  input.value = getPath(state.draft, path) || '';
  wrap.appendChild(input);
  return wrap;
}

/* ── Vues ── */
function view(t) {
  const v = $('#view');
  v.innerHTML = '';
  v.appendChild(t);
}

function card(title, count) {
  const c = document.createElement('div');
  c.className = 'card';
  const h = document.createElement('h3');
  h.textContent = title;
  if (count != null) {
    const b = document.createElement('span');
    b.className = 'count';
    b.textContent = count;
    h.appendChild(b);
  }
  c.appendChild(h);
  return c;
}
function pageHead(title, sub) {
  const d = document.createElement('div');
  d.className = 'page-head';
  const inner = document.createElement('div');
  const h = document.createElement('h2');
  h.textContent = title;
  inner.appendChild(h);
  if (sub) {
    const s = document.createElement('div');
    s.className = 'sub';
    s.textContent = sub;
    inner.appendChild(s);
  }
  d.appendChild(inner);
  return d;
}

/* ── Profil ── */
function renderProfil() {
  const wrap = document.createElement('div');
  wrap.append(pageHead('Profil', 'Identité, description et chiffres affichés en haut de la page principale.'));

  const c1 = card('Identité');
  c1.appendChild(field('profile.name', { label: 'Nom affiché' }));
  c1.appendChild(field('profile.tagline', { label: 'Slogan / accroche' }));
  c1.appendChild(imageField('profile.avatar', { label: 'Photo de profil' }));
  wrap.appendChild(c1);

  const c2 = card('À propos');
  c2.appendChild(field('profile.intro', { label: 'Texte de présentation', type: 'textarea', rows: 4 }));
  wrap.appendChild(c2);

  const c3 = card('Chiffres clés', state.draft.profile.stats ? state.draft.profile.stats.length : 0);
  const st = document.createElement('div');
  arrEditor(st, 'profile.stats', {
    heading: 'Statistique',
    newItem: { value: '', label: '' },
    addLabel: 'Ajouter une statistique',
    fields: p => [field(p + '.value', { label: 'Valeur (ex : 12+)' }), field(p + '.label', { label: 'Libellé (ex : Ans d\'expérience)' })]
  });
  c3.appendChild(st);
  wrap.appendChild(c3);

  const c4 = card('Domaines d\'expertise');
  c4.appendChild(stringList('profile.expertise', 'Étiquettes', 'Ajouter un domaine'));
  wrap.appendChild(c4);
  view(wrap);
}

function renderSocials() {
  const wrap = document.createElement('div');
  wrap.append(pageHead('Réseaux sociaux', 'Icônes affichées sous le nom. Laisse le lien vide pour masquer une icône.'));
  const c = card('Liens', state.draft.profile.socials ? state.draft.profile.socials.length : 0);
  const box = document.createElement('div');
  arrEditor(box, 'profile.socials', {
    heading: 'Réseau',
    newItem: { type: 'facebook', label: '', url: '' },
    addLabel: 'Ajouter un réseau',
    fields: p => [
      field(p + '.type', { label: 'Réseau', type: 'select', options: SOCIAL_TYPES }),
      field(p + '.label', { label: 'Libellé (info-bulle)' }),
      field(p + '.url', { label: 'Lien (https://… ou mailto:…)' })
    ]
  });
  c.appendChild(box);
  wrap.appendChild(c);
  view(wrap);
}

/* ── Services ── */
function renderServices() {
  const wrap = document.createElement('div');
  wrap.append(pageHead('Services', 'Les catégories avec leurs offres. Laisse le lien vide pour un élément non cliquable.'));
  const c = card('Catégories de services', state.draft.services ? state.draft.services.length : 0);
  const box = document.createElement('div');
  arrEditor(box, 'services', {
    heading: 'Catégorie',
    newItem: { enabled: true, label: '', icon: 'star', items: [{ label: '', sub: '', url: '', image: '' }] },
    addLabel: 'Ajouter une catégorie',
    fields: p => [
      toggleField(p + '.enabled', { label: 'Afficher cette catégorie sur le site' }),
      field(p + '.label', { label: 'Titre de la catégorie' }),
      field(p + '.icon', { label: 'Icône', type: 'select', options: ICON_OPTIONS.map(i => [i, i]) })
    ].concat(itemList(p + '.items'))
  });
  c.appendChild(box);
  wrap.appendChild(c);
  view(wrap);
}
function itemList(path) {
  const box = document.createElement('div');
  box.className = 'af';
  const l = document.createElement('label');
  l.textContent = 'Offres de la catégorie';
  box.appendChild(l);
  const inner = document.createElement('div');
  arrEditor(inner, path, {
    heading: 'Offre',
    newItem: { label: '', sub: '', url: '', image: '' },
    addLabel: 'Ajouter une offre',
    fields: p => [
      field(p + '.label', { label: 'Titre' }),
      field(p + '.sub', { label: 'Sous-titre' }),
      field(p + '.url', { label: 'Lien de destination' }),
      imageField(p + '.image', { label: 'Image' })
    ]
  });
  box.appendChild(inner);
  return box;
}

/* ── E-books ── */
function renderEbooks() {
  const wrap = document.createElement('div');
  wrap.append(pageHead('E-books', 'Produits digitaux. Un « popup » s\'ouvre si un identifiant de popup est renseigné.'));
  const c = card('Titres des sections', '');
  const grid = document.createElement('div');
  grid.className = 'grid2';
  grid.append(field('shop.digitalTitle', { label: 'Titre section digitale' }));
  grid.append(field('shop.digitalSub', { label: 'Sous-titre' }));
  c.appendChild(grid);
  wrap.appendChild(c);

  const c2 = card('Liste des e-books', state.draft.shop.ebooks ? state.draft.shop.ebooks.length : 0);
  const box = document.createElement('div');
  arrEditor(box, 'shop.ebooks', {
    heading: 'E-book',
    newItem: { title: '', type: 'free', price: '', image: '', url: '', popup: '' },
    addLabel: 'Ajouter un e-book',
    fields: p => [
      field(p + '.title', { label: 'Titre' }),
      field(p + '.type', { label: 'Type', type: 'select', options: [['free', 'Gratuit'], ['paid', 'Payant']] }),
      field(p + '.price', { label: 'Prix (ex : 10 $) — pour les payants' }),
      field(p + '.url', { label: 'Lien de téléchargement / checkout' }),
      field(p + '.popup', { label: 'Popup déclenché (id du popup, ou laisser vide)', hint: 'Ex : conte pour ouvrir le popup « Conte pour enfant ».' }),
      imageField(p + '.image', { label: 'Couverture' })
    ]
  });
  c2.appendChild(box);
  wrap.appendChild(c2);

  const c3 = card('Bouton « Voir tous les e-books »');
  c3.appendChild(field('shop.ebookCta.label', { label: 'Texte du bouton' }));
  c3.appendChild(field('shop.ebookCta.url', { label: 'Lien' }));
  wrap.appendChild(c3);
  view(wrap);
}

/* ── Produits ── */
function renderProducts() {
  const wrap = document.createElement('div');
  wrap.append(pageHead('Produits physiques', 'Produits cosméceutiques affichés dans la boutique.'));
  const c = card('Titres des sections', '');
  const grid = document.createElement('div');
  grid.className = 'grid2';
  grid.append(field('shop.physicalTitle', { label: 'Titre section physique' }));
  grid.append(field('shop.physicalSub', { label: 'Sous-titre' }));
  c.appendChild(grid);
  wrap.appendChild(c);

  const c2 = card('Liste des produits', state.draft.shop.products ? state.draft.shop.products.length : 0);
  const box = document.createElement('div');
  arrEditor(box, 'shop.products', {
    heading: 'Produit',
    newItem: { title: '', price: '', tag: '', image: '', url: '' },
    addLabel: 'Ajouter un produit',
    fields: p => [
      field(p + '.title', { label: 'Nom du produit' }),
      field(p + '.price', { label: 'Prix (ex : 12 $)' }),
      field(p + '.tag', { label: 'Badge (ex : Nouveau) — optionnel' }),
      field(p + '.url', { label: 'Lien de la fiche produit' }),
      imageField(p + '.image', { label: 'Photo' })
    ]
  });
  c2.appendChild(box);
  wrap.appendChild(c2);

  const c3 = card('Bouton « Visiter la boutique »');
  c3.appendChild(field('shop.productCta.label', { label: 'Texte du bouton' }));
  c3.appendChild(field('shop.productCta.url', { label: 'Lien' }));
  wrap.appendChild(c3);
  view(wrap);
}

/* ── Popups ── */
function renderPopups() {
  const wrap = document.createElement('div');
  wrap.append(pageHead('Popups', 'Fenêtres de capture. Les e-books peuvent en déclencher via leur champ « Popup ».'));

  const c = card('Formulaires de capture', state.draft.popups ? state.draft.popups.length : 0);
  const box = document.createElement('div');
  arrEditor(box, 'popups', {
    heading: 'Popup',
    newItem: { id: '', emoji: '', title: '', titleAccent: '', badge: '', sub: '', action: '', fields: [{ name: '', placeholder: '' }], button: '', note: '' },
    addLabel: 'Ajouter un popup',
    fields: p => [
      field(p + '.id', { label: 'Identifiant (ex : conte) — utilisé par les e-books' }),
      field(p + '.emoji', { label: 'Émoji' }),
      field(p + '.title', { label: 'Titre' }),
      field(p + '.titleAccent', { label: 'Partie en italique (optionnelle)' }),
      field(p + '.badge', { label: 'Badge' }),
      field(p + '.sub', { label: 'Sous-titre', type: 'textarea', rows: 2 }),
      field(p + '.action', { label: 'URL d\'envoi du formulaire (Systeme.io…)', hint: 'Ex : https://systeme.io/embedded/…/subscription' }),
      field(p + '.button', { label: 'Texte du bouton' }),
      field(p + '.note', { label: 'Note en bas (optionnel)' })
    ].concat(popupFields(p + '.fields'))
  });
  c.appendChild(box);
  wrap.appendChild(c);
  view(wrap);
}
function popupFields(path) {
  const box = document.createElement('div');
  box.className = 'af';
  const l = document.createElement('label');
  l.textContent = 'Champs du formulaire';
  box.appendChild(l);
  const inner = document.createElement('div');
  arrEditor(inner, path, {
    heading: 'Champ',
    newItem: { name: '', placeholder: '' },
    addLabel: 'Ajouter un champ',
    fields: p => [
      field(p + '.name', { label: 'Nom technique (ex : email, first_name)' }),
      field(p + '.placeholder', { label: 'Texte d\'aide' })
    ]
  });
  box.appendChild(inner);
  return box;
}

/* ── Pages ── */
function renderPage(id) {
  const wrap = document.createElement('div');
  const base = 'pages.' + id;
  const pg = state.draft.pages[id] || {};

  wrap.append(pageHead(PAGE_LABELS[id] || id, 'Contenu de la page. Le rendu se met à jour sur le site après enregistrement.'));

  /* En-tête */
  const c1 = card('En-tête de la page');
  const g1 = document.createElement('div');
  g1.className = 'grid2';
  g1.append(field(base + '.badge', { label: 'Badge' }), field(base + '.price', { label: 'Prix (optionnel)' }));
  c1.appendChild(g1);
  c1.appendChild(field(base + '.title', { label: 'Titre' }));
  c1.appendChild(field(base + '.em', { label: 'Partie du titre en italique' }));
  c1.appendChild(field(base + '.sub', { label: 'Description', type: 'textarea', rows: 3 }));
  c1.appendChild(imageField(base + '.image', { label: 'Grande image du haut' }));
  c1.appendChild(field(base + '.quote', { label: 'Citation d\'introduction', type: 'textarea', rows: 2 }));
  wrap.appendChild(c1);

  /* Tags / piliers */
  const c1b = card('Piliers (petites étiquettes)');
  c1b.appendChild(stringList(base + '.tags', 'Étiquettes', 'Ajouter un pilier'));
  wrap.appendChild(c1b);

  /* CTA */
  const c2 = card('Bouton d\'action principal');
  const g2 = document.createElement('div');
  g2.className = 'grid2';
  g2.append(field(base + '.cta.label', { label: 'Texte du bouton' }), field(base + '.cta.url', { label: 'Lien (laisser vide si popup)' }));
  c2.appendChild(g2);
  c2.appendChild(field(base + '.cta.note', { label: 'Note sous le bouton' }));
  c2.appendChild(field(base + '.cta.target', { label: 'Ouvrir dans', type: 'select', options: [['', 'Même onglet'], ['_blank', 'Nouvel onglet']] }));
  c2.appendChild(field(base + '.cta.popup', { label: 'Popup déclenché (ex : offres) — sinon laisser vide' }));
  wrap.appendChild(c2);

  /* Offres (coaching) */
  if (pg.offers) {
    const cOff = card('Formules de paiement', pg.offers.length);
    const bo = document.createElement('div');
    arrEditor(bo, base + '.offers', {
      heading: 'Formule',
      newItem: { name: '', desc: '', price: '', url: '' },
      addLabel: 'Ajouter une formule',
      fields: p => [
        field(p + '.name', { label: 'Nom' }),
        field(p + '.price', { label: 'Prix' }),
        field(p + '.url', { label: 'Lien de paiement (Stripe…)' }),
        field(p + '.desc', { label: 'Description', type: 'textarea', rows: 2 })
      ]
    });
    cOff.appendChild(bo);
    wrap.appendChild(cOff);
  }

  /* Sections */
  const c3 = card('Sections de la page', (pg.sections || []).length);
  const secBox = document.createElement('div');
  c3.appendChild(secBox);
  wrap.appendChild(c3);
  renderSections(secBox, base + '.sections', id);

  /* Clôture */
  const c4 = card('Phrase de clôture');
  const g4 = document.createElement('div');
  g4.className = 'grid2';
  g4.append(field(base + '.cloture.emoji', { label: 'Émoji' }), field(base + '.cloture.text', { label: 'Texte (retour à la ligne = <br>)', type: 'textarea', rows: 3 }));
  c4.appendChild(g4);
  wrap.appendChild(c4);

  view(wrap);
}

function renderSections(container, base, pageId) {
  container.innerHTML = '';
  const sections = getPath(state.draft, base) || [];
  sections.forEach((sec, i) => {
    const card = document.createElement('div');
    card.className = 'sec-card';

    const head = document.createElement('div');
    head.className = 'sec-head' + (state.openSecs.has(i) ? ' open' : '');
    const gh = document.createElement('span');
    gh.className = 'gh';
    gh.textContent = (sec.type ? sec.type : '') + ' — ' + (sec.title || 'Sans titre');
    const chev = document.createElement('span');
    chev.className = 'chev';
    chev.textContent = '▾';
    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:6px';
    btns.append(
      mkBtn('↑', () => { moveSec(i, -1); }),
      mkBtn('↓', () => { moveSec(i, 1); }),
      mkBtn('✕', () => { sections.splice(i, 1); renderSections(container, base, pageId); }, 'danger')
    );
    head.append(gh, btns, chev);
    head.addEventListener('click', (e) => {
      if (e.target.closest('.small-btn')) return;
      if (state.openSecs.has(i)) state.openSecs.delete(i); else state.openSecs.add(i);
      renderSections(container, base, pageId);
    });

    const body = document.createElement('div');
    body.className = 'sec-body';
    if (state.openSecs.has(i)) body.style.display = 'block';
    sectionFields(base + '.' + i, sec, () => renderSections(container, base, pageId)).forEach(f => body.appendChild(f));

    card.append(head, body);
    container.appendChild(card);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'add-btn';
  add.textContent = '+ Ajouter une section';
  add.addEventListener('click', () => {
    sections.push({ type: 'list', icon: 'star', title: '', check: 'accent', items: [''] });
    state.openSecs.add(sections.length - 1);
    renderSections(container, base, pageId);
  });
  container.appendChild(add);

  function mkBtn(label, fn, cls) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'small-btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', fn);
    return b;
  }
  function moveSec(i, d) {
    const j = i + d;
    if (j < 0 || j >= sections.length) return;
    const t = sections[i]; sections[i] = sections[j]; sections[j] = t;
    renderSections(container, base, pageId);
  }
}

function sectionFields(base, sec, onRe) {
  const f = [];
  f.push(field(base + '.type', { label: 'Type de section', type: 'select', options: SECTION_TYPES }));
  f.push(field(base + '.icon', { label: 'Icône', type: 'select', options: ICON_OPTIONS.map(i => [i, i]) }));
  f.push(field(base + '.title', { label: 'Titre de la section' }));

  if (sec.type === 'list') {
    f.push(field(base + '.check', { label: 'Couleur des pastilles', type: 'select', options: CHECK_OPTIONS }));
    f.push(field(base + '.intro', { label: 'Intro (optionnelle)', type: 'textarea', rows: 2 }));
    f.push(stringList(base + '.items', 'Éléments de la liste', 'Ajouter un élément'));
  }
  if (sec.type === 'tags') {
    f.push(field(base + '.intro', { label: 'Intro (optionnelle)', type: 'textarea', rows: 2 }));
    f.push(stringList(base + '.items', 'Étiquettes', 'Ajouter une étiquette'));
  }
  if (sec.type === 'format') {
    const boxes = document.createElement('div');
    boxes.className = 'af';
    boxes.appendChild((() => { const l = document.createElement('label'); l.textContent = 'Indicateurs'; return l; })());
    const bi = document.createElement('div');
    arrEditor(bi, base + '.boxes', {
      heading: 'Indicateur',
      newItem: { value: '', label: '' },
      addLabel: 'Ajouter un indicateur',
      fields: p => [field(p + '.value', { label: 'Valeur (ex : 6)' }), field(p + '.label', { label: 'Libellé (ex : Semaines)' })]
    });
    boxes.appendChild(bi);
    f.push(boxes);
    f.push(field(base + '.note', { label: 'Note (accepte <strong>)', type: 'textarea', rows: 2 }));
    f.push(stringList(base + '.inclus', 'Inclus', 'Ajouter un élément inclus'));
    f.push(addonsEditor(base, onRe));
  }
  if (sec.type === 'pourqui') {
    f.push(field(base + '.label', { label: 'Intitulé du bloc' }));
    f.push(stringList(base + '.items', 'Situations', 'Ajouter une situation'));
  }
  if (sec.type === 'dark') {
    f.push(field(base + '.intro', { label: 'Introduction (accepte <strong>)', type: 'textarea', rows: 2 }));
    f.push(field(base + '.label', { label: 'Titre de l\'encadré sombre' }));
    f.push(stringList(base + '.items', 'Points', 'Ajouter un point'));
    f.push(field(base + '.closing', { label: 'Conclusion en italique (optionnelle)' }));
  }
  if (sec.type === 'quote') {
    f.push(field(base + '.text', { label: 'Texte de la citation', type: 'textarea', rows: 3 }));
  }
  return f;
}

function addonsEditor(base, onRe) {
  const wrap = document.createElement('div');
  wrap.className = 'af';
  const addons = getPath(state.draft, base + '.addons');
  const show = !!(addons && addons.items && addons.items.length);

  const box = document.createElement('div');
  box.className = 'rwrap';
  const inner = document.createElement('div');
  inner.className = 'rbody';

  const render = () => {
    const cur = getPath(state.draft, base + '.addons');
    if (cur && cur.items && cur.items.length) {
      inner.innerHTML = '';
      inner.appendChild(field(base + '.addons.label', { label: 'Titre du bloc options' }));
      const sl = document.createElement('div');
      sl.className = 'af';
      const l = document.createElement('label');
      l.textContent = 'Options supplémentaires';
      sl.appendChild(l);
      const bi = document.createElement('div');
      arrEditor(bi, base + '.addons.items', {
        heading: 'Option',
        newItem: '',
        addLabel: 'Ajouter une option',
        fields: p => [stringField(p)]
      });
      sl.appendChild(bi);
      inner.appendChild(sl);
    } else {
      inner.innerHTML = '<div class="hint" style="padding:8px 4px">Aucune option supplémentaire.</div>';
    }
  };
  render();

  const cb = document.createElement('label');
  cb.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:.78rem;font-weight:600;color:var(--muted);margin-bottom:8px';
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = show;
  cb.append(chk, document.createTextNode('Afficher les options supplémentaires'));
  chk.addEventListener('change', () => {
    if (chk.checked && !(getPath(state.draft, base + '.addons') || {}).items) {
      setPath(state.draft, base + '.addons', { label: 'Options', items: [''] });
    }
    render();
    if (onRe) onRe();
  });
  box.append(cb, inner);
  wrap.appendChild(box);
  return wrap;
}

/* ── Réglages ── */
function renderSettings() {
  const wrap = document.createElement('div');
  wrap.append(pageHead('Réglages', 'Informations générales et sécurité.'));

  const c1 = card('Informations du site');
  c1.appendChild(field('site.title', { label: 'Titre du site' }));
  c1.appendChild(field('site.creditName', { label: 'Nom du réalisateur (pied de page)' }));
  c1.appendChild(field('site.creditEmail', { label: 'Email du réalisateur' }));
  wrap.appendChild(c1);

  /* Apparence — couleur d'accent */
  if (!state.draft.site.design) state.draft.site.design = { accent: '#b8914d' };
  const accent = state.draft.site.design.accent || '#b8914d';
  const cApp = card('Apparence');
  const aNote = document.createElement('div');
  aNote.className = 'hint';
  aNote.style.cssText = 'margin-bottom:10px';
  aNote.textContent = 'La couleur choisie devient la couleur or/ivoire de tout le site (boutons, bordures, chiffres…). Les nuances sont calculées automatiquement.';
  cApp.appendChild(aNote);

  const aGrid = document.createElement('div');
  aGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px';
  const PRESETS = ['#b8914d', '#4C5D43', '#C0532D', '#2A5A9A', '#C2708F', '#7A9271', '#7A2735', '#5B3A6E'];
  const swatches = [];
  PRESETS.forEach(hex => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'swatch' + (hex === accent ? ' on' : '');
    s.dataset.hex = hex;
    s.style.background = hex;
    s.title = hex;
    s.addEventListener('click', () => setAccent(hex));
    aGrid.appendChild(s);
    swatches.push(s);
  });
  cApp.appendChild(aGrid);

  const af = document.createElement('div');
  af.className = 'af';
  const albl = document.createElement('label');
  albl.textContent = 'Couleur exacte';
  const aPick = document.createElement('div');
  aPick.style.cssText = 'display:flex;align-items:center;gap:10px';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.dataset.bind = 'site.design.accent';
  colorInput.value = accent;
  colorInput.style.cssText = 'width:52px;height:36px;padding:2px;border:1px solid var(--border);border-radius:8px;background:var(--warm);cursor:pointer';
  const hexRead = document.createElement('span');
  hexRead.style.cssText = 'font-size:.78rem;color:var(--muted);font-family:monospace';
  hexRead.textContent = accent;
  aPick.append(colorInput, hexRead);
  af.append(albl, aPick);
  cApp.appendChild(af);
  colorInput.addEventListener('change', () => {
    setPath(state.draft, 'site.design.accent', colorInput.value);
    hexRead.textContent = colorInput.value;
    swatches.forEach(s => s.classList.toggle('on', s.dataset.hex === colorInput.value));
  });
  wrap.appendChild(cApp);

  /* Onglets */
  if (!state.draft.site.tabs) state.draft.site.tabs = { profil: 'Profil', services: 'Services', boutique: 'Boutique' };
  const cTabs = card('Textes des onglets');
  const tGrid = document.createElement('div');
  tGrid.className = 'grid2';
  tGrid.append(
    field('site.tabs.profil', { label: 'Onglet 1' }),
    field('site.tabs.services', { label: 'Onglet 2' }),
    field('site.tabs.boutique', { label: 'Onglet 3' })
  );
  cTabs.appendChild(tGrid);
  wrap.appendChild(cTabs);

  function setAccent(hex) {
    setPath(state.draft, 'site.design.accent', hex);
    swatches.forEach(s => s.classList.toggle('on', s.dataset.hex === hex));
    colorInput.value = hex;
    hexRead.textContent = hex;
  }

  const c2 = card('Changer le mot de passe');
  const f = document.createElement('div');
  const cur = mkInput('Mot de passe actuel', 'password');
  const nw = mkInput('Nouveau mot de passe (min. 4 caractères)', 'password');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-primary';
  b.style.cssText = 'margin-top:10px;width:auto;padding:10px 22px';
  b.textContent = 'Mettre à jour';
  b.addEventListener('click', async () => {
    if (!cur.value || !nw.value) return toast('Renseigne les deux champs', 'err');
    try {
      await changePassword(cur.value, nw.value);
      cur.value = ''; nw.value = '';
      toast('Mot de passe mis à jour ✔', 'ok');
    } catch (e) {
      toast(e.message, 'err');
    }
  });
  f.append(cur, nw, b);
  c2.appendChild(f);
  wrap.appendChild(c2);

  const c3 = card('À propos');
  const p = document.createElement('p');
  p.style.cssText = 'font-size:.78rem;color:var(--muted);line-height:1.7';
  p.textContent = 'Toutes les modifications sont enregistrées dans le fichier data/content.json du serveur. Pense à cliquer sur « Enregistrer » après chaque changement, puis recharge le site pour voir le résultat.';
  c3.appendChild(p);
  wrap.appendChild(c3);
  view(wrap);

  function mkInput(labelText, type) {
    const w = document.createElement('div');
    w.className = 'af';
    const l = document.createElement('label');
    l.textContent = labelText;
    const i = document.createElement('input');
    i.type = type;
    i.autocomplete = 'new-password';
    w.append(l, i);
    return w;
  }
}

/* ── Navigation ── */
function buildNav() {
  const nav = $('#side-nav');
  nav.innerHTML = '';
  NAV.forEach(grp => {
    const h = document.createElement('h4');
    h.textContent = grp.group;
    nav.appendChild(h);
    grp.items.forEach(([id, label]) => {
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = label;
      a.dataset.view = id;
      if (id === state.view) a.classList.add('on');
      a.addEventListener('click', (e) => { e.preventDefault(); switchView(id); });
      nav.appendChild(a);
    });
  });
  const mnav = document.createElement('div');
  mnav.className = 'mobile-nav';
  const sel = document.createElement('select');
  NAV.forEach(grp => {
    const og = document.createElement('optgroup');
    og.label = grp.group;
    grp.items.forEach(([id, label]) => {
      const o = document.createElement('option');
      o.value = id; o.textContent = label;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  sel.value = state.view;
  sel.addEventListener('change', () => switchView(sel.value));
  mnav.appendChild(sel);
  $('.main').prepend(mnav);
}

function switchView(id) {
  state.view = id;
  document.querySelectorAll('.side a').forEach(a => a.classList.toggle('on', a.dataset.view === id));
  const msel = document.querySelector('.mobile-nav select');
  if (msel) msel.value = id;
  if (id.startsWith('page:')) renderPage(id.slice(5));
  else if (id === 'profil') renderProfil();
  else if (id === 'socials') renderSocials();
  else if (id === 'services') renderServices();
  else if (id === 'ebooks') renderEbooks();
  else if (id === 'products') renderProducts();
  else if (id === 'popups') renderPopups();
  else if (id === 'settings') renderSettings();
  window.scrollTo({ top: 0 });
}

/* ── Toast ── */
let toastTimer;
function toast(msg, kind) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + (kind || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ── Init ── */
async function init() {
  console.log('admin.js init() running');
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#login-err');
    err.textContent = '';
    try {
      await login($('#login-user').value.trim(), $('#login-pass').value);
      await startDash();
    } catch (ex) {
      err.textContent = ex.message;
    }
  });

  $('#save-btn').addEventListener('click', async () => {
    const b = $('#save-btn');
    b.classList.add('saving');
    b.textContent = '⏳ Enregistrement…';
    try {
      await saveAll();
      toast('Modifications enregistrées ✔', 'ok');
    } catch (e) {
      toast(e.message, 'err');
    }
    b.classList.remove('saving');
    b.textContent = '💾 Enregistrer';
  });

  $('#reset-btn').addEventListener('click', async () => {
    const data = await api('/api/content');
    state.draft = clone(data);
    switchView(state.view);
    toast('Modifications annulées', 'ok');
  });

  $('#logout-btn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    token = '';
    location.reload();
  });

  if (token) {
    try {
      await startDash();
    } catch (e) {
      localStorage.removeItem('admin_token');
      token = '';
    }
  }
}

async function startDash() {
  const data = await api('/api/content');
  state.draft = clone(data);
  $('#login-view').hidden = true;
  $('#dash-view').hidden = false;
  buildNav();
  switchView(state.view);
}

init();
