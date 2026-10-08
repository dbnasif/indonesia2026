"""Arma la versión web (carpeta site/) a partir de index.html, para Netlify.

index.html es la misma página que se publica en Claude (sin <html>/<head>
propios). Acá se le agrega el encabezado de una página normal y el login +
base de datos de Supabase (netlify/). Uso: python3 build.py
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
SITE = ROOT / "site"

HEAD = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0e1117">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Indonesia 2026">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌏</text></svg>">
<style>
/* Lo que en Claude agrega el marco de la página. */
[hidden]{display:none!important}
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
/* Pantalla de login */
.login-ov{position:fixed;inset:0;z-index:100;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:16px}
.login-box{width:100%;max-width:360px;background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);padding:20px;display:flex;flex-direction:column;gap:10px}
.login-h{font-size:20px;font-weight:800}
.login-p,.login-msg{font-size:13px;color:var(--mu);line-height:1.5}
#lg-step2{display:flex;flex-direction:column;gap:10px}
</style>
<script src="supabase.js"></script>
<script src="config.js"></script>
<script src="supabase-db.js"></script>
</head>
<body>
"""


def main():
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir()
    page = (ROOT / "index.html").read_text(encoding="utf-8")
    (SITE / "index.html").write_text(HEAD + page + "\n</body>\n</html>\n", encoding="utf-8")
    for f in ["xlsx.mini.min.js", "netlify/config.js", "netlify/supabase-db.js", "netlify/supabase.js"]:
        shutil.copy(ROOT / f, SITE / Path(f).name)
    print("site/ listo")


if __name__ == "__main__":
    main()
