// Looping animations for flagship tiles and standard project pages.
// Each .loop[data-loop] is built once; one shared ticker advances the loops that are on screen.
// With reduced motion every loop is drawn in its final state and never ticks.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const h = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const read = (box) => {
    try {
      const v = JSON.parse(box.dataset.labels || '[]');
      return Array.isArray(v) ? v.map(String) : [];
    } catch {
      return [];
    }
  };
  const clock = (i) => `09:${String((i * 7) % 60).padStart(2, '0')}`;

  // Each builder draws into box and returns { step(t), final } where final is the tick that shows the end state.
  const BUILDERS = {
    pipeline(box, labels) {
      const list = h('ol', 'lp-run');
      const rows = labels.map((label) => {
        const li = h('li', 'lp-step');
        li.append(h('span', 'lp-mark'), h('span', 'lp-label', label), h('span', 'lp-state'));
        list.append(li);
        return li;
      });
      box.append(list);
      const cycle = rows.length + 2;
      return {
        final: rows.length,
        step(t) {
          const k = t % cycle;
          rows.forEach((li, i) => {
            const state = i < k ? 'done' : i === k ? 'run' : 'wait';
            li.dataset.state = state;
            li.lastChild.textContent = state === 'done' ? 'ok' : state === 'run' ? 'running' : '';
          });
        },
      };
    },

    log(box, labels) {
      const out = h('div', 'lg');
      box.append(out);
      return {
        final: labels.length - 1,
        step(t) {
          out.textContent = '';
          for (let i = Math.max(0, t - 5); i <= t; i++) {
            const line = h('div', `lg-line${i === t ? ' new' : ''}`);
            line.append(h('span', 'lg-ts', clock(i)), h('span', 'lg-msg', labels[i % labels.length]));
            out.append(line);
          }
        },
      };
    },

    heal(box, labels) {
      const nodes = h('div', 'hl-nodes');
      const items = labels.slice(0, 4).map((label) => { const n = h('span', 'hl-node ok', label); nodes.append(n); return n; });
      const out = h('div', 'lg');
      box.append(nodes, out);
      const broken = items[Math.min(2, items.length - 1)];
      const name = broken.textContent;
      const script = [
        ['ok', 'run started'],
        ['fail', `run failed at "${name}"`],
        ['fail', 'agent: reading the error'],
        ['fail', 'agent: patching the workflow'],
        ['patch', 'redeployed through the n8n API'],
        ['ok', 'rerun ok, fix report emailed'],
        ['ok', 'watching'],
      ];
      return {
        final: 5,
        step(t) {
          const k = t % script.length;
          broken.className = `hl-node ${script[k][0]}`;
          out.textContent = '';
          for (let i = Math.max(0, k - 4); i <= k; i++) {
            const line = h('div', `lg-line${i === k ? ' new' : ''}`);
            line.append(h('span', 'lg-ts', clock(i)), h('span', 'lg-msg', script[i][1]));
            out.append(line);
          }
        },
      };
    },

    cards(box, labels) {
      const grid = h('div', 'cd-grid');
      const cards = Array.from({ length: 6 }, (_, i) => { const c = h('div', `cd k${i % 3}`, labels[i % labels.length]); grid.append(c); return c; });
      box.append(grid);
      const cycle = cards.length + 3;
      return { final: cards.length, step(t) { const k = t % cycle; cards.forEach((c, i) => c.classList.toggle('on', i < k)); } };
    },

    voice(box, labels) {
      const wave = h('div', 'vc-wave');
      for (let i = 0; i < 28; i++) wave.append(h('i'));
      const lines = h('div', 'vc-lines');
      box.append(wave, lines);
      const cycle = labels.length + 2;
      return {
        final: labels.length - 1,
        step(t) {
          const k = t % cycle;
          wave.classList.toggle('talk', k < labels.length);
          lines.textContent = '';
          for (let i = Math.max(0, k - 3); i <= Math.min(k, labels.length - 1); i++) lines.append(h('div', `lg-line${i === k ? ' new' : ''}`, labels[i]));
        },
      };
    },

    migrate(box, labels) {
      const wrap = h('div', 'mg');
      const left = h('div', 'mg-col');
      const right = h('div', 'mg-col');
      left.append(h('div', 'mg-h', 'Airtable'));
      right.append(h('div', 'mg-h', 'Postgres'));
      const from = labels.map((l) => { const r = h('div', 'mg-row', l); left.append(r); return r; });
      const to = labels.map((l) => { const r = h('div', 'mg-row', `${l} ✓`); r.hidden = true; right.append(r); return r; });
      wrap.append(left, right);
      box.append(wrap);
      const cycle = labels.length + 3;
      return {
        final: labels.length,
        step(t) {
          const k = t % cycle;
          from.forEach((r, i) => r.classList.toggle('gone', i < k));
          to.forEach((r, i) => { r.hidden = i >= k; r.classList.toggle('in', i === k - 1); });
        },
      };
    },

    form(box, labels) {
      const fm = h('div', 'fm');
      const fields = labels.slice(0, -1).map((l) => {
        const f = h('div', 'fm-field');
        f.append(h('span', 'fm-label', l), h('span', 'fm-bar'));
        fm.append(f);
        return f;
      });
      const result = h('div', 'fm-out', `✓ ${labels[labels.length - 1]}`);
      fm.append(result);
      box.append(fm);
      const cycle = fields.length + 4;
      return {
        final: fields.length + 1,
        step(t) {
          const k = t % cycle;
          fields.forEach((f, i) => f.classList.toggle('on', i < k));
          result.classList.toggle('on', k > fields.length);
        },
      };
    },
  };

  const loops = new Map();
  for (const box of document.querySelectorAll('.loop[data-loop]')) {
    const make = BUILDERS[box.dataset.loop];
    const labels = read(box);
    if (!make || !labels.length) continue;
    const loop = make(box, labels);
    loop.t = reduce ? loop.final : 0;
    loop.visible = !('IntersectionObserver' in window);
    loop.step(loop.t);
    loops.set(box, loop);
  }
  if (reduce || !loops.size) return;

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) loops.get(e.target).visible = e.isIntersecting;
    });
    for (const box of loops.keys()) io.observe(box);
  }
  setInterval(() => {
    if (document.hidden) return;
    for (const loop of loops.values()) if (loop.visible) loop.step(++loop.t);
  }, 1100);
})();
