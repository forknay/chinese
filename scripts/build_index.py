#!/usr/bin/env python3
"""Scans data/sets/*.json and writes data/index.json."""

import json
import glob
import os

SETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'sets')
INDEX_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'index.json')

def build_index():
    sets = []
    for filepath in sorted(glob.glob(os.path.join(SETS_DIR, '*.json'))):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        sets.append({
            'name': data.get('name', os.path.splitext(os.path.basename(filepath))[0]),
            'file': os.path.basename(filepath),
            'created': data.get('created', ''),
        })
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump({'sets': sets}, f, ensure_ascii=False, indent=2)
    print(f'Built index with {len(sets)} set(s)')

if __name__ == '__main__':
    build_index()
