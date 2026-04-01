function isChinese(char) {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||   // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) ||   // CJK Unified Ideographs Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Unified Ideographs Extension B
    (code >= 0xf900 && code <= 0xfaff)      // CJK Compatibility Ideographs
  );
}

function parseRawInput(jsonString, name, learnedSet) {
  const raw = JSON.parse(jsonString);
  const today = new Date().toISOString().slice(0, 10);

  const cards = [];
  for (let i = 0; i < raw.sentences.length; i++) {
    const sentence = raw.sentences[i];
    const pinyinSyllables = raw.pinyin[i].split(/\s+/);
    const characters = [];
    let pinyinIdx = 0;

    for (const char of sentence) {
      if (isChinese(char)) {
        characters.push({
          char: char,
          pinyin: pinyinSyllables[pinyinIdx] || '',
          learned: learnedSet.has(char),
        });
        pinyinIdx++;
      }
      // Skip punctuation, spaces, numbers — don't consume pinyin
    }

    cards.push({ sentence, characters });
  }

  return {
    name: name,
    created: today,
    sentences: raw.sentences,
    pinyin: raw.pinyin,
    cards: cards,
  };
}

function reparseSet(setJson, learnedSet) {
  const rebuilt = parseRawInput(
    JSON.stringify({ sentences: setJson.sentences, pinyin: setJson.pinyin }),
    setJson.name,
    learnedSet
  );
  rebuilt.created = setJson.created;
  return rebuilt;
}
