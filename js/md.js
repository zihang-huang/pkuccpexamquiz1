// 极简 markdown 渲染: 处理 # ## ### #### 标题, ul/ol 列表, **粗体**, 段落, 表格, 引用
// 用于 2-补充知识点.md

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function inline(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^\w])\*([^*\n]+)\*(?=[^\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

/**
 * Tokenize lines into blocks. Each block is:
 *   {type:'h', level, text}
 *   {type:'p', lines: string[]}       // 段内多行 → <br> 分隔
 *   {type:'ul', items: [{lines:[], value?}]}
 *   {type:'ol', items: [{lines:[], value?}], start?}
 *   {type:'hr'}
 *   {type:'quote', lines}
 *   {type:'table', header:[], rows:[[]]}
 */
function tokenize(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;

  function peek(k) { return lines[i + (k || 0)] || ''; }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行
    if (!trimmed) { i++; continue; }

    // ATX 标题
    let m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) { blocks.push({ type: 'h', level: m[1].length, text: m[2] }); i++; continue; }

    // 水平线
    if (/^-{3,}\s*$/.test(trimmed)) { blocks.push({ type: 'hr' }); i++; continue; }

    // 引用
    if (/^>\s+/.test(line)) {
      const qLines = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        qLines.push(lines[i].replace(/^>\s+/, ''));
        i++;
      }
      blocks.push({ type: 'quote', lines: qLines });
      continue;
    }

    // 表格
    if (/^\|.*\|\s*$/.test(trimmed) && /^\|[\s:|\-]+\|\s*$/.test((peek(1) || '').trim())) {
      const header = trimmed.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const rows = [];
      i += 2;
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i].trim())) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
        i++;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // 有序列表 (1. text)
    m = line.match(/^(\d+)\.\s+(.+)$/);
    if (m) {
      const items = [];
      let start = parseInt(m[1], 10);
      while (i < lines.length) {
        const ln = lines[i];
        const lm = ln.match(/^(\d+)\.\s+(.+)$/);
        if (lm) {
          items.push({ value: parseInt(lm[1], 10), lines: [lm[2]] });
          i++;
          // 续行: 缩进 2+ 空格 或 非列表非空非标题, 但若是空行 + 下一行还是数字列表项则继续整体
          while (i < lines.length) {
            const next = lines[i];
            if (/^\s{2,}\S/.test(next)) {
              items[items.length - 1].lines.push(next.trim());
              i++;
            } else break;
          }
          // 跳过空行, 但仅当下一非空行还是有序列表项
          let j = i;
          while (j < lines.length && lines[j].trim() === '') j++;
          if (j < lines.length && /^\d+\.\s+/.test(lines[j])) { i = j; continue; }
          break;
        } else break;
      }
      blocks.push({ type: 'ol', items, start });
      continue;
    }

    // 无序列表 (- text 或 * text)
    if (/^[\-\*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        const ln = lines[i];
        const lm = ln.match(/^[\-\*]\s+(.+)$/);
        if (lm) {
          items.push({ lines: [lm[1]] });
          i++;
          while (i < lines.length) {
            const next = lines[i];
            if (/^\s{2,}\S/.test(next)) {
              items[items.length - 1].lines.push(next.trim());
              i++;
            } else break;
          }
          let j = i;
          while (j < lines.length && lines[j].trim() === '') j++;
          if (j < lines.length && /^[\-\*]\s+/.test(lines[j])) { i = j; continue; }
          break;
        } else break;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // 段落: 收集到空行/标题/列表/水平线为止
    const pLines = [];
    while (i < lines.length) {
      const ln = lines[i];
      const tr = ln.trim();
      if (!tr) break;
      if (/^(#{1,6})\s+/.test(ln)) break;
      if (/^-{3,}\s*$/.test(tr)) break;
      if (/^[\-\*]\s+/.test(ln)) break;
      if (/^\d+\.\s+/.test(ln)) break;
      if (/^>\s+/.test(ln)) break;
      if (/^\|.*\|\s*$/.test(tr) && /^\|[\s:|\-]+\|\s*$/.test((peek(1) || '').trim())) break;
      pLines.push(tr);
      i++;
    }
    if (pLines.length) blocks.push({ type: 'p', lines: pLines });
  }

  return blocks;
}

function renderBlocks(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.type === 'h') {
      const id = 'h-' + b.text.replace(/[^\w一-龥]/g, '').slice(0, 30);
      out.push(`<h${b.level} id="${id}">${inline(b.text)}</h${b.level}>`);
    } else if (b.type === 'hr') {
      out.push('<hr>');
    } else if (b.type === 'p') {
      // 段内多行用 <br> 分隔, 保留作者的视觉换行
      out.push('<p>' + b.lines.map(inline).join('<br>') + '</p>');
    } else if (b.type === 'quote') {
      out.push('<blockquote>' + b.lines.map(inline).join('<br>') + '</blockquote>');
    } else if (b.type === 'table') {
      const head = '<thead><tr>' + b.header.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead>';
      const body = '<tbody>' + b.rows.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>';
      out.push(`<table>${head}${body}</table>`);
    } else if (b.type === 'ul') {
      out.push('<ul>' + b.items.map(it => `<li>${it.lines.map(inline).join('<br>')}</li>`).join('') + '</ul>');
    } else if (b.type === 'ol') {
      // 用 start 还原起始号; 若每项有显式 value 也带上
      const attr = b.start && b.start !== 1 ? ` start="${b.start}"` : '';
      const itemsHtml = b.items.map(it => {
        const v = it.value && it.value !== (b.items.indexOf(it) + b.start) ? ` value="${it.value}"` : '';
        return `<li${v}>${it.lines.map(inline).join('<br>')}</li>`;
      }).join('');
      out.push(`<ol${attr}>${itemsHtml}</ol>`);
    }
  }
  return out.join('\n');
}

export function renderMarkdown(md) {
  return renderBlocks(tokenize(md));
}

// 从 markdown 文本中按二级标题 ## 切分为 sections
export function splitSections(md) {
  const lines = md.split('\n');
  const sections = [];
  let cur = { title: '前言', body: [] };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m && !line.startsWith('###')) {
      if (cur.body.length) sections.push(cur);
      cur = { title: m[1], body: [] };
    } else {
      cur.body.push(line);
    }
  }
  if (cur.body.length) sections.push(cur);
  return sections;
}
