# PKU 初党结业考试复习面板

一个**纯前端、零后端**的刷题网站,为北京大学党课结业考试(单选/多选/判断)备考而做。

题库 487 道、补充知识点 8 章,直接从两份 markdown 实时解析,不需要任何构建步骤。
答题进度、错题集、章节统计全部存在每个访客自己的 `localStorage` 里 — 服务器没有数据库、没有账号、看不到也不存任何用户记录。

## 功能

- **按章节刷题** —— 7 个独立章节卡片(必读篇目 / 青年知识分子的成长 / 党史国史 / 一起读马克思 / 学习党章 / 综合练习 / 二十大专项),各自统计正确率与进度。
- **错题自动收集** —— 答错入错题集,答对自动消化。每个章节有独立的"刷本章错题"入口。
- **乱序全覆盖** —— 进入章节时 Fisher-Yates 洗牌一次,保证一轮内每题恰好出现一次;刷新、关闭、重开都不丢顺序。
- **正常模式不重复** —— 已答过的题在未重置前不会再出现,只在错题模式下复现。
- **一次记一次** —— 章节统计只算首答,在错题模式重复答同一题不会让数据虚高。
- **补充知识点页** —— 二十大、党章、《共产党宣言》要点、易混点等长文 markdown 渲染。
- **键盘快捷键** —— `A/B/C/D` 选项、`1/2` 判断对错、`Enter/空格` 下一题。

## 项目结构

```
study-app/
├── index.html           # 主页 - 章节卡片网格
├── quiz.html            # 刷题页 (?ch=cN[&only=wrong])
├── notes.html           # 补充知识点页
├── style.css
├── js/
│   ├── parser.js        # 题库 markdown 解析器
│   ├── md.js            # 极简 markdown 渲染 (用于知识点页)
│   ├── store.js         # localStorage 封装 (错题/已答/统计/session)
│   ├── index.js         # 主页逻辑
│   ├── quiz.js          # 刷题页逻辑
│   ├── notes.js         # 知识点页逻辑
│   └── sponsor.js       # 右上角赞助按钮 + 弹窗
├── src/                 # 赞助弹窗里的图片
├── start.sh             # 本地预览启动脚本 (python3 http.server)
└── build-deploy.sh      # 打包成自包含的 dist/pkuccpexamquiz1/ 目录
```

题库 (`1-题库.md`) 和补充知识点 (`2-补充知识点.md`) 不在仓库内,放在父目录 — `start.sh` 从父目录起服,以便页面通过 `../X.md` 拉到。

## 本地启动

把题库放到仓库父目录:

```
some-folder/
├── 1-题库.md
├── 2-补充知识点.md
└── study-app/         # 本仓库 clone 后的目录
```

然后:

```bash
cd study-app
bash start.sh
```

会自动启动 `python3 -m http.server 8765` 并打开浏览器到 `http://localhost:8765/study-app/`。`Ctrl+C` 关闭服务。

依赖: `python3`(macOS / 大多数 Linux 自带)。不需要 Node、不需要包管理器。

---

## 🥕 赞助

如果友友们觉得有帮助可以给社团的兔兔捐点口粮(sponsor by **北京大学公益营建社·兔兔护理队**)。

<p align="center">
  <img src="src/tu.jpg" alt="兔兔" width="320">
  <br><br>
  <img src="src/ma.jpg" alt="收款码" width="320">
</p>
