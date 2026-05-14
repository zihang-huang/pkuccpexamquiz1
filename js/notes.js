import { renderMarkdown, splitSections, escapeHtml } from './md.js';
import { initSponsor } from './sponsor.js';
initSponsor();

let sections = [];
let activeIdx = 0;

async function load() {
  const res = await fetch('../2-补充知识点.md');
  if (!res.ok) throw new Error('无法加载知识点: ' + res.status);
  return res.text();
}

function renderTOC() {
  const toc = document.getElementById('toc');
  toc.innerHTML = sections.map((s, i) => `
    <a href="#" data-idx="${i}" class="${i === activeIdx ? 'active' : ''}">${escapeHtml(s.title)}</a>
  `).join('');
  toc.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      activeIdx = parseInt(a.dataset.idx, 10);
      renderTOC();
      renderContent();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function renderContent() {
  const sec = sections[activeIdx];
  if (!sec) return;
  const html = renderMarkdown(`## ${sec.title}\n${sec.body.join('\n')}`);
  document.getElementById('content').innerHTML = html;
}

(async () => {
  try {
    const md = await load();
    sections = splitSections(md).filter(s => s.title !== '前言');
    if (sections.length === 0) {
      document.getElementById('content').innerHTML = '<p>未解析到任何章节。</p>';
      return;
    }
    renderTOC();
    renderContent();
  } catch (e) {
    document.getElementById('content').innerHTML = `<p style="color:#c0392b;">加载失败: ${e.message}</p>`;
  }
})();
