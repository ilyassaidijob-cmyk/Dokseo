"""Builds a single-file browser version of Dokseo (dist-web/dokseo.html) for sharing as a link."""
import base64, os, re
ROOT = os.path.join(os.path.dirname(__file__), '..')
A = lambda *p: os.path.join(ROOT, 'app', *p)
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
html = open(A('index.html')).read()
css = open(A('style.css')).read()
css = re.sub(r"@font-face \{[^}]*\}\n", "", css)
logo = 'data:image/png;base64,' + b64(A('logo.png'))
body = html.split('<body data-screen="menu">', 1)[1].split('<script src="vendor/pdf.min.js"></script>', 1)[0]
body = body.replace('src="logo.png"', f'src="{logo}"')
js = ''.join(open(A('js', f)).read() + '\n' for f in ['util.js', 'audio.js', 'art.js', 'items.js', 'world.js', 'reader.js', 'ui.js', 'main.js'])
CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/'
out = f'''<title>Dokseo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;700&display=swap">
<style>
{css}
</style>
{body}
<script src="{CDN}pdf.min.js"></script>
<script>window.DOKSEO_WEB = true; window.DOKSEO_WORKER = "{CDN}pdf.worker.min.js"; window.DOKSEO_STARTER_B64 = "{b64(A('starter', 'welcome.pdf'))}";</script>
<script>
{js}
</script>
'''
os.makedirs(os.path.join(ROOT, 'dist-web'), exist_ok=True)
open(os.path.join(ROOT, 'dist-web', 'dokseo.html'), 'w').write(out)
print('dist-web/dokseo.html', len(out) // 1024, 'KB')
