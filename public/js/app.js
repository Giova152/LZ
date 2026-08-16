/* Partagé — app.js */
const APP = (() => {
  const state = { content: null };

  async function loadContent() {
    if (state.content) return state.content;
    const res = await fetch('/api/content');
    state.content = await res.json();
    return state.content;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeHtml(str) {
    // Autorise un sous-ensemble volontaire (strong, em, br)
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;(\/?(?:strong|em|br)\/?)&gt;/g, '<$1>');
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) {
      if (c) node.append(c);
    }
    return node;
  }

  function svg(path, opts = {}) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', opts.viewBox || '0 0 24 24');
    s.setAttribute('fill', opts.fill || 'none');
    s.setAttribute('stroke', opts.stroke || 'currentColor');
    s.setAttribute('stroke-width', opts.sw || '1.8');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = path;
    return s;
  }

  const ICONS = {
    calendar: svg('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>'),
    users: svg('<circle cx="9" cy="8" r="3.4"/><path d="M3.5 20c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5"/><path d="M15 4.6a3.4 3.4 0 0 1 0 6.8M17.5 15.2c1.7.6 3 2.3 3 4.8"/>'),
    layers: svg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/>'),
    book: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'),
    star: svg('<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9L6.6 19.6l1.1-6-4.5-4.2 6.1-.8L12 3z"/>'),
    heart: svg('<path d="M12 20.3s-7.5-4.7-9.5-9A5.2 5.2 0 0 1 12 6.4a5.2 5.2 0 0 1 9.5 4.9c-2 4.3-9.5 9-9.5 9z"/>'),
    shield: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    sparkle: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16l.9 2.6L22.5 19.5l-2.6.9L19 23l-.9-2.6-2.6-.9 2.6-.9L19 16z"/>'),
    quote: svg('<path d="M7.5 6C5 6 3 8 3 10.5S5 15 7.5 15v3c-3 0-5.5-2.2-5.5-5V6h5.5z"/><path d="M21.5 6C19 6 17 8 17 10.5s2 4.5 4.5 4.5v3c-3 0-5.5-2.2-5.5-5V6h5.5z"/>'),
    chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
    gift: svg('<rect x="3" y="8" width="18" height="4"/><path d="M5 12v8h14v-8M12 8v12M12 8s-4.5 0-4.5-2.5S12 3 12 8zM12 8s4.5 0 4.5-2.5S12 3 12 8z"/>'),
    check: svg('<path d="M20 6L9 17l-5-5"/>'),
    arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    arrowLeft: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    arrowUp: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
    chevDown: svg('<path d="M6 9l6 6 6-6"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    image: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15.5l-5-5L8 18l-3-3"/>')
  };

  const SOCIALS = {
    facebook: { fill: true, path: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>' },
    whatsapp: { fill: true, path: '<path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.6 5.97L0 24l6.22-1.57A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.24-1.44l-.37-.22-3.88.98.99-3.77-.24-.38A9.94 9.94 0 0 1 2 12C2 6.48 6.48 2 12 2c2.67 0 5.18 1.04 7.07 2.93A9.93 9.93 0 0 1 22 12c0 5.52-4.48 10-10 10zm5.44-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.68-1.64-.93-2.24-.24-.59-.49-.5-.68-.51h-.58c-.2 0-.52.07-.79.37-.27.3-1.03 1.01-1.03 2.46s1.06 2.85 1.21 3.05c.15.2 2.08 3.18 5.04 4.46.7.3 1.25.48 1.68.62.71.22 1.35.19 1.86.11.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/>' },
    tiktok: { fill: true, path: '<path d="M15.9453 8.68918V15.6727C15.9453 19.1598 13.1048 22.0004 9.6177 22.0004C8.27369 22.0004 7.01685 21.5717 5.99251 20.8525C4.35796 19.7047 3.29004 17.8085 3.29004 15.6727C3.29004 12.1783 6.12333 9.34505 9.6104 9.34505C9.90101 9.34505 10.1843 9.36685 10.4676 9.40318V12.9121H10.4386C10.3151 12.8758 10.1843 12.8394 10.0536 12.8177H9.9954C9.86466 12.8032 9.74114 12.7813 9.60309 12.7813C8.00491 12.7813 6.70448 14.0817 6.70448 15.6799C6.70448 17.2782 8.00491 18.5786 9.60309 18.5786C11.2014 18.5786 12.5018 17.2782 12.5018 15.6799V2.00037H15.938C15.938 2.29822 15.9671 2.58881 16.0179 2.87213C16.2649 4.1798 17.035 5.30584 18.1175 6.01053C18.873 6.50452 19.7593 6.78785 20.7182 6.78785V10.2241C18.9416 10.2241 17.288 9.65222 15.9453 8.68918Z"/>' },
    instagram: { fill: true, path: '<path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/>' },
    email: { fill: true, path: '<path d="M4.30606 7.28017C4.14002 7.62375 4.06901 7.99473 4.03469 8.4148C3.99999 8.83953 3.99999 9.36401 4 10.0143V13.9857C3.99999 14.6359 3.99999 15.1604 4.03469 15.5852C4.07042 16.0225 4.14591 16.4066 4.32698 16.7619C4.6146 17.3264 5.07354 17.7854 5.63803 18.073C5.9934 18.2541 6.37752 18.3296 6.81483 18.3653C7.23955 18.4 7.76404 18.4 8.4143 18.4H15.5857C16.236 18.4 16.7605 18.4 17.1852 18.3653C17.6225 18.3296 18.0066 18.2541 18.362 18.073C18.9265 17.7854 19.3854 17.3264 19.673 16.7619C19.8541 16.4066 19.9296 16.0225 19.9653 15.5852C20 15.1604 20 14.6359 20 13.9857V10.0143C20 9.36401 20 8.83953 19.9653 8.4148C19.931 7.99473 19.86 7.62375 19.6939 7.28017L13.8997 12.0209C12.7946 12.9251 11.2054 12.9251 10.1003 12.0209L4.30606 7.28017Z"/><path d="M18.9609 6.3295C18.7792 6.17262 18.5783 6.0372 18.362 5.92696C18.0066 5.74588 17.6225 5.6704 17.1852 5.63467C16.7605 5.59997 16.236 5.59997 15.5857 5.59998H8.41432C7.76406 5.59997 7.23955 5.59997 6.81483 5.63467C6.37752 5.6704 5.9934 5.74588 5.63803 5.92696C5.42166 6.0372 5.2208 6.17262 5.03915 6.3295L10.8602 11.0922C11.5232 11.6347 12.4768 11.6347 13.1398 11.0922L18.9609 6.3295Z"/>' }
  };

  function socialIcon(type) {
    const def = SOCIALS[type] || SOCIALS.email;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'currentColor');
    s.innerHTML = def.path;
    return s;
  }

  // Scroll spy : met en évidence l'ancre visible
  function spy(navSel, sectionSel) {
    const links = document.querySelectorAll(navSel);
    const sections = document.querySelectorAll(sectionSel);
    const onScroll = () => {
      let current = sections[0]?.id;
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top <= 140) current = sec.id;
      }
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function fallbackImg(target) {
    if (!target || !target.isConnected) return;
    const holder = APP.el('div', { class: 'imgph', html: APP.ICONS.image.outerHTML });
    target.replaceWith(holder);
  }

  function toTopButton(container) {
    const btn = el('button', {
      class: 'to-top', title: 'Retour en haut', onclick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      html: APP.ICONS.arrowUp.outerHTML
    });
    container.append(btn);
    window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 480), { passive: true });
    return btn;
  }

  function hexToRgb(hex) {
    let h = String(hex || '').replace('#', '');
    if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) return [184, 145, 77];
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function mixHex(a, b, t) {
    const ca = hexToRgb(a), cb = hexToRgb(b);
    const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
    return '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
  }

  // Applique la couleur d'accent choisie (site.design.accent) et dérive les nuances
  function applyTheme(design) {
    const accent = (design && design.accent) || '#b8914d';
    const rgb = hexToRgb(accent);
    const st = document.documentElement.style;
    st.setProperty('--gold', accent);
    st.setProperty('--gold-rgb', rgb.join(' '));
    st.setProperty('--gold-d', mixHex(accent, '#000000', 0.22));
    st.setProperty('--gold-l', mixHex(accent, '#ffffff', 0.30));
    st.setProperty('--gold-p', mixHex(accent, '#ffffff', 0.82));
    st.setProperty('--accent', accent);
    st.setProperty('--accent-ink', mixHex(accent, '#000000', 0.22));
    st.setProperty('--accent-soft', mixHex(accent, '#ffffff', 0.82));
    st.setProperty('--accent-line', `rgba(${rgb.join(',')},.42)`);
  }

  return { state, loadContent, escapeHtml, safeHtml, el, svg, ICONS, SOCIALS, socialIcon, spy, fallbackImg, toTopButton, applyTheme };
})();
