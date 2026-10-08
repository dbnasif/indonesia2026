"""Arma la versión web (carpeta site/) a partir de index.html, para Netlify.

index.html es la misma página que se publica en Claude (sin <html>/<head>
propios). Acá se le agrega el encabezado de una página normal y el login +
base de datos de Firebase (netlify/). Uso: python3 build.py
"""
import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
SITE = ROOT / "site"
PRIVATE = ROOT / "private"


def encrypt(payload, phrase):
    """AES-GCM con clave PBKDF2 de la frase (tools/encrypt.js); lo descifra netlify/firebase-db.js."""
    out = subprocess.run(["node", str(ROOT / "tools" / "encrypt.js"), phrase],
                         input=json.dumps(payload, ensure_ascii=False), capture_output=True, text=True, check=True)
    return json.loads(out.stdout)

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
<script src="firebase-app-compat.js"></script>
<script src="firebase-auth-compat.js"></script>
<script src="firebase-firestore-compat.js"></script>
<script src="config.js"></script>
<script src="firebase-db.js"></script>
</head>
<body>
"""


def main():
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir()
    page = (ROOT / "index.html").read_text(encoding="utf-8")
    # Códigos de reserva, PNR, visas y seguro: en la web van como marcadores ⟪n⟫ y
    # el valor real viaja cifrado (privado.enc) junto con los datos iniciales.
    codes = json.loads((PRIVATE / "secrets.json").read_text(encoding="utf-8"))
    order = sorted(range(len(codes)), key=lambda i: -len(codes[i]))
    for i in order:
        page = page.replace(codes[i], f"⟪{i}⟫")
    phrase = os.environ.get("INDONESIA_FRASE") or (PRIVATE / "frase.txt").read_text(encoding="utf-8").strip()
    seed = json.loads((PRIVATE / "seed.json").read_text(encoding="utf-8"))
    payload = {"codes": {str(i): c for i, c in enumerate(codes)}, "seed": seed}
    (SITE / "privado.enc").write_text(json.dumps(encrypt(payload, phrase)), encoding="utf-8")
    (SITE / "index.html").write_text(HEAD + page + "\n</body>\n</html>\n", encoding="utf-8")
    for f in ["xlsx.mini.min.js", "netlify/config.js", "netlify/firebase-db.js",
              "netlify/firebase-app-compat.js", "netlify/firebase-auth-compat.js", "netlify/firebase-firestore-compat.js"]:
        shutil.copy(ROOT / f, SITE / Path(f).name)
    # Control: ningún código puede quedar en claro en lo que se publica.
    leaks = [c for f in SITE.iterdir() if f.suffix in (".html", ".js", ".json")
             for c in codes if c in f.read_text(encoding="utf-8", errors="ignore")]
    if leaks:
        raise SystemExit(f"Quedaron códigos sin ocultar: {sorted(set(leaks))}")
    print("site/ listo")


if __name__ == "__main__":
    main()
