#!/usr/bin/env python3
"""Reparses all flashcard sets against the current learned_characters.txt."""

import json
import glob
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
SETS_DIR = os.path.join(DATA_DIR, 'sets')
LEARNED_PATH = os.path.join(DATA_DIR, 'learned_characters.txt')

def is_chinese(char):
    code = ord(char)
    return (
        (0x4e00 <= code <= 0x9fff) or
        (0x3400 <= code <= 0x4dbf) or
        (0x20000 <= code <= 0x2a6df) or
        (0xf900 <= code <= 0xfaff)
    )

def reparse():
    with open(LEARNED_PATH, 'r', encoding='utf-8') as f:
        learned = set(f.read().strip())

    files = sorted(glob.glob(os.path.join(SETS_DIR, '*.json')))
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        cards = []
        for i, sentence in enumerate(data['sentences']):
            syllables = data['pinyin'][i].split()
            characters = []
            pi = 0
            for char in sentence:
                if is_chinese(char) and pi < len(syllables):
                    characters.append({
                        'char': char,
                        'pinyin': syllables[pi],
                        'learned': char in learned,
                    })
                    pi += 1
            cards.append({'sentence': sentence, 'characters': characters})

        data['cards'] = cards
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        name = os.path.basename(filepath)
        learned_count = sum(1 for c in cards for ch in c['characters'] if ch['learned'])
        total_count = sum(len(c['characters']) for c in cards)
        print(f'  {name}: {learned_count}/{total_count} characters learned')

    print(f'Reparsed {len(files)} set(s)')

if __name__ == '__main__':
    reparse()
