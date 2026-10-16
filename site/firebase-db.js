// Versión web (Netlify) de la app: login con mail y contraseña y base compartida
// en Firebase (Firestore). Expone window.WEBDB.db() con la forma que usa la app
// (collection/doc/onSnapshot/set/delete), así index.html no cambia entre Claude y la web.
(function () {
  const cfg = window.APP_CONFIG || {};
  if (!window.firebase || !cfg.firebase || cfg.firebase.apiKey === 'PEGAR') return;
  firebase.initializeApp(cfg.firebase);
  const auth = firebase.auth(), fs = firebase.firestore();
  // Funciona sin conexión: los cambios quedan en el celu y se suben al volver la señal.
  // Si el navegador no soporta varias pestañas compartiendo la copia, se usa una sola.
  fs.enablePersistence({ synchronizeTabs: true })
    .catch(e => { console.warn('persistencia', e && e.code); return fs.enablePersistence(); })
    .catch(e => console.warn('persistencia', e && e.code));
  const allowed = (cfg.allowed || []).map(m => m.toLowerCase());

  // ── Login (una vez por celular: la sesión queda guardada) ─────────
  function loginScreen() {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'login-ov';
      ov.innerHTML = `<form class="login-box" autocomplete="on">
        <div class="login-h">🌏 Indonesia 2026</div>
        <p class="login-p">Entrá una sola vez: el celu queda logueado.</p>
        <input class="fi" id="lg-mail" name="email" type="email" inputmode="email" autocomplete="username" placeholder="tu@mail.com" required>
        <input class="fi" id="lg-pass" name="password" type="password" autocomplete="current-password" placeholder="Contraseña" required>
        <button class="add-g-btn" id="lg-go" type="submit">Entrar</button>
        <button class="cbtn" id="lg-reset" type="button">Olvidé la contraseña</button>
        <div class="login-msg" id="lg-msg" role="status"></div>
      </form>`;
      document.body.appendChild(ov);
      const $ = id => ov.querySelector('#' + id), msg = t => { $('lg-msg').textContent = t; };
      try { const last = localStorage.getItem('id26mail'); if (last) $('lg-mail').value = last; } catch (e) {}
      const mail = () => $('lg-mail').value.trim().toLowerCase();
      ov.querySelector('form').onsubmit = async ev => {
        ev.preventDefault();
        if (allowed.length && !allowed.includes(mail())) { msg('Este mail no tiene acceso a la app.'); return; }
        try { localStorage.setItem('id26mail', mail()); } catch (e) {}
        $('lg-go').disabled = true; msg('Entrando…');
        try { await auth.signInWithEmailAndPassword(mail(), $('lg-pass').value); }
        catch (e) {
          $('lg-go').disabled = false;
          msg(/wrong-password|invalid-credential|user-not-found|invalid-login/.test(e.code || '') ? 'Mail o contraseña incorrectos.' :
              /too-many-requests/.test(e.code || '') ? 'Demasiados intentos. Esperá unos minutos.' : 'No se pudo entrar: ' + (e.message || e.code));
        }
      };
      $('lg-reset').onclick = async () => {
        if (!mail()) { msg('Escribí tu mail arriba.'); return; }
        try { await auth.sendPasswordResetEmail(mail()); msg('Te mandamos un mail para elegir una contraseña nueva.'); }
        catch (e) { msg('No se pudo enviar el mail: ' + (e.message || e.code)); }
      };
      const off = auth.onAuthStateChanged(u => { if (u) { off(); ov.remove(); resolve(u); } });
    });
  }
  const currentUser = () => new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
  function addLogout(user) {
    const box = document.querySelector('#p-home .data-btns');
    if (!box || document.getElementById('lg-out')) return;
    const b = document.createElement('button');
    b.className = 'data-btn'; b.id = 'lg-out';
    b.textContent = '🚪 Salir (' + (user.email || '') + ')';
    b.onclick = async () => { await auth.signOut(); location.reload(); };
    box.appendChild(b);
    // Versión publicada: sirve para saber si el celu tiene la última o una vieja guardada.
    if (window.APP_BUILD) {
      const v = document.createElement('p');
      v.className = 'login-p'; v.style.width = '100%';
      v.textContent = 'Versión de la app: ' + window.APP_BUILD;
      box.appendChild(v);
    }
  }

  // ── Códigos privados y datos iniciales ────────────────────────
  // La página publicada tiene marcadores ⟪n⟫ en lugar de PNR, reservas, visas y
  // seguro. Los valores reales viven en privado/codigos (solo con login). La primera
  // vez se cargan desde privado.enc con la frase de activación, junto con los datos.
  const MARK = /⟪(\d+)⟫/g;
  let CODES = null;
  const unmaskStr = v => v.replace(MARK, (m, i) => (CODES && CODES[i] != null ? CODES[i] : m));
  function unmask(root) {
    if (!CODES || !root) return;
    // Solo se escribe si cambia: reescribir el mismo texto dispara el observer otra vez
    // y, con un marcador sin código conocido, la página quedaba en un bucle infinito.
    if (root.nodeType === 3) { const v = unmaskStr(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1) return;
    const walk = el => {
      for (const a of Array.from(el.attributes || [])) { if (a.value.includes('⟪')) { const v = unmaskStr(a.value); if (v !== a.value) el.setAttribute(a.name, v); } }
      for (const n of Array.from(el.childNodes)) n.nodeType === 3 ? unmask(n) : n.nodeType === 1 && walk(n);
    };
    walk(root);
  }
  function startUnmask(codes) {
    CODES = codes; unmask(document.body);
    new MutationObserver(ms => ms.forEach(m => {
      if (m.type === 'childList') m.addedNodes.forEach(unmask);
      else if (m.type === 'characterData') unmask(m.target);
      else if (m.type === 'attributes' && m.target.getAttribute(m.attributeName)?.includes('⟪')) unmask(m.target);
    })).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
  }
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function decrypt(phrase) {
    const box = await fetch('privado.enc').then(r => r.json());
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(phrase), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(box.salt), iterations: box.iters, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  async function activate(payload) {
    const batch = fs.batch();
    if (!(await fs.doc('config/seeded').get()).exists) {
      payload.seed.forEach(r => batch.set(fs.collection(r.col).doc(r.id), r.data));
      batch.set(fs.doc('config/seeded'), { at: Date.now(), docs: payload.seed.length });
    }
    batch.set(fs.doc('privado/codigos'), payload.codes);
    await batch.commit();
  }
  function activationScreen(update) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'login-ov';
      ov.innerHTML = `<form class="login-box">
        <div class="login-h">🔐 ${update ? 'Hay códigos nuevos' : 'Activar la app'}</div>
        <p class="login-p">${update ? 'Se agregaron números de reserva. Lo hace una sola persona, una vez: escribí la frase de activación. Si no la tenés, tocá “Ahora no”.' : 'Solo una vez, para los dos: escribí la frase de activación. Carga los gastos y los códigos de reservas.'}</p>
        <input class="fi" id="ac-frase" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="palabra-palabra-palabra-palabra-123">
        <button class="add-g-btn" id="ac-go" type="submit">Activar</button>
        <button class="cbtn" id="ac-skip" type="button">Ahora no</button>
        <div class="login-msg" id="ac-msg" role="status"></div>
      </form>`;
      document.body.appendChild(ov);
      const $ = id => ov.querySelector('#' + id), msg = t => { $('ac-msg').textContent = t; };
      $('ac-skip').onclick = () => { ov.remove(); resolve(null); };
      ov.querySelector('form').onsubmit = async ev => {
        ev.preventDefault(); $('ac-go').disabled = true; msg('Activando…');
        try {
          const payload = await decrypt($('ac-frase').value.trim().toLowerCase());
          await activate(payload); ov.remove(); resolve(payload.codes);
        } catch (e) { $('ac-go').disabled = false; msg(e && e.name === 'OperationError' ? 'Frase incorrecta.' : 'No se pudo activar: ' + (e.message || e)); }
      };
    });
  }
  async function loadCodes() {
    const snap = await fs.doc('privado/codigos').get();
    if (!snap.exists) { const codes = await activationScreen(); if (codes) startUnmask(codes); return; }
    let codes = snap.data();
    // privado.enc trae más códigos que los guardados: se piden una vez (o hasta que
    // alguien los cargue; quien toca "Ahora no" no lo vuelve a ver por esta versión).
    let n = 0;
    try { n = (await fetch('privado.enc', { cache: 'no-cache' }).then(r => r.json())).n || 0; } catch (e) {}
    let skip = '';
    try { skip = localStorage.getItem('id26skip') || ''; } catch (e) {}
    if (n > Object.keys(codes).length && skip !== String(n)) {
      const nuevos = await activationScreen(true);
      if (nuevos) codes = nuevos;
      else { try { localStorage.setItem('id26skip', String(n)); } catch (e) {} }
    }
    startUnmask(codes);
  }

  // ── Adaptador: misma forma que la base de Claude ─────────
  const errOf = e => ({ code: e && e.code === 'permission-denied' ? 'invalid_argument' : 'unavailable', message: (e && e.message) || 'error' });
  const wrapDoc = ref => ({
    id: ref.id, path: ref.path,
    set: d => ref.set(d).catch(e => { throw errOf(e); }),
    update: d => ref.set(d, { merge: true }).catch(e => { throw errOf(e); }),
    delete: () => ref.delete().catch(e => { throw errOf(e); }),
    onSnapshot: (next, onErr) => ref.onSnapshot(next, e => onErr && onErr(errOf(e))),
    get: () => ref.get(),
  });
  const db = {
    collection: c => ({
      path: c,
      doc: id => wrapDoc(fs.collection(c).doc(id)),
      onSnapshot: (next, onErr) => fs.collection(c).onSnapshot(next, e => onErr && onErr(errOf(e))),
    }),
    doc: p => wrapDoc(fs.doc(p)),
  };

  window.WEBDB = {
    async db() {
      const user = (await currentUser()) || (await loginScreen());
      addLogout(user);
      try { await loadCodes(); } catch (e) { console.warn('codigos', e); }
      return db;
    },
  };
})();
