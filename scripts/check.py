"""Check generated metadata, internal links, fragments and assets."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

root = Path(__file__).resolve().parents[1] / 'dist'
class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(); self.refs=[]; self.ids=set(); self.h1=0; self.description=False; self.canonical=False
        self.feed(path.read_text())
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a:
            assert a['id'] not in self.ids, f'Duplicate ID: {a["id"]}'
            self.ids.add(a['id'])
        self.h1 += tag == 'h1'
        self.description |= tag=='meta' and a.get('name')=='description' and bool(a.get('content'))
        self.canonical |= tag=='link' and a.get('rel')=='canonical'
        for key in ['href','src']:
            if a.get(key): self.refs.append(a[key])

pages={p:Page(p) for p in root.rglob('*.html')}
links=0
for path,page in pages.items():
    assert page.h1==1, f'{path}: expected exactly one h1'
    assert page.description and page.canonical, f'{path}: missing metadata'
    for ref in page.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc: continue
        target = root / unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path)
        if not url.path: target=path
        if target.is_dir(): target /= 'index.html'
        assert target.exists(), f'{path}: broken link {ref}'
        if url.fragment and target in pages:
            assert unquote(url.fragment) in pages[target].ids, f'{path}: missing anchor {ref}'
        links+=1
assert len(pages)==12, 'Expected 11 visitor pages and a 404 page'
assert (root/'sitemap.xml').exists() and (root/'robots.txt').exists()
print(f'PASS: {len(pages)} HTML documents; {links} internal links/assets; headings, descriptions, canonicals and anchors.')
