const App = {
  currentView: 'home',
  showAnswer: false,

  showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    this.currentView = viewName;
  },

  async initHome() {
    this.showView('home');
    const setList = document.getElementById('set-list');
    setList.innerHTML = '<p>Loading...</p>';

    try {
      const learned = await loadLearnedCharacters();
      document.getElementById('learned-count').textContent =
        `${learned.size} characters learned`;

      const sets = await loadIndex();
      if (sets.length === 0) {
        setList.innerHTML = '<p class="empty-message">No flashcard sets yet. Add one to get started!</p>';
        return;
      }
      setList.innerHTML = '';
      for (const s of sets) {
        const item = document.createElement('div');
        item.className = 'set-item';
        item.innerHTML = `
          <span class="set-name">${s.name}</span>
          <span class="set-date">${s.created}</span>
        `;
        item.addEventListener('click', () => this.startStudy(s.file));
        setList.appendChild(item);
      }
    } catch (e) {
      setList.innerHTML = '<p class="error">Failed to load sets. Make sure you are running a local server.</p>';
    }
  },

  async startStudy(filename) {
    this.showView('study');
    this.showAnswer = false;
    const set = await loadSet(filename);
    SRS.init(set.cards);
    this.updateStudyView();
  },

  updateStudyView() {
    const btnContainer = document.getElementById('srs-buttons');
    const showBtn = document.getElementById('btn-show-answer');

    if (SRS.isDone()) {
      renderCompletion(SRS.stats);
      btnContainer.classList.add('hidden');
      showBtn.classList.add('hidden');
      document.getElementById('progress').textContent = '';
      return;
    }

    const current = SRS.current();
    this.showAnswer = false;
    renderCard(current, false, (char, el) => this.onCharClick(char, el));
    btnContainer.classList.add('hidden');
    showBtn.classList.remove('hidden');

    const prog = SRS.progress();
    document.getElementById('progress').textContent =
      `${prog.total - prog.remaining + 1} / ${prog.total}`;
  },

  revealAnswer() {
    this.showAnswer = true;
    const current = SRS.current();
    renderCard(current, true, (char, el) => this.onCharClick(char, el));
    document.getElementById('btn-show-answer').classList.add('hidden');
    document.getElementById('srs-buttons').classList.remove('hidden');
  },

  onSRS(action) {
    if (action === 'again') SRS.handleAgain();
    else if (action === 'good') SRS.handleGood();
    else if (action === 'easy') SRS.handleEasy();
    this.updateStudyView();
  },

  onCharClick(char, el) {
    el.classList.add('flagged');
    const count = SRS.requeueByCharacter(char);
    if (count > 0) {
      showToast(`Requeued ${count} card${count > 1 ? 's' : ''} with ${char}`);
    } else {
      showToast(`${char} — all cards already in queue`);
    }
    // Update progress display
    const prog = SRS.progress();
    document.getElementById('progress').textContent =
      `${prog.total - prog.remaining + 1} / ${prog.total}`;
  },

  showAddSet() {
    this.showView('addSet');
    document.getElementById('parse-output').textContent = '';
  },

  async parseAndDownload() {
    const jsonInput = document.getElementById('llm-input').value.trim();
    const name = document.getElementById('set-name').value.trim();
    const output = document.getElementById('parse-output');

    if (!jsonInput || !name) {
      output.textContent = 'Please enter both a set name and the LLM JSON output.';
      return;
    }

    try {
      const learnedSet = await loadLearnedCharacters();
      const parsed = parseRawInput(jsonInput, name, learnedSet);
      const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.json`;
      a.click();
      URL.revokeObjectURL(url);
      output.textContent = `Downloaded ${name}.json — move it to data/sets/ and run: python scripts/build_index.py`;
    } catch (e) {
      output.textContent = `Parse error: ${e.message}`;
    }
  },

  async reparseAllSets() {
    const output = document.getElementById('parse-output');
    output.textContent = 'Reparsing...';

    try {
      const learnedSet = await loadLearnedCharacters();
      const sets = await loadIndex();

      if (sets.length === 0) {
        output.textContent = 'No sets to reparse.';
        return;
      }

      for (const s of sets) {
        const setData = await loadSet(s.file);
        const reparsed = reparseSet(setData, learnedSet);
        const blob = new Blob([JSON.stringify(reparsed, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = s.file;
        a.click();
        URL.revokeObjectURL(url);
      }

      output.textContent = `Reparsed and downloaded ${sets.length} set(s). Replace the files in data/sets/.`;
    } catch (e) {
      output.textContent = `Reparse error: ${e.message}`;
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.initHome();

  document.getElementById('btn-add-set').addEventListener('click', () => App.showAddSet());
  document.getElementById('btn-show-answer').addEventListener('click', () => App.revealAnswer());
  document.getElementById('btn-again').addEventListener('click', () => App.onSRS('again'));
  document.getElementById('btn-good').addEventListener('click', () => App.onSRS('good'));
  document.getElementById('btn-easy').addEventListener('click', () => App.onSRS('easy'));
  document.getElementById('btn-parse').addEventListener('click', () => App.parseAndDownload());
  document.getElementById('btn-back-home-add').addEventListener('click', () => App.initHome());
  document.getElementById('btn-back-home-study').addEventListener('click', () => App.initHome());

  document.addEventListener('keydown', (e) => {
    if (App.currentView !== 'study' || SRS.isDone()) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (!App.showAnswer) {
      if (e.code === 'Space' || e.code === 'ArrowUp') App.revealAnswer();
    } else {
      if (e.code === 'ArrowRight') App.onSRS('easy');
      else if (e.code === 'ArrowDown') App.onSRS('good');
      else if (e.code === 'ArrowLeft') App.onSRS('again');
    }
  });
});
