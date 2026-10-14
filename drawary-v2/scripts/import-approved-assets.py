#!/usr/bin/env python3
"""Import ONLY the user-approved Drawary assets. No files from any old GitHub app."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

EXPECTED_SHA='5af682379b673eabc2847acd85e58cd15f3d17b69645c036049002a9386a1ae4'
PREFIX='02A_ASSETS_FINAL_STRUCTURED/assets_app/'

def main():
    if len(sys.argv) != 2:
        sys.exit('Usage: python scripts/import-approved-assets.py <02A_DRAWARY_ASSETS_FINAL_STRUCTURED.zip>')
    source = Path(sys.argv[1]).resolve()
    if not source.is_file():
        sys.exit(f'File not found: {source}')
    sha = hashlib.sha256(source.read_bytes()).hexdigest()
    if sha != EXPECTED_SHA:
        sys.exit('Checksum mismatch: not the user-approved original asset archive')
    app_root = Path(__file__).resolve().parent.parent
    dest = app_root / 'public' / 'assets'
    records = []
    with ZipFile(source) as archive:
        for info in archive.infolist():
            if not info.filename.startswith(PREFIX) or info.is_dir():
                continue
            relative = Path(info.filename[len(PREFIX):])
            if relative.is_absolute() or '..' in relative.parts:
                sys.exit('Unsafe ZIP path')
            blob = archive.read(info)
            target = dest / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(blob)
            records.append({'path':(Path('public/assets')/relative).as_posix(),
                            'sha256':hashlib.sha256(blob).hexdigest(),'bytes':len(blob)})
    if len(records) != 294:
        sys.exit(f'Unexpected asset count: {len(records)}')
    output = app_root / 'docs' / 'verified-approved-asset-manifest.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'origin':'User-approved 02A ZIP; not old GitHub',
                                  'archiveSha256': EXPECTED_SHA,
                                  'assetCount': len(records),
                                  'assets': sorted(records,key=lambda x:x['path'])},
                                  indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print(f'PASS: {len(records)} original image assets restored under {dest}')

if __name__ == '__main__':
    main()
