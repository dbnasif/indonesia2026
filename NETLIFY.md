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

## Códigos privados (PNR, reservas, visas, seguro)

En `site/` esos códigos se publican como marcadores `⟪n⟫`. Los valores reales y los datos iniciales (`private/seed.json`) van cifrados en `site/privado.enc`. El primer login pide **una vez** la *frase de activación*: descifra, guarda todo en Firestore (`privado/codigos` y las colecciones de la app) y desde ahí cualquier celu logueado ve los códigos.

- Lista de códigos a ocultar: `private/secrets.json`.
- La frase **no está en el repo** (`private/frase.txt` está en `.gitignore`); para regenerar `site/` hace falta tenerla en ese archivo o en la variable `INDONESIA_FRASE`.
- `build.py` corta con error si algún código quedara visible en `site/`.

## Cada vez que cambia `index.html`

`python3 build.py` (necesita Node y la frase) y subir `site/` al repo; Netlify publica solo.
