/* Pages secondaires — design « Éditorial Doré » */
(async () => {
  const c = await APP.loadContent();
  const pageId = document.body.dataset.page;
  const pg = (c.pages || {})[pageId];
  const root = document.getElementById('app');
  APP.applyTheme(c.site && c.site.design);
  if (!pg) {
    root.innerHTML = '<p style="padding:40px;text-align:center;color:var(--lite)">Page introuvable.</p>';
    return;
  }
  const site = c.site || {};

  document.title = `${pg.title || ''} — ${site.title || ''}`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && pg.sub) meta.setAttribute('content', pg.sub.replace(/<[^>]+>/g, ''));

  /* ── Page ── */
  const page = APP.el('div', { class: 'page' });

  /* ── Retour ── */
  page.append(APP.el('a', { class: 'back', href: '/', html: APP.ICONS.arrowLeft.outerHTML + 'Retour' }));

  /* ── Hero ── */
  const hero = APP.el('div', { class: 'hero' });
  hero.append(APP.el('div', { class: 'hero-accent' }));
  if (pg.image) {
    hero.append(APP.el('div', { class: 'hero-media' }, [
      APP.el('img', { class: 'hero-img', src: pg.image, alt: '', onerror: (e) => APP.fallbackImg(e.target) })
    ]));
  }
  const body = APP.el('div', { class: 'hero-body' });
  if (pg.badge) body.append(APP.el('div', { class: 'hero-badge' }, [
    APP.el('span'), document.createTextNode(' ' + APP.escapeHtml(pg.badge)), APP.el('span')
  ]));
  body.append(APP.el('div', { class: 'hero-title', html: `${APP.escapeHtml(pg.title || '')}${pg.em ? ' <em>' + APP.escapeHtml(pg.em) + '</em>' : ''}` }));
  body.append(APP.el('div', { class: 'hero-ornament' }, [
    APP.el('div', { class: 'hero-line' }),
    APP.el('div', { class: 'hero-diamond' }),
    APP.el('div', { class: 'hero-line r' })
  ]));
  if (pg.sub) body.append(APP.el('p', { class: 'hero-sub', html: APP.escapeHtml(pg.sub) }));
  if (pg.price) body.append(APP.el('div', { class: 'price', html: APP.escapeHtml(pg.price) }));
  if (pg.quote) body.append(APP.el('div', { class: 'hero-quote' }, [APP.el('p', { html: APP.escapeHtml(pg.quote) })]));
  if (pg.tags && pg.tags.length) {
    const w = APP.el('div', { class: 'tags-wrap', style: 'justify-content:center;margin-top:18px' });
    for (const t of pg.tags) if (t) w.append(APP.el('span', { class: 'tag', html: APP.escapeHtml(t) }));
    body.append(w);
  }
  if (pg.cta) {
    const cta = pg.cta;
    if (cta.popup) {
      const b = APP.el('button', { class: 'cta-main', type: 'button' }, [
        APP.ICONS.arrowRight.cloneNode(true),
        document.createTextNode(APP.escapeHtml(cta.label || ''))
      ]);
      b.addEventListener('click', () => document.getElementById('popup-offres')?.classList.add('open'));
      body.append(b);
    } else if (cta.url) {
      body.append(APP.el('a', {
        class: 'cta-main', href: cta.url,
        target: cta.target === '_blank' ? '_blank' : undefined, rel: 'noopener'
      }, [APP.ICONS.arrowRight.cloneNode(true), document.createTextNode(APP.escapeHtml(cta.label || ''))]));
    }
    if (cta.note) body.append(APP.el('div', { class: 'cta-note', html: APP.escapeHtml(cta.note) }));
  }
  hero.append(body);
  page.append(hero);

  /* ── Sections ── */
  for (const sec of (pg.sections || [])) page.append(renderSection(sec));

  /* ── Clôture ── */
  if (pg.cloture && (pg.cloture.text || pg.cloture.emoji)) {
    page.append(APP.el('div', { class: 'cloture' }, [
      pg.cloture.emoji ? APP.el('div', { class: 'e', html: APP.escapeHtml(pg.cloture.emoji) }) : null,
      pg.cloture.text ? APP.el('p', { class: 'cloture-quote', html: APP.safeHtml(pg.cloture.text).replace(/\n\n/g, '<br><br>') }) : null
    ]));
  }

  /* ── Footer ── */
  page.append(APP.el('div', { class: 'footer' }, [
    document.createTextNode('Réalisé par '),
    APP.el('a', { href: `mailto:${APP.escapeHtml(site.creditEmail || '')}`, html: APP.escapeHtml(site.creditName || '') })
  ]));
  root.append(page);

  /* ── Retour en haut ── */
  const toTop = APP.el('button', { class: 'back-to-top', type: 'button', title: 'Retour en haut', html: APP.ICONS.arrowUp.outerHTML });
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 480), { passive: true });
  document.body.append(toTop);

  /* ── Popup offres ── */
  if (pg.offers && pg.offers.length) document.body.append(buildOffersPopup(pg.offers));

  /* ── Renderers ── */
  function secHead(sec) {
    return APP.el('div', { class: 'sec-head' }, [
      APP.el('div', { class: 'sec-icon', html: (APP.ICONS[sec.icon] || APP.ICONS.sparkle).outerHTML }),
      APP.el('div', { class: 'sec-title', html: APP.escapeHtml(sec.title || '') })
    ]);
  }

  function checkClass(color) {
    return ({ accent: 'gold', gold: 'gold', rose: 'rose', green: 'green', blue: 'blue', soft: 'soft' })[color] || 'gold';
  }

  function checkList(items, color) {
    const ul = APP.el('ul', { class: 'check-list' });
    for (const item of (items || [])) {
      if (!item) continue;
      ul.append(APP.el('li', {}, [
        APP.el('span', { class: 'check-icon ' + checkClass(color), html: APP.ICONS.check.outerHTML }),
        document.createTextNode(item)
      ]));
    }
    return ul;
  }

  function renderSection(sec) {
    const s = APP.el('section', { class: 'section' });
    s.append(secHead(sec));
    const body = APP.el('div', { class: 'sec-body' });

    switch (sec.type) {
      case 'list': {
        if (sec.intro) body.append(APP.el('p', { class: 'sec-intro', html: APP.safeHtml(sec.intro) }));
        body.append(checkList(sec.items, sec.check || 'accent'));
        break;
      }
      case 'tags': {
        if (sec.intro) body.append(APP.el('p', { class: 'sec-intro', html: APP.safeHtml(sec.intro) }));
        const w = APP.el('div', { class: 'tags-wrap' });
        for (const t of (sec.items || [])) if (t) w.append(APP.el('span', { class: 'tag', html: APP.escapeHtml(t) }));
        body.append(w);
        break;
      }
      case 'format': {
        if (sec.boxes && sec.boxes.length) {
          const grid = APP.el('div', { class: 'format-grid' });
          for (const b of sec.boxes) grid.append(APP.el('div', { class: 'format-box' }, [
            APP.el('div', { class: 'format-val', html: APP.escapeHtml(b.value || '') }),
            APP.el('div', { class: 'format-lbl', html: APP.escapeHtml(b.label || '') })
          ]));
          body.append(grid);
        }
        if (sec.note) body.append(APP.el('p', { class: 'sec-intro', html: APP.safeHtml(sec.note) }));
        if (sec.inclus && sec.inclus.length) {
          const w = APP.el('div', { class: 'inclus' });
          for (const i of sec.inclus) if (i) w.append(APP.el('div', { class: 'inclus-row' }, [APP.el('span', { class: 'e', html: '✓' }), document.createTextNode(i)]));
          body.append(w);
        }
        if (sec.addons && sec.addons.items && sec.addons.items.length) {
          const a = APP.el('div', { class: 'addon-block' }, [
            APP.el('div', { class: 'addon-label', html: APP.escapeHtml(sec.addons.label || 'Options possibles en supplément') }),
            APP.el('div', { class: 'addon-tags' }, (sec.addons.items || []).filter(Boolean).map(x => APP.el('span', { class: 'addon-tag', html: APP.escapeHtml(x) })))
          ]);
          body.append(a);
        }
        break;
      }
      case 'pourqui': {
        const box = APP.el('div', { class: 'pour-qui' });
        if (sec.label) box.append(APP.el('div', { class: 'pour-qui-title', html: APP.escapeHtml(sec.label) }));
        box.append(checkList(sec.items, 'green'));
        body.append(box);
        break;
      }
      case 'dark': {
        if (sec.intro) body.append(APP.el('p', { class: 'sec-intro', html: APP.safeHtml(sec.intro) }));
        const card = APP.el('div', { class: 'intention-card' });
        if (sec.label) card.append(APP.el('div', { class: 'intention-label', html: APP.escapeHtml(sec.label) }));
        const items = APP.el('div', { class: 'intention-items' });
        for (const item of (sec.items || [])) {
          if (!item) continue;
          items.append(APP.el('div', { class: 'intention-item' }, [APP.el('i', { class: 'intention-dot' }), document.createTextNode(item)]));
        }
        card.append(items);
        if (sec.closing) card.append(APP.el('div', { class: 'pclose', html: APP.escapeHtml(sec.closing) }));
        body.append(card);
        break;
      }
      case 'quote': {
        body.append(APP.el('div', { class: 'quote-box' }, [
          APP.el('div', { class: 'mark', html: '“' }),
          APP.el('p', { html: APP.escapeHtml(sec.text || '') })
        ]));
        break;
      }
    }
    s.append(body);
    return s;
  }

  function buildOffersPopup(offers) {
    const overlay = APP.el('div', { class: 'popup-overlay', id: 'popup-offres' });
    const close = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };
    const modal = APP.el('div', { class: 'popup-box', style: 'text-align:left' }, [
      APP.el('button', { class: 'popup-close', type: 'button', html: '✕', onclick: close }),
      APP.el('div', { class: 'popup-title', html: `Choisir mon <span>${APP.escapeHtml(pg.title || '')}</span>` })
    ]);
    const list = APP.el('div', { class: 'offers-list' });
    for (const o of offers) {
      const a = APP.el(o.url ? 'a' : 'div', {
        class: 'offer-item',
        href: o.url || undefined,
        target: o.url && o.url.startsWith('http') ? '_blank' : undefined,
        rel: 'noopener'
      }, [
        APP.el('div', { class: 'offer-info' }, [
          APP.el('div', { class: 'offer-name', html: APP.escapeHtml(o.name || '') }),
          o.desc ? APP.el('div', { class: 'offer-desc', html: APP.escapeHtml(o.desc) }) : null
        ]),
        APP.el('div', { class: 'offer-price', html: APP.escapeHtml(o.price || '') })
      ]);
      list.append(a);
    }
    modal.append(list);
    overlay.append(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    return overlay;
  }
})();
