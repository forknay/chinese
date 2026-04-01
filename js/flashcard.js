const SRS = {
  queue: [],
  allCards: [],
  currentIndex: 0,
  stats: { studied: 0, flaggedChars: new Set() },

  init(cards) {
    this.allCards = cards;
    this.queue = cards.map(card => ({
      card,
      interval: 1,
      streak: 0,
    }));
    this.currentIndex = 0;
    this.stats = { studied: 0, flaggedChars: new Set() };
  },

  current() {
    return this.queue.length > 0 ? this.queue[0] : null;
  },

  handleAgain() {
    if (this.queue.length === 0) return;
    const item = this.queue.shift();
    item.interval = 1;
    item.streak = 0;
    // Insert 3 positions ahead (or at end if queue is short)
    const insertAt = Math.min(3, this.queue.length);
    this.queue.splice(insertAt, 0, item);
    this.stats.studied++;
  },

  handleGood() {
    if (this.queue.length === 0) return;
    const item = this.queue.shift();
    item.interval *= 2;
    item.streak++;
    const insertAt = Math.min(item.interval, this.queue.length);
    if (insertAt >= this.queue.length) {
      // Card is effectively done
    } else {
      this.queue.splice(insertAt, 0, item);
    }
    this.stats.studied++;
  },

  handleEasy() {
    if (this.queue.length === 0) return;
    this.queue.shift();
    this.stats.studied++;
  },

  requeueByCharacter(char) {
    this.stats.flaggedChars.add(char);
    const inQueue = new Set(this.queue.map(item => item.card.sentence));
    let count = 0;
    for (const card of this.allCards) {
      if (inQueue.has(card.sentence)) continue;
      const hasChar = card.characters.some(c => c.char === char);
      if (hasChar) {
        this.queue.push({ card, interval: 1, streak: 0 });
        inQueue.add(card.sentence);
        count++;
      }
    }
    return count;
  },

  isDone() {
    return this.queue.length === 0;
  },

  progress() {
    const total = this.allCards.length + this.queue.length - this.allCards.filter(
      c => this.queue.some(q => q.card.sentence === c.sentence)
    ).length;
    return {
      remaining: this.queue.length,
      total: Math.max(this.allCards.length, this.queue.length + this.stats.studied),
    };
  },
};

function renderCard(cardData, showAnswer, onCharClick) {
  const container = document.getElementById('card-display');
  container.innerHTML = '';

  const sentenceDiv = document.createElement('div');
  sentenceDiv.className = 'sentence';

  for (const ch of cardData.card.characters) {
    const ruby = document.createElement('ruby');
    ruby.className = 'character';
    if (ch.learned) ruby.classList.add('learned');

    const charSpan = document.createElement('span');
    charSpan.textContent = ch.char;
    ruby.appendChild(charSpan);

    const rt = document.createElement('rt');
    if (showAnswer || !ch.learned) {
      rt.textContent = ch.pinyin;
    }
    if (showAnswer && ch.learned) {
      rt.classList.add('revealed');
    }
    ruby.appendChild(rt);

    ruby.addEventListener('click', () => onCharClick(ch.char, ruby));
    sentenceDiv.appendChild(ruby);
  }

  // Also render non-Chinese chars (punctuation) from the original sentence
  const fullSentence = cardData.card.sentence;
  const charObjs = cardData.card.characters;
  let charIdx = 0;
  sentenceDiv.innerHTML = ''; // rebuild with punctuation

  for (const c of fullSentence) {
    if (isChinese(c) && charIdx < charObjs.length) {
      const ch = charObjs[charIdx];
      const ruby = document.createElement('ruby');
      ruby.className = 'character clickable';
      if (ch.learned) ruby.classList.add('learned');
      if (ruby.classList.contains('flagged')) ruby.classList.add('flagged');

      const charSpan = document.createElement('span');
      charSpan.textContent = ch.char;
      ruby.appendChild(charSpan);

      const rt = document.createElement('rt');
      if (showAnswer || !ch.learned) {
        rt.textContent = ch.pinyin;
      }
      if (showAnswer && ch.learned) {
        rt.classList.add('revealed');
      }
      ruby.appendChild(rt);

      ruby.addEventListener('click', () => onCharClick(ch.char, ruby));
      sentenceDiv.appendChild(ruby);
      charIdx++;
    } else {
      const span = document.createElement('span');
      span.className = 'punctuation';
      span.textContent = c;
      sentenceDiv.appendChild(span);
    }
  }

  container.appendChild(sentenceDiv);
}

function renderCompletion(stats) {
  const container = document.getElementById('card-display');
  container.innerHTML = `
    <div class="completion">
      <h2>Session Complete!</h2>
      <p>Cards studied: ${stats.studied}</p>
      <p>Characters flagged: ${stats.flaggedChars.size > 0 ? [...stats.flaggedChars].join(' ') : 'None'}</p>
    </div>
  `;
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
