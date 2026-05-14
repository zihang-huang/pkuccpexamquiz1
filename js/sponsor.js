// 在右上角注入"赞助"按钮 + 弹窗
const TEXT = '如果友友们觉得有帮助可以给社团的兔兔捐点口粮（sponsor by 北京大学公益营建社·兔兔护理队）';

export function initSponsor() {
  // 注入按钮
  const nav = document.querySelector('header.topbar nav');
  const btn = document.createElement('button');
  btn.className = 'sponsor-btn';
  btn.type = 'button';
  btn.innerHTML = '🥕 赞助';
  if (nav) nav.appendChild(btn);
  else document.querySelector('header.topbar').appendChild(btn);

  // 注入弹窗 (默认隐藏)
  const overlay = document.createElement('div');
  overlay.className = 'sponsor-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="sponsor-modal" role="dialog" aria-modal="true" aria-labelledby="sponsor-title">
      <button class="sponsor-close" type="button" aria-label="关闭">✕</button>
      <h2 id="sponsor-title">赞助</h2>
      <p class="sponsor-text">${TEXT}</p>
      <div class="sponsor-images">
        <img src="src/tu.jpg" alt="兔兔">
        <img src="src/ma.jpg" alt="收款码">
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function open() { overlay.hidden = false; document.body.style.overflow = 'hidden'; }
  function close() { overlay.hidden = true; document.body.style.overflow = ''; }

  btn.addEventListener('click', open);
  overlay.querySelector('.sponsor-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });
}
