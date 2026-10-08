// Versión web (Netlify) de la app: login con mail y contraseña y base compartida
// en Firebase (Firestore). Expone window.WEBDB.db() con la forma que usa la app
// (collection/doc/onSnapshot/set/delete), así index.html no cambia entre Claude y la web.
(function () {
  const cfg = window.APP_CONFIG || {};
  if (!window.firebase || !cfg.firebase || cfg.firebase.apiKey === 'PEGAR') return;
  firebase.initializeApp(cfg.firebase);
  const auth = firebase.auth(), fs = firebase.firestore();
  // Funciona sin conexión: los cambios quedan en el celu y se suben al volver la señal.
  fs.enablePersistence({ synchronizeTabs: true }).catch(() => {});
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
  }

  // ── Datos iniciales: se cargan una sola vez si la base está vacía ───
  async function seedOnce() {
    const flag = fs.doc('config/seeded');
    if ((await flag.get()).exists) return;
    const seed = await fetch('seed.json').then(r => r.ok ? r.json() : []).catch(() => []);
    const batch = fs.batch();
    seed.forEach(r => batch.set(fs.collection(r.col).doc(r.id), r.data));
    batch.set(flag, { at: Date.now(), docs: seed.length });
    await batch.commit();
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
      try { await seedOnce(); } catch (e) { console.warn('seed', e); }
      return db;
    },
  };
})();
