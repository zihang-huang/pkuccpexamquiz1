import { loadBank } from './parser.js';
import { store, shuffle, sessionKey } from './store.js';
import { initSponsor } from './sponsor.js';
initSponsor();

const TYPE_LABEL = { single: '单选', multi: '多选', judge: '判断' };

const state = {
  bank: null,
  chapterId: null,
  chapterName: '',
  onlyWrong: false,
  typeFilter: 'all',
  mode: 'shuffle',
  pool: [],         // 当前过滤后的题目数组
  order: [],        // id 顺序
  cursor: 0,
  rightThisRound: 0,
  answeredThisRound: 0,
  currentAnswered: false,
};

function $(sel) { return document.querySelector(sel); }
function getQuery() {
  const p = new URLSearchParams(location.search);
  return { ch: p.get('ch') || '', only: p.get('only') || '' };
}

function applyChapter() {
  const { questions, chapters } = state.bank;
  const ch = state.chapterId;
  const cObj = chapters.find(c => c.id === ch);
  state.chapterName = cObj ? cObj.name : ch;
  // 全 pool = 本章节所有题 (用于 session 校验; 不在此处排除 seen)
  state.pool = questions.filter(q => q.chapter === ch && !q.broken);
  if (state.onlyWrong) {
    const wrongIds = store.getWrong();
    state.pool = state.pool.filter(q => wrongIds.has(q.id));
    state.chapterName = '❌ ' + state.chapterName + ' · 错题';
  }
  if (state.typeFilter !== 'all') {
    state.pool = state.pool.filter(q => q.type === state.typeFilter);
  }
  $('#chapter-label').textContent = state.chapterName;
  $('#quiz-title').textContent = state.chapterName;
  document.title = state.chapterName + ' · 刷题';
}

// 用于"新建轮": 正常模式排除已答, 错题模式不排除
function freshCandidates() {
  if (state.onlyWrong) return state.pool;
  const seen = store.getSeen();
  return state.pool.filter(q => !seen.has(q.id));
}

function buildOrder() {
  const key = sessionKey(state.chapterId, state.typeFilter, state.mode, state.onlyWrong);
  const obj = store.loadSession(key);
  if (obj && Array.isArray(obj.order) && obj.order.length > 0) {
    // session 中的 order 是否全部仍在 pool 中? (中途回来续上, 即使部分已 seen)
    const poolIds = new Set(state.pool.map(q => q.id));
    const allValid = obj.order.every(id => poolIds.has(id));
    if (allValid) {
      state.order = obj.order;
      state.cursor = Math.min(obj.cursor || 0, state.order.length);
      state.rightThisRound = obj.right || 0;
      state.answeredThisRound = obj.answered || 0;
      return;
    }
  }
  // 新建一轮: 用 freshCandidates
  const ids = freshCandidates().map(q => q.id);
  if (state.mode === 'shuffle') shuffle(ids);
  state.order = ids;
  state.cursor = 0;
  state.rightThisRound = 0;
  state.answeredThisRound = 0;
  persistSession();
}

function persistSession() {
  const key = sessionKey(state.chapterId, state.typeFilter, state.mode, state.onlyWrong);
  store.saveSession(key, {
    order: state.order,
    cursor: state.cursor,
    right: state.rightThisRound,
    answered: state.answeredThisRound,
  });
}

function currentQuestion() {
  if (state.cursor >= state.order.length) return null;
  const id = state.order[state.cursor];
  return state.pool.find(q => q.id === id) || state.bank.questions.find(q => q.id === id);
}

function renderProgress() {
  const total = state.order.length;
  const done = state.cursor + (state.currentAnswered ? 1 : 0);
  $('#progress-fill').style.width = (total ? (done / total) * 100 : 0) + '%';
  $('#stat-cursor').textContent = Math.min(state.cursor + 1, total);
  $('#stat-total').textContent = total;
  const acc = state.answeredThisRound > 0 ? Math.round((state.rightThisRound / state.answeredThisRound) * 100) : null;
  $('#stat-acc').textContent = acc === null ? '—' : (acc + '%');
  $('#stat-wrong').textContent = store.getWrong().size;
}

function renderQuestion() {
  const q = currentQuestion();
  const area = $('#quiz-area');
  state.currentAnswered = false;

  if (!q) {
    renderDone();
    return;
  }

  if (q.type === 'judge') {
    area.innerHTML = `
      <div class="question-box">
        <div class="q-header">
          <span><span class="q-tag">${TYPE_LABEL[q.type]}</span>${q.chapterName} · 第 ${q.num} 题</span>
          <span>#${state.cursor + 1}</span>
        </div>
        <div class="q-text">${escapeHtml(q.question)}</div>
        <div class="judge-buttons">
          <button class="judge-btn correct-true" data-val="正确">✓ 正确</button>
          <button class="judge-btn correct-false" data-val="错误">✗ 错误</button>
        </div>
        <div class="feedback" id="fb"></div>
        <div class="actions">
          <button class="btn secondary" id="prev-btn">← 上一题</button>
          <button class="btn" id="next-btn" disabled>下一题 →</button>
        </div>
      </div>
    `;
    area.querySelectorAll('.judge-btn').forEach(b => {
      b.addEventListener('click', () => handleAnswer([b.dataset.val]));
    });
  } else {
    const inputType = q.type === 'single' ? 'radio' : 'checkbox';
    area.innerHTML = `
      <div class="question-box">
        <div class="q-header">
          <span><span class="q-tag">${TYPE_LABEL[q.type]}</span>${q.chapterName} · 第 ${q.num} 题</span>
          <span>#${state.cursor + 1}</span>
        </div>
        <div class="q-text">${escapeHtml(q.question)}</div>
        <div class="options">
          ${q.options.map(o => `
            <label class="option" data-key="${o.key}">
              <input type="${inputType}" name="opt" value="${o.key}">
              <span class="key">${o.key}.</span>
              <span>${escapeHtml(o.text)}</span>
            </label>
          `).join('')}
        </div>
        <div class="feedback" id="fb"></div>
        <div class="actions">
          <button class="btn secondary" id="prev-btn">← 上一题</button>
          ${q.type === 'multi' ? '<button class="btn" id="submit-btn">提交</button>' : ''}
          <button class="btn" id="next-btn" disabled>下一题 →</button>
        </div>
      </div>
    `;
    if (q.type === 'single') {
      area.querySelectorAll('.option').forEach(label => {
        label.addEventListener('click', () => {
          if (state.currentAnswered) return;
          handleAnswer([label.dataset.key]);
        });
      });
    } else {
      const submit = area.querySelector('#submit-btn');
      submit.addEventListener('click', () => {
        const picked = Array.from(area.querySelectorAll('input[name=opt]:checked')).map(i => i.value).sort();
        if (picked.length === 0) { alert('请至少选择一项'); return; }
        handleAnswer(picked);
      });
    }
  }

  area.querySelector('#prev-btn').addEventListener('click', () => {
    if (state.cursor > 0) { state.cursor -= 1; persistSession(); renderQuestion(); renderProgress(); }
  });
  area.querySelector('#next-btn').addEventListener('click', nextQuestion);

  renderProgress();
}

function handleAnswer(picked) {
  if (state.currentAnswered) return;
  state.currentAnswered = true;
  const q = currentQuestion();
  const expected = q.answer.slice().sort();
  const pickedSorted = picked.slice().sort();
  const correct = expected.length === pickedSorted.length &&
                  expected.every((v, i) => v === pickedSorted[i]);

  // 本轮计数始终推进 (本轮内的正确率/进度)
  state.answeredThisRound += 1;
  if (correct) state.rightThisRound += 1;

  const isFirstTime = !store.getSeen().has(q.id);
  if (isFirstTime) {
    // 首次回答: 计入章节统计, 标 seen, 答错则进错题集
    store.recordAnswer(q.chapter, correct);
    store.markSeen(q.id);
    if (!correct) store.markWrong(q.id);
  } else {
    // 重答 (主要发生在错题模式):
    //   答对 → 从错题集消化掉; 答错 → 啥都不动 (stats 不变, wrong 集不变)
    if (correct) store.unmarkWrong(q.id);
  }

  // 高亮
  if (q.type === 'judge') {
    document.querySelectorAll('.judge-btn').forEach(b => {
      b.classList.add('disabled');
      b.disabled = true;
      const v = b.dataset.val;
      if (q.answer.includes(v)) b.classList.add('answered-correct');
      if (picked.includes(v) && !q.answer.includes(v)) b.classList.add('answered-wrong');
    });
  } else {
    document.querySelectorAll('.option').forEach(label => {
      const k = label.dataset.key;
      label.classList.add('disabled');
      const input = label.querySelector('input');
      input.disabled = true;
      if (q.answer.includes(k)) label.classList.add('correct');
      if (picked.includes(k) && !q.answer.includes(k)) label.classList.add('wrong');
      if (picked.includes(k)) label.classList.add('selected');
    });
  }

  const fb = document.getElementById('fb');
  fb.classList.add('show');
  if (correct) {
    fb.classList.add('right');
    fb.innerHTML = `✓ 回答正确`;
  } else {
    fb.classList.add('wrong');
    fb.innerHTML = `✗ 回答错误 · <strong>正确答案: ${q.answer.join('')}</strong>`;
  }

  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) { nextBtn.disabled = false; nextBtn.focus(); }
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) submitBtn.style.display = 'none';

  persistSession();
  renderProgress();
}

function nextQuestion() {
  state.cursor += 1;
  persistSession();
  if (state.cursor >= state.order.length) renderDone();
  else { renderQuestion(); renderProgress(); }
}

function renderDone() {
  const total = state.order.length;
  const right = state.rightThisRound;
  const answered = state.answeredThisRound;
  const acc = answered > 0 ? Math.round(right / answered * 100) : 0;

  // 一轮结束: 根据当前 seen/wrong 重新计算可刷题数
  applyChapter();
  const fresh = freshCandidates();
  const chapterWrong = state.bank.questions.filter(q =>
    q.chapter === state.chapterId && !q.broken && store.getWrong().has(q.id)
  ).length;

  let restartHtml = '';
  let extraMsg = '';
  if (fresh.length > 0) {
    restartHtml = `<button class="btn" id="restart-btn">再来一轮 (${fresh.length} 题)</button>`;
  } else if (state.onlyWrong) {
    extraMsg = '<p style="color:var(--green); font-size:15px; margin: 8px 0;">🎉 错题已全部消化完毕</p>';
  } else {
    extraMsg = '<p style="color:var(--muted); font-size:14px; margin: 8px 0;">本章节已全部答完 — 在主页点「↻ 重置」可重新开始</p>';
  }
  const goWrongBtn = (!state.onlyWrong && chapterWrong > 0)
    ? `<a class="btn secondary" href="quiz.html?ch=${state.chapterId}&only=wrong">刷本章错题 (${chapterWrong})</a>`
    : '';

  document.getElementById('quiz-area').innerHTML = `
    <div class="question-box" style="text-align:center;">
      <h2 style="color:var(--green); margin-bottom:8px;">🎉 本轮完成</h2>
      <div style="font-size:42px; font-weight:700; color:var(--red-dark); margin:14px 0;">
        ${right} / ${answered}
      </div>
      <div style="color:var(--muted); margin-bottom:8px;">本轮正确率 ${acc}% · 共 ${total} 题</div>
      ${extraMsg}
      <div class="actions" style="justify-content:center; flex-wrap:wrap;">
        ${restartHtml}
        <a class="btn secondary" href="index.html">返回主页</a>
        ${goWrongBtn}
      </div>
    </div>
  `;
  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      const key = sessionKey(state.chapterId, state.typeFilter, state.mode, state.onlyWrong);
      store.clearSession(key);
      buildOrder();      // 用 freshCandidates 建新轮
      renderQuestion();
      renderProgress();
    });
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function bindBars() {
  document.querySelectorAll('#type-tabs .tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('#type-tabs .tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      state.typeFilter = t.dataset.type;
      applyChapter();
      buildOrder();
      renderQuestion();
      renderProgress();
    });
  });
  document.querySelectorAll('#mode-tabs .tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('#mode-tabs .tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      state.mode = t.dataset.mode;
      // 切模式时清掉旧 session 重新洗
      const key = sessionKey(state.chapterId, state.typeFilter, state.mode, state.onlyWrong);
      store.clearSession(key);
      buildOrder();
      renderQuestion();
      renderProgress();
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const q = currentQuestion();
    if (!q) return;
    if (e.key === ' ' || e.key === 'Enter') {
      const btn = document.getElementById('next-btn');
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); return; }
      const submit = document.getElementById('submit-btn');
      if (submit && e.key === 'Enter') { e.preventDefault(); submit.click(); return; }
    }
    if (state.currentAnswered) return;
    if (q.type === 'single' || q.type === 'multi') {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key) && q.options.some(o => o.key === key)) {
        if (q.type === 'single') handleAnswer([key]);
        else {
          const input = document.querySelector(`.option[data-key="${key}"] input`);
          if (input) input.checked = !input.checked;
        }
      }
    } else if (q.type === 'judge') {
      if (e.key === '1' || e.key.toLowerCase() === 't') handleAnswer(['正确']);
      if (e.key === '2' || e.key.toLowerCase() === 'f') handleAnswer(['错误']);
    }
  });
}

async function main() {
  try {
    state.bank = await loadBank();
    const { ch, only } = getQuery();
    if (!ch) { location.href = 'index.html'; return; }
    state.chapterId = ch;
    state.onlyWrong = (only === 'wrong');
    applyChapter();
    buildOrder();
    bindBars();
    if (state.order.length === 0) {
      $('#chapter-label').textContent = state.chapterName || '—';
      const chapterWrong = state.bank.questions.filter(q =>
        q.chapter === state.chapterId && !q.broken && store.getWrong().has(q.id)
      ).length;
      let msg, extra = '';
      if (state.onlyWrong) {
        msg = '本章节暂无错题 — 先去章节里做几道再来。';
      } else {
        msg = '本章节已全部答完 — 想再做一遍,请在主页点「↻ 重置」。';
        if (chapterWrong > 0) {
          extra = `<a class="btn secondary" href="quiz.html?ch=${state.chapterId}&only=wrong">刷本章错题 (${chapterWrong})</a>`;
        }
      }
      $('#quiz-area').innerHTML = `<div class="question-box" style="text-align:center;">
        <h2 style="color:var(--muted);">🎯 没有可刷题目</h2>
        <p>${msg}</p>
        <div class="actions" style="justify-content:center; flex-wrap:wrap;">
          <a class="btn" href="index.html">返回主页</a>
          ${extra}
        </div>
      </div>`;
      return;
    }
    renderQuestion();
    renderProgress();
  } catch (e) {
    $('#quiz-area').innerHTML = `<div class="question-box" style="color:#c0392b;">加载失败: ${e.message}</div>`;
  }
}

main();
