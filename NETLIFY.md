# Versión web (Netlify + Firebase)

La app de `index.html` funciona en dos lugares:

- **Claude (artifact)**: usa la base de Claude.
- **Web (Netlify)**: la carpeta `site/` (generada con `python3 build.py`) agrega login con mail y contraseña y guarda todo en Firebase (Firestore), con modo sin conexión.

## Puesta en marcha (una sola vez)

1. **console.firebase.google.com** → *Agregar proyecto* (sin Google Analytics).
2. **Authentication** → *Comenzar* → activar **Correo electrónico/contraseña** → pestaña *Usuarios* → *Agregar usuario* para `danii.nasif@gmail.com` y `augustotraghetti@gmail.com`, cada uno con su contraseña.
3. **Firestore Database** → *Crear base de datos* → modo **producción** → pestaña *Reglas* → pegar `firestore.rules` → *Publicar*.
4. **Configuración del proyecto** (⚙️) → *Tus apps* → ícono **</>** (Web) → registrar → copiar el bloque `firebaseConfig` en `netlify/config.js` y correr `python3 build.py`.
5. **Netlify** → *Add new site → Import from GitHub* → este repo y la rama elegida (publica la carpeta `site`, ya configurado en `netlify.toml`).
6. **Authentication → Configuración → Dominios autorizados** → agregar el dominio de Netlify.

Al primer login se cargan solos los datos de `netlify/seed.json` (una sola vez).

## Cada vez que cambia `index.html`

`python3 build.py` y subir `site/` al repo; Netlify publica solo.
