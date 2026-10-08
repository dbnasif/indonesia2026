# Versión web (Netlify + Supabase)

La app de `index.html` funciona en dos lugares:

- **Claude (artifact)**: usa la base de Claude. No requiere nada más.
- **Web (Netlify)**: la carpeta `site/` (generada con `python3 build.py`) agrega un login por mail y guarda todo en Supabase.

## Puesta en marcha (una sola vez)

1. **Supabase** → crear proyecto → *SQL Editor* → pegar y correr `supabase/schema.sql`, después `supabase/seed.sql`.
2. **Supabase → Authentication → URL Configuration**: *Site URL* = la URL de Netlify (y agregarla en *Redirect URLs*).
3. **Supabase → Authentication → Email Templates → Magic Link**: agregar `{{ .Token }}` al texto para que el mail traiga el código además del link.
4. **Supabase → Project Settings → API**: copiar *Project URL* y *anon public key* en `netlify/config.js`, y correr `python3 build.py`.
5. **Netlify** → *Add new site → Import from GitHub* → este repo y la rama elegida. *Publish directory*: `site` (ya está en `netlify.toml`).

## Cada vez que cambia `index.html`

`python3 build.py` y subir `site/` al repo; Netlify publica solo.
