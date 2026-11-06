"""Deploy an already-reviewed dist build. No build or DNS changes are implicit.
NETLIFY_AUTH_TOKEN=... python scripts/deploy-netlify.py --site SITE_ID --title TITLE
Use --package-only to produce a reviewable ZIP without contacting Netlify.
"""
import argparse, hashlib, json, os, pathlib, sys, urllib.request, zipfile
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--site',default=os.environ.get('NETLIFY_SITE_ID'))
p.add_argument('--title',default='Heathrow Control — reviewed release')
p.add_argument('--package-only',action='store_true')
a=p.parse_args();root=pathlib.Path('dist');out=pathlib.Path('work/heathrow-release.zip')
for required in ['index.html','models.html','_headers','og.jpg']:
 if not (root/required).is_file():sys.exit(f'Missing dist/{required}; run npm run build first.')
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(root.rglob('*')):
  if f.is_file():z.write(f,f.relative_to(root))
print(json.dumps({'package':str(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}),flush=True)
if a.package_only:sys.exit(0)
token=os.environ.get('NETLIFY_AUTH_TOKEN')
if not a.site or not token:sys.exit('Set NETLIFY_AUTH_TOKEN and provide --site (or NETLIFY_SITE_ID).')
from urllib.parse import urlencode
url=f'https://api.netlify.com/api/v1/sites/{a.site}/deploys?'+urlencode({'title':a.title})
req=urllib.request.Request(url,data=out.read_bytes(),method='POST',headers={'Authorization':f'Bearer {token}','Content-Type':'application/zip'})
with urllib.request.urlopen(req,timeout=180) as response:d=json.load(response)
print(json.dumps({k:d.get(k) for k in ['id','state','url','ssl_url','deploy_ssl_url']}))
