/* =========================================================
   ЭЛЬСТОМА — interactions
   ========================================================= */
(() => {
  'use strict';

  /* ---------- CONFIG: данные клиники (из 2ГИС) ---------- */
  const CLINIC = {
    coords: [42.851449, 74.63275],          // из ссылки маршрута 2ГИС — проверьте точку
    whatsapp: '996773907878',
    tz: 'Asia/Bishkek',
    // График из 2ГИС: Пн–Сб 08:00–18:00, Вс — выходной (0 = воскресенье, null = выходной)
    hours: { 1:[8,18], 2:[8,18], 3:[8,18], 4:[8,18], 5:[8,18], 6:[8,18], 0:null },
  };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  const TOOTH = 'M-36,-50 C-38,-60 38,-60 36,-50 C40,-10 34,40 20,52 C10,60 -10,60 -20,52 C-34,40 -40,-10 -36,-50Z';

  $('#year').textContent = new Date().getFullYear();

  /* ---------- огромная типографика: подгон под ширину ---------- */
  function fitText() {
    $$('.hero__title, .footer__word').forEach(el => {
      const box = el.parentElement;
      const cs = getComputedStyle(box);
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      el.style.fontSize = '100px';
      const w = el.scrollWidth;
      if (w) el.style.fontSize = Math.floor(100 * avail / w * 0.995) + 'px';
    });
  }
  fitText();
  if (document.fonts) document.fonts.ready.then(fitText);
  let fitT; addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitText, 120); });

  /* =========================================================
     PRELOADER — нить протягивается через буквы
     ========================================================= */
  function preloader() {
    const pre = $('#preloader');
    const finish = () => {
      pre.classList.add('done');
      document.body.classList.remove('is-loading');
      setTimeout(() => pre.remove(), 1100);
    };
    if (reduce) { pre.remove(); return; }
    document.body.classList.add('is-loading');

    // путь нити: синусоида, которая меняет сторону на каждой букве
    const WORD = document.querySelector('.preloader__word').textContent.trim();
    const CELL = 900 / WORD.length;
    let d = '';
    for (let x = -60; x <= 1060; x += 5) {
      const y = 100 + 42 * Math.sin(((x - 50) / CELL) * Math.PI);
      d += (x === -60 ? 'M' : 'L') + x + ',' + y.toFixed(1);
    }
    const back = $('#flossBack'), front = $('#flossFrontPath');
    back.setAttribute('d', d); front.setAttribute('d', d);
    // маска: нить поверх чётных букв, под нечётными
    const rects = $('#flossMaskRects');
    for (let i = 0; i < WORD.length; i += 2) rects.appendChild(svgEl('rect', { x: 50 + i * CELL, y: 0, width: CELL, height: 220 }));

    const len = back.getTotalLength();
    [back, front].forEach(p => { p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
    const count = $('#preCount');

    const run = () => {
      const t0 = performance.now(), DRAW = 1500, PULL = 750;
      const tick = now => {
        const t = now - t0;
        let off;
        if (t < DRAW) { const k = easeInOut(t / DRAW); off = len * (1 - k); count.textContent = Math.round(k * 100); }
        else { const k = clamp((t - DRAW) / PULL); off = -len * (k * k); count.textContent = 100; }
        back.style.strokeDashoffset = front.style.strokeDashoffset = off;
        if (t < DRAW + PULL) requestAnimationFrame(tick); else finish();
      };
      requestAnimationFrame(tick);
    };
    const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]) : Promise.resolve();
    fontsReady.then(run);
    pre.addEventListener('click', finish, { once: true });
  }
  preloader();

  /* =========================================================
     SMOOTH SCROLL (Lenis)
     ========================================================= */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const navEl = $('#nav'), burger = $('#navBurger');
  const setMenu = open => {
    navEl.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  burger.addEventListener('click', () => setMenu(!navEl.classList.contains('open')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', e => { if (navEl.classList.contains('open') && !e.target.closest('#nav')) setMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 900) setMenu(false); });

  const goTo = id => {
    const target = id === '#top' ? document.body : $(id);
    if (!target) return false;
    const navH = navEl.offsetHeight + 24;
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { offset: -navH, duration: 1.2 });
    else {
      const y = id === '#top' ? 0 : target.getBoundingClientRect().top + scrollY - navH;
      scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (history.replaceState) history.replaceState(null, '', id === '#top' ? location.pathname + location.search : id);
    return true;
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    if (goTo(id)) { e.preventDefault(); setMenu(false); }
  });
  // открыли страницу по ссылке с якорем — докручиваем после прелоадера
  if (location.hash && $(location.hash)) setTimeout(() => goTo(location.hash), reduce ? 0 : 2400);

  // подсветка активного пункта меню
  const navLinks = $$('.nav__links a');
  const linkFor = id => navLinks.find(l => l.getAttribute('href') === '#' + id);
  const watched = navLinks.map(l => $(l.getAttribute('href'))).filter(Boolean);
  function updateActive() {
    const probe = innerHeight * 0.35;
    let cur = null;
    for (const sec of watched) { const r = sec.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) cur = sec; }
    // в самом низу страницы — последний раздел
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = watched[watched.length - 1];
    navLinks.forEach(l => { const on = !!cur && l === linkFor(cur.id); l.classList.toggle('active', on); on ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current'); });
  }

  /* =========================================================
     HERO — зубы выстраиваются при скролле
     ========================================================= */
  const hero = $('#top');
  const teethG = $('#teeth'), bracketsG = $('#brackets'), wire = $('#smileWire'), gum = $('#smileGum'), badge = $('#smileBadge');
  const SCALES = [.74, .84, .92, 1.04, 1.04, .92, .84, .74];
  const CHAOS = [[-14, 34, -20], [12, -28, 16], [-8, 24, -12], [16, -16, 22], [-18, 30, -18], [8, -32, 12], [-12, 26, -24], [18, -20, 18]];
  const ORDER = [3, 6, 1, 4, 0, 7, 2, 5]; // в каком порядке встают на место
  const heroTeeth = [];
  (function buildSmile() {
    const gap = 6;
    const total = SCALES.reduce((s, k) => s + 80 * k + gap, -gap);
    let x = 500 - total / 2;
    const tops = [];
    SCALES.forEach((s, i) => {
      const w = 80 * s, cx = x + w / 2; x += w + gap;
      const dx = cx - 500;
      const y = 150 - 55 * Math.pow(dx / 420, 2);
      const r = Math.atan(-110 * dx / (420 * 420)) * 180 / Math.PI;
      const g = svgEl('g');
      g.appendChild(svgEl('path', { d: TOOTH, class: 'tooth' }));
      teethG.appendChild(g);
      const b = svgEl('rect', { x: -10, y: -8, width: 20, height: 16, rx: 4, class: 'bracket' });
      bracketsG.appendChild(b);
      heroTeeth.push({ g, b, s, fx: cx, fy: y, fr: r, c: CHAOS[i], o: ORDER.indexOf(i) });
      tops.push([cx, y - 58 * s - 14]);
    });
    let gd = `M${tops[0][0] - 40},${tops[0][1] + 10}`;
    tops.forEach(([tx, ty]) => gd += ` L${tx},${ty}`);
    gd += ` L${tops[tops.length - 1][0] + 40},${tops[tops.length - 1][1] + 10}`;
    gum.setAttribute('d', gd);
  })();

  function renderSmile(p) {
    const pts = [];
    heroTeeth.forEach(t => {
      const k = easeOut(clamp((p * 1.3 - t.o * 0.09) / 0.38));
      const x = t.fx + t.c[0] * (1 - k);
      const y = t.fy + t.c[1] * (1 - k);
      const r = t.fr + t.c[2] * (1 - k);
      t.g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)}) scale(${t.s})`);
      // брекет в координатах зуба (0, -4)
      const rad = r * Math.PI / 180, by = -4 * t.s;
      const bx = x - Math.sin(rad) * by, byw = y + Math.cos(rad) * by;
      t.b.setAttribute('transform', `translate(${bx.toFixed(2)} ${byw.toFixed(2)}) rotate(${r.toFixed(2)})`);
      pts.push([bx, byw]);
    });
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2;
      d += ` Q${pts[i - 1][0]},${pts[i - 1][1]} ${mx},${my}`;
    }
    d += ` T${pts[pts.length - 1][0]},${pts[pts.length - 1][1]}`;
    wire.setAttribute('d', d);
    const fade = 1 - clamp((p - .82) / .1);
    wire.style.opacity = fade; bracketsG.style.opacity = fade;
    teethG.style.filter = p > .9 ? 'url(#toothGlow)' : '';
    badge.classList.toggle('on', p > .9);
  }

  /* =========================================================
     SCROLL LOOP — прогресс hero + тема навигации
     ========================================================= */
  const nav = $('#nav');
  const themed = $$('[data-theme]').filter(el => el.tagName === 'SECTION' || el.tagName === 'FOOTER');
  let lastY = -1;
  function onFrame() {
    const y = window.scrollY;
    if (y !== lastY) {
      lastY = y;
      if (reduce) renderSmile(1);
      else {
        const r = hero.getBoundingClientRect();
        const span = r.height - innerHeight;
        renderSmile(span > 0 ? clamp(-r.top / span) : 1);
      }
      let dark = false;
      for (const s of themed) { const b = s.getBoundingClientRect(); if (b.top <= 40 && b.bottom > 40) { dark = s.dataset.theme === 'dark'; break; } }
      nav.classList.toggle('on-dark', dark);
      updateActive();
    }
    requestAnimationFrame(onFrame);
  }
  requestAnimationFrame(onFrame);

  /* =========================================================
     REVEAL + COUNTERS
     ========================================================= */
  $$('.reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', (sibs.indexOf(el) % 6) * 0.07 + 's');
  });
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  const cio = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0);
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    const t0 = performance.now(), D = 1800;
    const step = now => {
      const k = easeOut(clamp((now - t0) / D));
      el.textContent = (to * k).toFixed(dec);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$('.counter').forEach(el => cio.observe(el));

  /* =========================================================
     BUTTONS — ультразвуковая волна
     ========================================================= */
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .mbar__btn');
    if (!b || reduce) return;
    const r = b.getBoundingClientRect();
    const ws = Math.max(r.width, r.height) / 20 * 1.25;
    for (let i = 0; i < 3; i++) {
      const w = document.createElement('span');
      w.className = 'wave';
      w.style.cssText = `--x:${e.clientX - r.left}px;--y:${e.clientY - r.top}px;--wd:${i * 0.12}s;--ws:${ws}`;
      b.appendChild(w);
      setTimeout(() => w.remove(), 1300);
    }
  });

  /* card spotlight */
  $$('.card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px');
    c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  /* =========================================================
     CURSOR — стоматологическое зеркальце с увеличением
     ========================================================= */
  if (finePointer && !reduce) {
    document.documentElement.classList.add('has-mirror');
    const mirror = $('#mirror'), view = $('#mirrorView');
    const MAG_SEL = 'h1, h2, h3, p, blockquote, summary, dd, .stat__num, .card__big, .rev__score, .footer__word, .doc__exp, .eyebrow';
    const SKIP_SEL = '.mirror, .preloader, input, select, textarea, .btn, .map, .arch';
    const R = 60, SCALE = 1.8;
    let mx = innerWidth / 2, my = innerHeight / 2, lx = mx, ly = my, cur = null, clone = null, visible = false;
    const COPY = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'color', 'textTransform', 'textAlign', 'whiteSpace', 'textShadow', 'wordSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];

    const bgOf = el => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage !== 'none' && !/text/.test(cs.webkitBackgroundClip || cs.backgroundClip)) return cs.backgroundImage.includes('gradient') ? (n.matches('.card--accent, .rev--score') ? '#0F8CFF' : cs.backgroundColor) : cs.backgroundColor;
        if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') return cs.backgroundColor;
      }
      return '#fff';
    };
    const setTarget = el => {
      if (el === cur) return;
      cur = el; view.innerHTML = ''; clone = null;
      if (!el) return;
      const cs = getComputedStyle(el), rect = el.getBoundingClientRect();
      clone = el.cloneNode(true);
      clone.removeAttribute('id'); clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      clone.classList.remove('reveal');
      COPY.forEach(p => clone.style[p] = cs[p]);
      clone.style.width = rect.width + 'px'; clone.style.boxSizing = 'border-box';
      clone.style.opacity = 1; clone.style.filter = 'none';
      const theme = el.closest('[data-theme]');
      view.setAttribute('data-theme', theme ? theme.dataset.theme : 'light');
      view.style.background = bgOf(el);
      view.appendChild(clone);
    };
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; lx = mx; ly = my; mirror.style.opacity = 1; }
      const t = e.target;
      const skip = t.closest && t.closest(SKIP_SEL);
      const m = !skip && t.closest ? t.closest(MAG_SEL) : null;
      setTarget(m);
      mirror.classList.toggle('is-mag', !!m);
      mirror.classList.toggle('is-btn', !m && !!(t.closest && t.closest('a, button, .btn, .t, summary, input, select')));
    }, { passive: true });
    document.addEventListener('mouseleave', () => { visible = false; mirror.style.opacity = 0; });
    addEventListener('scroll', () => { /* позиция клона пересчитывается в кадре */ }, { passive: true });

    const loop = () => {
      lx = lerp(lx, mx, 0.32); ly = lerp(ly, my, 0.32);
      mirror.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
      if (clone && cur) {
        const r = cur.getBoundingClientRect();
        const tx = R - (lx - r.left) * SCALE, ty = R - (ly - r.top) * SCALE;
        clone.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${SCALE})`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* =========================================================
     TOOTH MAP — интерактивная схема
     ========================================================= */
  const INFO = [
    { name: 'Центральный резец', problem: 'Сколы, потемнение эмали, щели между зубами.', service: 'Эстетическая реставрация, виниры, отбеливание' },
    { name: 'Боковой резец', problem: 'Неровный ряд, скученность, сколы края.', service: 'Брекеты или элайнеры, реставрация композитом' },
    { name: 'Клык', problem: 'Чувствительность, стёртость и клиновидные дефекты у десны.', service: 'Пломбирование дефектов, снижение чувствительности' },
    { name: 'Первый премоляр', problem: 'Кариес в межзубных промежутках — часто незаметен.', service: 'Лечение кариеса, светоотверждаемые пломбы' },
    { name: 'Второй премоляр', problem: 'Кариес, разрушение старой пломбы.', service: 'Замена пломб, лечение кариеса' },
    { name: 'Первый моляр', problem: 'Глубокий кариес, пульпит — острая ночная боль.', service: 'Лечение каналов — сохраняем зуб' },
    { name: 'Второй моляр', problem: 'Сильное разрушение или утрата зуба.', service: 'Коронки и протезирование' },
    { name: 'Зуб мудрости', problem: 'Неправильный рост, воспаление, боль при открывании рта.', service: 'Удаление зуба мудрости' },
  ];
  const SERVICE_OPT = ['Виниры / отбеливание', 'Брекеты / элайнеры', 'Лечение кариеса', 'Лечение кариеса', 'Лечение кариеса', 'Лечение каналов', 'Протезирование / коронки', 'Удаление зуба'];
  $('#tiBtn').addEventListener('click', e => { const v = e.currentTarget.dataset.service; if (v) $('#bookForm').service.value = v; });
  const SIZE = [1, .86, .92, .92, .92, 1.22, 1.16, 1.06];
  function toothPath(d) {
    // форма в зависимости от типа (ось Y направлена к центру дуги)
    const s = SIZE[d];
    if (d <= 1) { const w = 13 * s, h = 19; return `M${-w},${-h + 6} Q${-w},${-h} ${-w + 6},${-h} L${w - 6},${-h} Q${w},${-h} ${w},${-h + 6} L${w - 2},${h - 6} Q${w - 3},${h} ${w - 9},${h} L${-w + 9},${h} Q${-w + 3},${h} ${-w + 2},${h - 6}Z`; }
    if (d === 2) return 'M-13,-16 Q0,-26 13,-16 Q16,4 6,18 Q0,24 -6,18 Q-16,4 -13,-16Z';
    if (d <= 4) return 'M-15,-12 Q-16,-19 -6,-19 L6,-19 Q16,-19 15,-12 L15,12 Q16,19 6,19 L-6,19 Q-16,19 -15,12Z';
    const w = 19 * s, h = 18 * s;
    return `M${-w},${-h + 7} Q${-w},${-h} ${-w + 7},${-h} L${w - 7},${-h} Q${w},${-h} ${w},${-h + 7} L${w},${h - 7} Q${w},${h} ${w - 7},${h} L${-w + 7},${h} Q${-w},${h} ${-w},${h - 7}Z`;
  }
  (function buildArch() {
    const arch = $('#arch'), tip = $('#archTip'), wrap = $('.arch-wrap');
    const tiNum = $('#tiNum'), tiTitle = $('#tiTitle'), tiProblem = $('#tiProblem'), tiService = $('#tiService'), panel = $('#toothInfo');
    arch.appendChild(svgEl('line', { x1: 300, y1: 40, x2: 300, y2: 600, class: 'arch__mid' }));
    const t1 = svgEl('text', { x: 300, y: 300, 'text-anchor': 'middle', class: 'arch__label' }); t1.textContent = 'Верхняя';
    const t2 = svgEl('text', { x: 300, y: 350, 'text-anchor': 'middle', class: 'arch__label' }); t2.textContent = 'Нижняя';
    arch.append(t1, t2);

    const jaws = [
      { cx: 300, cy: 300, rx: 215, ry: 240, from: 196, to: 344, quadL: 1, quadR: 2, upper: true },
      { cx: 300, cy: 345, rx: 205, ry: 235, from: 164, to: 16, quadL: 4, quadR: 3, upper: false },
    ];
    let selected = null;
    jaws.forEach(j => {
      const ds = []; for (let i = 0; i < 16; i++) ds.push(i < 8 ? 7 - i : i - 8);
      const weights = ds.map(d => SIZE[d] * (d >= 5 ? 1.25 : 1));
      const sum = weights.reduce((a, b) => a + b, 0);
      let acc = 0;
      ds.forEach((d, i) => {
        const mid = acc + weights[i] / 2; acc += weights[i];
        const ang = j.from + (j.to - j.from) * (mid / sum);
        const rad = ang * Math.PI / 180;
        const x = j.cx + j.rx * Math.cos(rad), y = j.cy + j.ry * Math.sin(rad);
        const num = (i < 8 ? j.quadL : j.quadR) * 10 + (d + 1);
        const g = svgEl('g', { class: 't', tabindex: 0, role: 'button', 'aria-label': `Зуб ${num}: ${INFO[d].name}`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(ang + 90).toFixed(1)})` });
        g.appendChild(svgEl('path', { d: toothPath(d) }));
        g.dataset.d = d; g.dataset.num = num;
        arch.appendChild(g);
      });
    });

    const show = (g, withTip) => {
      if (selected) selected.classList.remove('sel');
      selected = g; g.classList.add('sel');
      const info = INFO[+g.dataset.d];
      tiNum.textContent = 'Зуб № ' + g.dataset.num;
      tiTitle.textContent = info.name;
      tiProblem.textContent = 'Частая проблема: ' + info.problem;
      tiService.textContent = '→ ' + info.service;
      panel.classList.add('active');
      $('#tiBtn').dataset.service = SERVICE_OPT[+g.dataset.d];
      if (withTip) {
        const gr = g.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
        tip.innerHTML = `<b>${info.name}</b>${info.service}`;
        tip.style.left = gr.left - wr.left + gr.width / 2 + 'px';
        tip.style.top = gr.top - wr.top + 'px';
        tip.classList.add('on');
      }
    };
    arch.addEventListener('pointerover', e => { const g = e.target.closest('.t'); if (g) show(g, e.pointerType === 'mouse'); });
    arch.addEventListener('pointerleave', () => tip.classList.remove('on'));
    arch.addEventListener('click', e => { const g = e.target.closest('.t'); if (g) show(g, false); });
    arch.addEventListener('focusin', e => { const g = e.target.closest('.t'); if (g) show(g, true); });
    arch.addEventListener('focusout', () => tip.classList.remove('on'));
    arch.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.t')) { e.preventDefault(); show(e.target.closest('.t'), true); } });
  })();

  /* =========================================================
     DOCTORS — переворот по тапу на тач-экранах
     ========================================================= */
  $$('.doc').forEach(d => d.addEventListener('click', () => { if (!finePointer) d.classList.toggle('flip'); }));

  /* =========================================================
     BOOKING FORM → WhatsApp
     ========================================================= */
  $('#bookForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget, err = $('#formErr');
    const name = f.name.value.trim();
    $$('.field', f).forEach(x => x.classList.remove('bad'));
    if (name.length < 2) { f.name.closest('.field').classList.add('bad'); err.textContent = 'Укажите, как к вам обращаться.'; f.name.focus(); return; }
    err.textContent = '';
    const text = [
      'Здравствуйте! Хочу записаться в стоматологию «Эльстома».',
      'Имя: ' + name,
      'Услуга: ' + f.service.value,
      f.time.value.trim() ? 'Удобное время: ' + f.time.value.trim() : '',
    ].filter(Boolean).join('\n');
    const url = `https://wa.me/${CLINIC.whatsapp}?text=${encodeURIComponent(text)}`;
    // Надёжное открытие на телефонах: настоящая ссылка вместо window.open
    // (iPhone, встроенные браузеры Instagram/Telegram и т. п. блокируют всплывающие окна)
    const go = $('#formGo');
    go.href = url; go.hidden = false;
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  });

  /* =========================================================
     OPEN / CLOSED — живой индикатор (время Бишкека)
     ========================================================= */
  function updateStatus() {
    const el = $('#openStatus'), label = el.querySelector('span');
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC.tz, hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const h = +get('hour') % 24, m = +get('minute');
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const now = h + m / 60;
    let open, text;
    if (!CLINIC.hours) {
      open = true;
      text = 'Приём по предварительной записи';
    } else {
      const d = CLINIC.hours[wd];
      open = !!d && now >= d[0] && now < d[1];
      text = open ? `Сейчас открыто · до ${d[1]}:00` : 'Сейчас закрыто';
    }
    el.classList.toggle('closed', !open);
    label.textContent = text;
  }
  updateStatus(); setInterval(updateStatus, 60000);

  /* =========================================================
     MAP — рентген-скан Бишкека
     ========================================================= */
  (function map() {
    // Собственная схема-карта: рисуется в SVG прямо на странице, без внешних сервисов и ключей.
    const box = $('#mapBox'), layer = $('#mapLayer'), coordsEl = $('#mapCoords');
    const [lat, lon] = CLINIC.coords;

    // детерминированный «случай», чтобы схема всегда была одинаковой
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const W = 1600, H = 1100, X0 = -W / 2, Y0 = -H / 2, CELL = 120;
    const majorX = [-3, 1, 5], majorY = [-2, 2];              // номера магистралей (в клетках)
    let blocks = '', roads = '', minor = '', parks = '';
    for (let gx = -7; gx < 7; gx++) for (let gy = -5; gy < 5; gy++) {
      const x = gx * CELL, y = gy * CELL;
      if (gx === 0 && gy === 0) continue;                    // квартал клиники рисуем отдельно
      if ((gx === -2 && gy === 1) || (gx === 3 && gy === -3) || (gx === -5 && gy === -2)) {
        parks += `<rect x="${x + 14}" y="${y + 14}" width="${CELL - 28}" height="${CELL - 28}" rx="14"/>`; continue;
      }
      // квартал делится на 4 участка, в каждом — дом (иногда участок пустой или дом длинный)
      const Q = (CELL - 24) / 2;
      if (rnd() < .3) {                                       // длинный дом-«панелька» на весь квартал
        const v = rnd() < .5, len = CELL - 36 - rnd() * 20, th = 20 + rnd() * 10;
        blocks += v ? `<rect x="${(x + 18 + rnd() * (CELL - 36 - th)).toFixed(1)}" y="${y + 18}" width="${th.toFixed(1)}" height="${len.toFixed(1)}" rx="3"/>`
                    : `<rect x="${x + 18}" y="${(y + 18 + rnd() * (CELL - 36 - th)).toFixed(1)}" width="${len.toFixed(1)}" height="${th.toFixed(1)}" rx="3"/>`;
      } else for (let qx = 0; qx < 2; qx++) for (let qy = 0; qy < 2; qy++) {
        if (rnd() < .22) continue;
        const bw = Q * (.55 + rnd() * .35), bh = Q * (.5 + rnd() * .4);
        const bx = x + 12 + qx * Q + (Q - bw) / 2, by = y + 12 + qy * Q + (Q - bh) / 2;
        blocks += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3"/>`;
      }
    }
    for (let gx = -7; gx <= 7; gx++) {
      const x = gx * CELL;
      (majorX.includes(gx) ? (s => roads += s) : (s => minor += s))(`<line x1="${x}" y1="${Y0}" x2="${x}" y2="${-Y0}"/>`);
    }
    for (let gy = -5; gy <= 5; gy++) {
      const y = gy * CELL;
      (majorY.includes(gy) ? (s => roads += s) : (s => minor += s))(`<line x1="${X0}" y1="${y}" x2="${-X0}" y2="${y}"/>`);
    }
    // канал / арык — плавная линия через схему
    const river = `M${X0} ${-260} C ${-420} ${-330}, ${-300} ${-140}, ${-120} ${-190} S ${260} ${-330}, ${420} ${-250} S ${700} ${-120}, ${-X0} ${-170}`;
    // путь от ближайшей магистрали к клинике
    const route = `M ${CELL} ${-2 * CELL} L ${CELL} ${-CELL / 2} L ${CELL / 2} ${-CELL / 2} L 0 0`;

    layer.innerHTML = `
      <svg class="mapx__svg" viewBox="${X0} ${Y0} ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="mxGlow"><stop offset="0" stop-color="#5CE1FF" stop-opacity=".35"/><stop offset="1" stop-color="#5CE1FF" stop-opacity="0"/></radialGradient>
        </defs>
        <g class="mx-parks">${parks}</g>
        <path class="mx-river" d="${river}"/>
        <g class="mx-minor">${minor}</g>
        <g class="mx-roads">${roads}</g>
        <g class="mx-blocks">${blocks}</g>
        <circle r="300" fill="url(#mxGlow)"/>
        <g class="mx-rings"><circle r="150"/><circle r="300"/><circle r="450"/></g>
        <rect class="mx-home" x="${-CELL / 2 + 14}" y="${-CELL / 2 + 14}" width="${CELL - 28}" height="${CELL - 28}" rx="6"/>
        <path class="mx-route" d="${route}"/>
        <g class="mx-compass" transform="translate(${-X0 - 90} ${Y0 + 110})">
          <circle r="34"/><path d="M0 -26 L8 0 L0 -6 L-8 0Z"/><text y="52">С</text>
        </g>
      </svg>
      <div class="mapx__pin">
        <div class="pin"><span class="pin__ring"></span><span class="pin__ring"></span><span class="pin__ring"></span><svg viewBox="-50 -60 100 120"><path d="${TOOTH}"/></svg></div>
        <div class="mapx__tag"><b>Эльстома</b><span>мкр Кок-Жар, 1 · цокольный этаж</span></div>
      </div>`;

    // ---- перемещение и масштаб ----
    let s = 1, tx = 0, ty = 0;
    const apply = (anim) => {
      layer.style.transition = anim && !reduce ? 'transform .6s cubic-bezier(.2,.7,.2,1)' : 'none';
      layer.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
      layer.style.setProperty('--inv', 1 / s);
    };
    const limit = () => {
      const r = box.getBoundingClientRect(), mx = r.width * .6 * s, my = r.height * .6 * s;
      tx = clamp(tx, -mx, mx); ty = clamp(ty, -my, my);
    };
    const zoomBy = (k, anim = true) => { s = clamp(s * k, .7, 3); limit(); apply(anim); };
    $('#mapIn').addEventListener('click', () => zoomBy(1.35));
    $('#mapOut').addEventListener('click', () => zoomBy(1 / 1.35));
    $('#mapRecenter').addEventListener('click', () => { s = 1.4; tx = ty = 0; apply(true); });

    let drag = null;
    box.addEventListener('pointerdown', e => {
      if (e.target.closest('a, button')) return;
      drag = { x: e.clientX - tx, y: e.clientY - ty, id: e.pointerId };
      box.classList.add('dragging');
    });
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      tx = e.clientX - drag.x; ty = e.clientY - drag.y; limit(); apply(false);
    });
    const end = () => { drag = null; box.classList.remove('dragging'); };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    // колесо — только с зажатым Ctrl, чтобы не мешать прокрутке страницы
    box.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, false); }, { passive: false });

    // ---- «рентген-скан» при появлении ----
    let done = false;
    const found = () => {
      if (done) return; done = true;
      box.classList.remove('scanning'); box.classList.add('scanned');
      coordsEl.textContent = `${lat.toFixed(4)}° N · ${lon.toFixed(4)}° E`;
      s = 1.4; apply(true);
    };
    s = .9; apply(false);
    if (reduce || !('IntersectionObserver' in window)) { found(); return; }

    const mio = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      mio.disconnect();
      box.classList.add('scanning');
      const t0 = performance.now(), D = 2200;
      const jitter = now => {
        const k = clamp((now - t0) / D);
        const a = lat + (Math.random() - .5) * .2 * (1 - k), b = lon + (Math.random() - .5) * .2 * (1 - k);
        coordsEl.textContent = `${a.toFixed(4)}° N · ${b.toFixed(4)}° E`;
        if (k < 1) requestAnimationFrame(jitter); else found();
      };
      requestAnimationFrame(jitter);
    }, { threshold: 0.25 });
    mio.observe(box);
    setTimeout(() => { if (!done && box.getBoundingClientRect().top < innerHeight) found(); }, 6000);
  })();
})();
