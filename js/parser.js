// 题库 markdown 解析器
// 输入: 1-题库.md 文本
// 输出: { chapters: [{id, name, types: {single, multi, judge}}], questions: [...] }

const TYPE_MAP = {
  '单选题': 'single',
  '多选题': 'multi',
  '判断题': 'judge',
};

export function parseQuestions(md) {
  const lines = md.split('\n');
  const questions = [];
  const chapters = [];
  let chapterIdx = 0;
  let chapter = null;          // {id, name}
  let type = null;              // 'single' | 'multi' | 'judge'
  let cur = null;               // 当前正在构建的题
  let qNumInSection = 0;

  function pushCur() {
    if (!cur) return;
    if (cur.answer && cur.answer.length) {
      if (cur.type === 'judge' && cur.options.length === 0) {
        cur.options = [{ key: '正确', text: '正确' }, { key: '错误', text: '错误' }];
      }
      // 标记残题(选项缺失)
      const missing = cur.options.some(o => /原题选项缺失|选项缺失/.test(o.text));
      cur.broken = missing || cur.options.length === 0;
      questions.push(cur);
    }
    cur = null;
  }

  for (let raw of lines) {
    const line = raw.replace(/\s+$/, '');
    // 章节: ## 第X课 ... / ## 综合练习 / ## 二十大专项训练
    let m = line.match(/^##\s+(.+)$/);
    if (m && !line.startsWith('###')) {
      pushCur();
      chapterIdx += 1;
      chapter = { id: `c${chapterIdx}`, name: m[1].trim() };
      chapters.push(chapter);
      type = null;
      qNumInSection = 0;
      continue;
    }
    // 题型: ### 单选题
    m = line.match(/^###\s+(单选题|多选题|判断题)\s*$/);
    if (m) {
      pushCur();
      type = TYPE_MAP[m[1]];
      qNumInSection = 0;
      continue;
    }
    if (!chapter || !type) continue;

    // 新题号开头: "1. xxx" / "12. xxx"
    m = line.match(/^(\d+)\.\s*(.*)$/);
    if (m) {
      pushCur();
      qNumInSection += 1;
      cur = {
        id: `${chapter.id}-${type}-${m[1]}`,
        chapter: chapter.id,
        chapterName: chapter.name,
        type,
        num: parseInt(m[1], 10),
        question: m[2] || '',
        options: [],
        answer: [],
      };
      continue;
    }
    // 选项: "A. xxx" / "B. xxx"
    m = line.match(/^([A-Z])\.\s*(.*)$/);
    if (m && cur) {
      cur.options.push({ key: m[1], text: m[2] });
      continue;
    }
    // 答案: 答案：X 或 答案：ABC 或 答案：正确
    m = line.match(/^答案[：:]\s*(.+)$/);
    if (m && cur) {
      let ans = m[1].trim();
      if (cur.type === 'judge') {
        if (/正确|对|√|T/i.test(ans)) cur.answer = ['正确'];
        else if (/错误|错|×|F/i.test(ans)) cur.answer = ['错误'];
        else cur.answer = [ans];
      } else if (cur.type === 'multi') {
        cur.answer = ans.replace(/[^A-Z]/g, '').split('');
      } else {
        const letters = ans.replace(/[^A-Z]/g, '').split('');
        cur.answer = letters.length ? [letters[0]] : [ans];
      }
      pushCur();
      continue;
    }
    // 续行: 题干跨多行 (markdown 行尾两空格)
    if (cur && cur.options.length === 0 && line.trim() && !line.startsWith('---')) {
      cur.question += (cur.question ? ' ' : '') + line.trim();
    }
  }
  pushCur();

  // 统计每章节题型数量
  const stats = {};
  for (const q of questions) {
    if (!stats[q.chapter]) stats[q.chapter] = { single: 0, multi: 0, judge: 0, total: 0 };
    stats[q.chapter][q.type] += 1;
    stats[q.chapter].total += 1;
  }
  for (const ch of chapters) {
    ch.stats = stats[ch.id] || { single: 0, multi: 0, judge: 0, total: 0 };
  }

  return { chapters, questions };
}

let _cache = null;
export async function loadBank() {
  if (_cache) return _cache;
  const res = await fetch('../1-题库.md');
  if (!res.ok) throw new Error('无法加载题库: ' + res.status);
  const md = await res.text();
  _cache = parseQuestions(md);
  return _cache;
}
