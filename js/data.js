function nocache(url) {
  return url + '?t=' + Date.now();
}

async function loadIndex() {
  const resp = await fetch(nocache('data/index.json'));
  const data = await resp.json();
  return data.sets;
}

async function loadSet(filename) {
  const resp = await fetch(nocache(`data/sets/${filename}`));
  return resp.json();
}

async function loadLearnedCharacters() {
  const resp = await fetch(nocache('data/learned_characters.txt'));
  const text = await resp.text();
  return new Set(text.trim().split(''));
}
