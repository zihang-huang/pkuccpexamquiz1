// localStorage 封装: 错题集 / 已答记录 / 设置

const K_WRONG = 'rudang.wrong';
const K_SEEN = 'rudang.seen';
const K_STATS = 'rudang.stats';
const K_SETTINGS = 'rudang.settings';

function readSet(key) {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(arr);
  } catch { return new Set(); }
}
function writeSet(key, set) {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

export const store = {
  getWrong() { return readSet(K_WRONG); },
  markWrong(id) {
    const s = readSet(K_WRONG); s.add(id); writeSet(K_WRONG, s);
  },
  unmarkWrong(id) {
    const s = readSet(K_WRONG); s.delete(id); writeSet(K_WRONG, s);
  },
  isWrong(id) { return readSet(K_WRONG).has(id); },

  getSeen() { return readSet(K_SEEN); },
  markSeen(id) {
    const s = readSet(K_SEEN); s.add(id); writeSet(K_SEEN, s);
  },

  getStats() {
    try { return JSON.parse(localStorage.getItem(K_STATS) || '{}'); }
    catch { return {}; }
  },
  recordAnswer(chapterId, correct) {
    const stats = store.getStats();
    if (!stats[chapterId]) stats[chapterId] = { right: 0, wrong: 0 };
    if (correct) stats[chapterId].right += 1;
    else stats[chapterId].wrong += 1;
    localStorage.setItem(K_STATS, JSON.stringify(stats));
  },

  getSettings() {
    try { return JSON.parse(localStorage.getItem(K_SETTINGS) || '{}'); }
    catch { return {}; }
  },
  setSetting(k, v) {
    const s = store.getSettings(); s[k] = v;
    localStorage.setItem(K_SETTINGS, JSON.stringify(s));
  },

  resetAll() {
    [K_WRONG, K_SEEN, K_STATS, K_SETTINGS].forEach(k => localStorage.removeItem(k));
    Object.keys(localStorage).filter(k => k.startsWith('rudang.session:')).forEach(k => localStorage.removeItem(k));
  },
  loadSession(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  },
  saveSession(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },
  clearSession(key) {
    localStorage.removeItem(key);
  },
  clearChapterSessions(chapterId) {
    const prefix = `rudang.session:${chapterId}`;
    Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
  },
  // 重置一个章节: 清统计 / 清 sessions / 把本章节题 id 从 seen 和 wrong 中移除
  resetChapter(chapterId, questionIds) {
    const stats = store.getStats();
    delete stats[chapterId];
    localStorage.setItem(K_STATS, JSON.stringify(stats));
    store.clearChapterSessions(chapterId);
    const seen = readSet(K_SEEN);
    const wrong = readSet(K_WRONG);
    for (const id of questionIds) { seen.delete(id); wrong.delete(id); }
    writeSet(K_SEEN, seen);
    writeSet(K_WRONG, wrong);
  },
};

export function sessionKey(chapterId, type, mode, onlyWrong) {
  return `rudang.session:${chapterId}${onlyWrong ? ':wrong' : ''}:${type}:${mode}`;
}

// Fisher–Yates 洗牌
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
