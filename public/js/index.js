/* Page principale — design « Éditorial Doré » : Profil / Services / Boutique */
(async () => {
  const c = await APP.loadContent();
  const p = c.profile || {};
  const root = document.getElementById('app');
  APP.applyTheme(c.site && c.site.design);

  const monoInitials = (p.name || 'L').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('');

  /* ── Carte ── */
  const card = APP.el('div', { class: 'card' });
  card.append(APP.el('div', { class: 'card-accent' }));

  /* ── Header ── */
  const header = APP.el('div', { class: 'header' });

  const avatarRing = APP.el('div', { class: 'avatar-ring' });
  if (p.avatar) {
    avatarRing.append(APP.el('img', { class: 'avatar', src: p.avatar, alt: p.name, onerror: (e) => {
      e.target.style.display = 'none';
      const mono = e.target.closest('.avatar-ring')?.querySelector('.avatar.mono');
      if (mono) mono.style.display = 'flex';
    } }));
  }
  avatarRing.append(APP.el('div', { class: 'avatar mono', style: p.avatar ? 'display:none' : '', html: APP.escapeHtml(monoInitials) }));
  header.append(avatarRing);

  if (p.name) header.append(APP.el('div', { class: 'name', html: APP.escapeHtml(p.name) }));
  header.append(APP.el('div', { class: 'ornament' }, [
    APP.el('div', { class: 'ornament-line' }),
    APP.el('div', { class: 'ornament-diamond' }),
    APP.el('div', { class: 'ornament-line r' })
  ]));
  if (p.tagline) header.append(APP.el('div', { class: 'tagline', html: APP.escapeHtml(p.tagline) }));

  if (p.socials && p.socials.length) {
    const s = APP.el('div', { class: 'socials' });
    for (const soc of p.socials) {
      if (!soc.url) continue;
      s.append(APP.el('a', {
        href: soc.url, title: soc.label,
        target: soc.url.startsWith('mailto') ? undefined : '_blank', rel: 'noopener'
      }, [APP.socialIcon(soc.type)]));
    }
    header.append(s);
  }

  /* ── Onglets ── */
  const tabNav = APP.el('div', { class: 'tab-nav' });
  const tabLbl = c.site.tabs || {};
  const tabs = [
    { id: 'profil', label: tabLbl.profil || 'Profil' },
    { id: 'services', label: tabLbl.services || 'Services' },
    { id: 'boutique', label: tabLbl.boutique || 'Boutique' }
  ];
  const tabBtns = {};
  for (const t of tabs) {
    const btn = APP.el('button', { type: 'button', class: 'tab-btn', html: APP.escapeHtml(t.label) });
    btn.addEventListener('click', () => showTab(t.id, btn));
    tabBtns[t.id] = btn;
    tabNav.append(btn);
  }
  header.append(tabNav);
  card.append(header);

  /* ── Contenu ── */
  const content = APP.el('div', { class: 'content' });

  /* Profil */
  const profil = APP.el('div', { id: 'tab-profil', class: 'profil-wrap' });
  if (p.stats && p.stats.length) {
    const g = APP.el('div', { class: 'stats-grid' });
    p.stats.forEach((st, i) => {
      g.append(APP.el('div', { class: 'stat-box', style: `animation-delay:${i * 0.05}s` }, [
        APP.el('div', { class: 'stat-num', html: APP.escapeHtml(st.value || '') }),
        APP.el('div', { class: 'stat-lbl', html: APP.escapeHtml(st.label || '') })
      ]));
    });
    profil.append(g);
  }
  if (p.intro) {
    profil.append(APP.el('div', { class: 'profil-card' }, [
      APP.el('div', { class: 'profil-section-title', html: 'À propos' }),
      APP.el('p', { class: 'profil-text', html: APP.safeHtml(p.intro) })
    ]));
  }
  if (p.expertise && p.expertise.length) {
    const badges = APP.el('div', { class: 'badge-row' });
    for (const x of p.expertise) if (x) badges.append(APP.el('span', { class: 'badge', html: APP.escapeHtml(x) }));
    profil.append(APP.el('div', { class: 'profil-card' }, [
      APP.el('div', { class: 'profil-section-title', html: 'Domaines d’expertise' }),
      badges
    ]));
  }
  content.append(profil);

  /* Services */
  const services = (c.services || []).filter(s => s.items && s.items.length && s.enabled !== false);
  const servicesWrap = APP.el('div', { id: 'tab-services', class: 'services-wrap', style: 'display:none' });
  services.forEach((cat, ci) => {
    const block = APP.el('div', { class: 'cat-block' + (ci === 0 ? ' active' : ''), style: `animation-delay:${ci * 0.05}s` });
    const head = APP.el('div', { class: 'cat-head' }, [
      APP.el('div', { class: 'cat-icon', html: (APP.ICONS[cat.icon] || APP.ICONS.star).outerHTML }),
      APP.el('div', { class: 'cat-head-label', html: APP.escapeHtml(cat.label) }),
      APP.el('span', { class: 'cat-count', html: String(cat.items.length) }),
      APP.el('div', { class: 'cat-chevron', html: APP.ICONS.chevDown.outerHTML })
    ]);
    head.addEventListener('click', () => block.classList.toggle('active'));

    const links = APP.el('div', { class: 'cat-links' });
    for (const it of cat.items) {
      if (!it.label) continue;
      const row = APP.el(it.url ? 'a' : 'div', {
        class: 'cat-link',
        href: it.url || undefined,
        target: it.url && it.url.startsWith('http') ? '_blank' : undefined,
        rel: 'noopener'
      });
      if (it.image) row.append(APP.el('img', { class: 'cat-link-thumb', src: it.image, alt: '', loading: 'lazy', onerror: (e) => APP.fallbackImg(e.target) }));
      row.append(APP.el('div', { class: 'cat-link-info' }, [
        APP.el('div', { class: 'cat-link-label', html: APP.escapeHtml(it.label) }),
        it.sub ? APP.el('div', { class: 'cat-link-sub', html: APP.escapeHtml(it.sub) }) : null
      ]));
      if (it.url) row.append(APP.el('div', { class: 'cat-link-arrow', html: APP.ICONS.arrowRight.outerHTML }));
      links.append(row);
    }
    block.append(head, links);
    servicesWrap.append(block);
  });
  content.append(servicesWrap);

  /* Boutique */
  const shop = c.shop || {};
  const shopWrap = APP.el('div', { id: 'tab-boutique', class: 'shop-wrap', style: 'display:none' });

  if (shop.ebooks && shop.ebooks.length) {
    const digital = APP.el('div', { class: 'shop-section' });
    digital.append(APP.el('div', { class: 'shop-section-head' }, [
      APP.el('div', { class: 'shop-section-icon digital', html: APP.ICONS.book.outerHTML }),
      APP.el('div', { class: 'shop-section-info' }, [
        APP.el('div', { class: 'shop-section-title', html: APP.escapeHtml(shop.digitalTitle || 'Produits digitaux') }),
        APP.el('div', { class: 'shop-section-sub', html: APP.escapeHtml(shop.digitalSub || '') })
      ])
    ]));

    const row = APP.el('div', { class: 'scroll-row', id: 'ebook-row' });
    const allCards = [];
    for (const eb of shop.ebooks) {
      if (!eb.title) continue;
      const ccard = buildEbookCard(eb, c.popups || []);
      allCards.push(ccard);
      row.append(ccard);
    }
    const wrapper = APP.el('div', { class: 'shop-scroll-wrapper' }, [row]);
    digital.append(wrapper);

    const filters = APP.el('div', { class: 'ebook-filters' });
    const filterTypes = [
      { type: 'all', label: 'Tous', cls: 'active-all' },
      { type: 'free', label: '🟢 Gratuits', cls: 'active-free' },
      { type: 'paid', label: '🟡 Payants', cls: 'active-paid' }
    ];
    for (const f of filterTypes) {
      const b = APP.el('button', { type: 'button', class: 'ebook-filter-btn' + (f.type === 'all' ? ' ' + f.cls : ''), html: APP.escapeHtml(f.label) });
      b.addEventListener('click', () => {
        filters.querySelectorAll('.ebook-filter-btn').forEach(x => x.className = 'ebook-filter-btn');
        b.classList.add(f.cls);
        for (const cc of allCards) cc.style.display = (f.type === 'all' || cc.dataset.type === f.type) ? '' : 'none';
      });
      filters.append(b);
    }
    digital.append(filters);

    if (shop.ebookCta && shop.ebookCta.url) {
      digital.append(APP.el('a', { class: 'shop-cta', href: shop.ebookCta.url, target: '_blank', rel: 'noopener' }, [
        APP.ICONS.arrowRight.cloneNode(true), document.createTextNode(APP.escapeHtml(shop.ebookCta.label || 'Voir tous les e-books'))
      ]));
    }
    shopWrap.append(digital);
  }

  if (shop.products && shop.products.length) {
    if (shop.ebooks && shop.ebooks.length) shopWrap.append(APP.el('div', { class: 'shop-section-divider' }));
    const physical = APP.el('div', { class: 'shop-section' });
    physical.append(APP.el('div', { class: 'shop-section-head' }, [
      APP.el('div', { class: 'shop-section-icon physical', html: APP.ICONS.gift.outerHTML }),
      APP.el('div', { class: 'shop-section-info' }, [
        APP.el('div', { class: 'shop-section-title', html: APP.escapeHtml(shop.physicalTitle || 'Produits physiques') }),
        APP.el('div', { class: 'shop-section-sub', html: APP.escapeHtml(shop.physicalSub || '') })
      ])
    ]));
    const row = APP.el('div', { class: 'scroll-row' });
    for (const pr of shop.products) {
      if (!pr.title) continue;
      row.append(buildProductCard(pr));
    }
    physical.append(APP.el('div', { class: 'shop-scroll-wrapper' }, [row]));
    if (shop.productCta && shop.productCta.url) {
      physical.append(APP.el('a', { class: 'shop-cta', href: shop.productCta.url, target: '_blank', rel: 'noopener' }, [
        APP.ICONS.arrowRight.cloneNode(true), document.createTextNode(APP.escapeHtml(shop.productCta.label || 'Visiter la boutique'))
      ]));
    }
    shopWrap.append(physical);
  }
  content.append(shopWrap);

  card.append(content);

  /* ── Footer ── */
  card.append(APP.el('div', { class: 'footer' }, [
    document.createTextNode('Réalisé par '),
    APP.el('a', { href: `mailto:${APP.escapeHtml(c.site.creditEmail || '')}`, html: APP.escapeHtml(c.site.creditName || '') })
  ]));
  root.append(card);

  /* ── Onglets ── */
  function showTab(id, btn) {
    for (const t of tabs) tabBtns[t.id].classList.toggle('active', t.id === id);
    for (const t of tabs) {
      document.getElementById('tab-' + t.id).style.display = t.id === id ? 'flex' : 'none';
    }
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  }
  const initial = (location.hash || '').replace('#', '');
  const initTab = tabs.find(t => t.id === initial) || tabs[0];
  showTab(initTab.id, tabBtns[initTab.id]);

  /* ── Popups ── */
  if (c.popups && c.popups.length) {
    for (const pu of c.popups) document.body.append(buildPopup(pu));
  }

  /* ── Retour en haut ── */
  const toTop = APP.el('button', { class: 'back-to-top', type: 'button', title: 'Retour en haut', html: APP.ICONS.arrowUp.outerHTML });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 480), { passive: true });
  document.body.append(toTop);

  /* ── Helpers ── */
  function buildEbookCard(eb, popups) {
    const inner = [
      APP.el('span', { class: 'ebook-tag ' + (eb.type === 'free' ? 'free' : 'paid'), html: APP.escapeHtml(eb.type === 'free' ? 'Gratuit' : (eb.price || 'Payant')) }),
      eb.image ? APP.el('img', { src: eb.image, alt: '', loading: 'lazy', onerror: (e) => APP.fallbackImg(e.target) }) : null,
      APP.el('div', { class: 'ebook-card-body' }, [
        APP.el('div', { class: 'ebook-card-title', html: APP.escapeHtml(eb.title) }),
        APP.el('div', { class: 'ebook-price ' + (eb.type === 'free' ? 'free' : 'paid'), html: APP.escapeHtml(eb.type === 'free' ? 'Gratuit' : (eb.price || '')) })
      ])
    ];
    const popup = eb.popup ? popups.find(x => x.id === eb.popup) : null;
    let node;
    if (popup) {
      node = APP.el('div', { class: 'ebook-card', 'data-type': eb.type, style: 'cursor:pointer' }, inner);
      node.addEventListener('click', () => document.getElementById('popup-' + popup.id)?.classList.add('open'));
    } else if (eb.url) {
      node = APP.el('a', { class: 'ebook-card', 'data-type': eb.type, href: eb.url, target: eb.url.startsWith('http') ? '_blank' : undefined, rel: 'noopener' }, inner);
    } else {
      node = APP.el('div', { class: 'ebook-card', 'data-type': eb.type }, inner);
    }
    return node;
  }

  function buildProductCard(pr) {
    const inner = [
      pr.tag ? APP.el('span', { class: 'shop-card-tag', html: APP.escapeHtml(pr.tag) }) : null,
      pr.image ? APP.el('img', { src: pr.image, alt: '', loading: 'lazy', onerror: (e) => APP.fallbackImg(e.target) }) : null,
      APP.el('div', { class: 'shop-card-body' }, [
        APP.el('div', { class: 'shop-card-title', html: APP.escapeHtml(pr.title) }),
        APP.el('div', { class: 'shop-card-price', html: APP.escapeHtml(pr.price || '') })
      ])
    ];
    if (pr.url) {
      return APP.el('a', { class: 'shop-card', href: pr.url, target: pr.url.startsWith('http') ? '_blank' : undefined, rel: 'noopener' }, inner);
    }
    return APP.el('div', { class: 'shop-card' }, inner);
  }

  function buildPopup(pu) {
    const overlay = APP.el('div', { class: 'popup-overlay', id: 'popup-' + pu.id });
    const close = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };
    const modal = APP.el('div', { class: 'popup-box' }, [
      APP.el('button', { class: 'popup-close', type: 'button', html: '✕', onclick: close }),
      pu.emoji ? APP.el('span', { class: 'popup-emoji', html: APP.escapeHtml(pu.emoji) }) : null,
      APP.el('div', { class: 'popup-titre', html: `${APP.escapeHtml(pu.title || '')}${pu.titleAccent ? ' <span>' + APP.escapeHtml(pu.titleAccent) + '</span>' : ''}` }),
      pu.badge ? APP.el('div', { class: 'popup-badge', html: APP.escapeHtml(pu.badge) }) : null,
      pu.sub ? APP.el('div', { class: 'popup-sous', html: APP.escapeHtml(pu.sub) }) : null
    ]);
    if (pu.action) {
      const form = APP.el('form', { class: 'popup-form', action: pu.action, method: 'post' });
      for (const f of (pu.fields || [])) {
        form.append(APP.el('input', {
          type: f.name.includes('email') ? 'email' : 'text',
          name: f.name, placeholder: f.placeholder || '', required: ''
        }));
      }
      form.append(APP.el('button', { type: 'submit', html: APP.escapeHtml(pu.button || 'Envoyer') }));
      modal.append(form);
    }
    if (pu.note) modal.append(APP.el('div', { class: 'popup-note', html: APP.escapeHtml(pu.note) }));
    overlay.append(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    return overlay;
  }
})();
