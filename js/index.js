import { loadBank } from './parser.js';
import { store } from './store.js';
import { initSponsor } from './sponsor.js';
initSponsor();

function chapterCard(ch, wrongIds) {
  const stats = store.getStats()[ch.id] || { right: 0, wrong: 0 };
  const seen = stats.right + stats.wrong;
  const total = ch.stats.total;
  const pct = total > 0 ? Math.round((seen / total) * 100) : 0;
  const acc = seen > 0 ? Math.round((stats.right / seen) * 100) : 0;
  const typeBits = [];
  if (ch.stats.single) typeBits.push(`单选 ${ch.stats.single}`);
  if (ch.stats.multi) typeBits.push(`多选 ${ch.stats.multi}`);
  if (ch.stats.judge) typeBits.push(`判断 ${ch.stats.judge}`);
  const chapterWrong = ch.questionIds.filter(id => wrongIds.has(id)).length;

  return `
    <div class="card-wrap">
      <a class="card" href="quiz.html?ch=${ch.id}">
        <div class="title">${ch.name}</div>
        <div class="meta">
          <span>共 <strong>${total}</strong> 题</span>
          ${typeBits.map(b => `<span>${b}</span>`).join('')}
        </div>
        <div class="card-spacer"></div>
        <div class="meta">
          <span>已答 ${seen} · 正确率 ${acc}%</span>
        </div>
        <div class="progress"><div style="width:${pct}%"></div></div>
      </a>
      <div class="card-actions">
        <a class="pill wrong-pill ${chapterWrong ? '' : 'empty'}"
           href="quiz.html?ch=${ch.id}&only=wrong"
           title="${chapterWrong ? '只刷本章错题' : '本章暂无错题'}">
          ❌ 错题 <strong>${chapterWrong}</strong>
        </a>
        <button class="pill reset-pill" data-ch="${ch.id}" title="清除本章顺序与统计">
          ↻ 重置
        </button>
      </div>
    </div>
  `;
}

function specialCard(href, title, sub, cls) {
  return `
    <div class="card-wrap">
      <a class="card ${cls}" href="${href}">
        <div class="title">${title}</div>
        <div class="meta"><span>${sub}</span></div>
      </a>
    </div>
  `;
}

async function main() {
  try {
    const { chapters, questions } = await loadBank();

    for (const ch of chapters) {
      ch.questionIds = questions.filter(q => q.chapter === ch.id).map(q => q.id);
    }

    const wrongIds = store.getWrong();
    const grid = document.getElementById('grid');
    grid.innerHTML = [
      ...chapters.map(ch => chapterCard(ch, wrongIds)),
      specialCard('notes.html', '📖 补充知识点', '《共产党宣言》/ 党章 / 二十大 / 易混点', 'special'),
    ].join('');

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.reset-pill');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const chId = btn.dataset.ch;
      const ch = chapters.find(c => c.id === chId);
      if (!ch) return;
      if (confirm(`确定清除「${ch.name}」的答题记录、统计与错题?\n清除后, 本章题目可重新作答。`)) {
        store.resetChapter(chId, ch.questionIds);
        location.reload();
      }
    });
  } catch (e) {
    document.getElementById('grid').innerHTML =
      `<div class="loading" style="color:#c0392b;">加载失败: ${e.message}<br><br>请通过 <code>start.sh</code> 启动本地服务器, 不要直接双击 html。</div>`;
  }
}

main();
