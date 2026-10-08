// Versión web (Netlify) de la app: login por mail y base compartida en Supabase.
// Expone window.SUPA.db(), con la misma forma que usa la app (collection/doc/
// onSnapshot/set/delete), para que index.html no cambie entre Claude y Netlify.
(function () {
  const cfg = window.APP_CONFIG || {};
  if (!window.supabase || !cfg.url || cfg.url.startsWith('PEGAR')) return;
  const sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  });
  const allowed = (cfg.allowed || []).map(m => m.toLowerCase());

  // ── Login ─────────────────────────────────────────
  function loginScreen() {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'login-ov';
      ov.innerHTML = `<div class="login-box">
        <div class="login-h">🌏 Indonesia 2026</div>
        <p class="login-p">Entrá con tu mail. Te mandamos un código (o un link) para ingresar.</p>
        <input class="fi" id="lg-mail" type="email" inputmode="email" autocomplete="email" placeholder="tu@mail.com">
        <button class="add-g-btn" id="lg-send">Enviarme el código</button>
        <div id="lg-step2" hidden>
          <input class="fi" id="lg-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Código del mail">
          <button class="add-g-btn" id="lg-verify">Entrar</button>
        </div>
        <div class="login-msg" id="lg-msg" role="status"></div>
      </div>`;
      document.body.appendChild(ov);
      const $ = id => ov.querySelector('#' + id), msg = t => { $('lg-msg').textContent = t; };
      try { const last = localStorage.getItem('id26mail'); if (last) $('lg-mail').value = last; } catch (e) {}
      $('lg-send').onclick = async () => {
        const email = $('lg-mail').value.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) { msg('Escribí un mail válido.'); return; }
        if (allowed.length && !allowed.includes(email)) { msg('Este mail no tiene acceso a la app.'); return; }
        try { localStorage.setItem('id26mail', email); } catch (e) {}
        $('lg-send').disabled = true; msg('Enviando…');
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
        $('lg-send').disabled = false;
        if (error) { msg('No se pudo enviar: ' + error.message); return; }
        $('lg-step2').hidden = false; $('lg-code').focus();
        msg('Listo: revisá tu mail. Pegá el código acá, o tocá el link del mail.');
      };
      $('lg-verify').onclick = async () => {
        const email = $('lg-mail').value.trim().toLowerCase(), token = $('lg-code').value.trim();
        if (!token) { msg('Pegá el código del mail.'); return; }
        msg('Verificando…');
        const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
        if (error) msg('Código incorrecto o vencido. Pedí uno nuevo.');
      };
      const { data: sub } = sb.auth.onAuthStateChange((_ev, session) => {
        if (session) { sub.subscription.unsubscribe(); ov.remove(); resolve(session); }
      });
    });
  }
  async function ensureSession() {
    const { data } = await sb.auth.getSession();
    return data.session || loginScreen();
  }
  function addLogout(session) {
    const box = document.querySelector('#p-home .data-btns');
    if (!box || document.getElementById('lg-out')) return;
    const b = document.createElement('button');
    b.className = 'data-btn'; b.id = 'lg-out';
    b.textContent = '🚪 Salir (' + (session.user.email || '') + ')';
    b.onclick = async () => { await sb.auth.signOut(); location.reload(); };
    box.appendChild(b);
  }

  // ── Base de datos: tabla public.indonesia_docs (col, id, data) ─────────
  function makeDb() {
    const cache = {}, loaded = {}, colL = {}, docL = {};
    const meta = { fromCache: false, hasPendingWrites: false };
    const docSnap = (col, id) => { const d = cache[col] && cache[col].get(id); return { id, exists: !!d, data: () => d, metadata: meta }; };
    const colSnap = col => {
      const docs = [...(cache[col] || new Map()).keys()].map(id => docSnap(col, id));
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta };
    };
    const notify = col => {
      (colL[col] || new Set()).forEach(f => f(colSnap(col)));
      Object.entries(docL).forEach(([k, set]) => { if (k.startsWith(col + '/')) set.forEach(f => f(docSnap(col, k.slice(col.length + 1)))); });
    };
    const errOf = e => ({ code: e && (e.code === '42501' || /row-level security/i.test(e.message || '')) ? 'invalid_argument' : 'unavailable', message: (e && e.message) || 'error' });
    async function load(col, onErr) {
      const { data, error } = await sb.from('indonesia_docs').select('id,data').eq('col', col);
      if (error) { onErr && onErr(errOf(error)); return; }
      cache[col] = new Map(data.map(r => [r.id, r.data])); loaded[col] = true; notify(col);
    }
    // Cambios en vivo de la otra persona.
    sb.channel('indonesia-docs-live').on('postgres_changes', { event: '*', schema: 'public', table: 'indonesia_docs' }, p => {
      const row = p.eventType === 'DELETE' ? p.old : p.new;
      if (!row || !row.col || !cache[row.col]) return;
      if (p.eventType === 'DELETE') cache[row.col].delete(row.id); else cache[row.col].set(row.id, row.data);
      notify(row.col);
    }).subscribe();
    // Al volver a la app (el celu corta la conexión en segundo plano) se recarga todo.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) Object.keys(loaded).forEach(c => load(c)); });

    const docRef = (col, id) => ({
      id, path: col + '/' + id,
      async set(data) {
        (cache[col] = cache[col] || new Map()).set(id, data); notify(col);
        const { error } = await sb.from('indonesia_docs').upsert({ col, id, data, updated_at: new Date().toISOString() });
        if (error) { await load(col); throw errOf(error); }
      },
      async update(patch) { const cur = (cache[col] && cache[col].get(id)) || {}; return this.set({ ...cur, ...patch }); },
      async delete() {
        cache[col] && cache[col].delete(id); notify(col);
        const { error } = await sb.from('indonesia_docs').delete().eq('col', col).eq('id', id);
        if (error) { await load(col); throw errOf(error); }
      },
      onSnapshot(next, onErr) {
        const k = col + '/' + id; (docL[k] = docL[k] || new Set()).add(next);
        loaded[col] ? next(docSnap(col, id)) : load(col, onErr);
        return () => docL[k].delete(next);
      },
    });
    return {
      collection: col => ({
        path: col,
        doc: id => docRef(col, id),
        onSnapshot(next, onErr) {
          (colL[col] = colL[col] || new Set()).add(next);
          loaded[col] ? next(colSnap(col)) : load(col, onErr);
          return () => colL[col].delete(next);
        },
      }),
      doc: path => { const [col, id] = path.split('/'); return docRef(col, id); },
    };
  }

  window.SUPA = {
    client: sb,
    async db() { const s = await ensureSession(); addLogout(s); return makeDb(); },
  };
})();
