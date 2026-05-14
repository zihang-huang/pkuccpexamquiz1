#!/bin/sh
# 打包成可上传到 VPS 的自包含目录
# 输出: dist/pkuccpexamquiz1/  ← 把这个整个目录上传到服务器
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
OUT="$SCRIPT_DIR/dist/pkuccpexamquiz1"

rm -rf "$SCRIPT_DIR/dist"
mkdir -p "$OUT"

# 1. 复制 app 文件
cp "$SCRIPT_DIR/index.html" "$OUT/"
cp "$SCRIPT_DIR/quiz.html" "$OUT/"
cp "$SCRIPT_DIR/notes.html" "$OUT/"
cp "$SCRIPT_DIR/style.css" "$OUT/"
cp -R "$SCRIPT_DIR/js" "$OUT/"
cp -R "$SCRIPT_DIR/src" "$OUT/"

# 2. 复制题库与知识点 (来自父目录)
cp "$PARENT_DIR/1-题库.md" "$OUT/"
cp "$PARENT_DIR/2-补充知识点.md" "$OUT/"

# 3. 修补 fetch 路径: '../X.md' → './X.md' (因为部署后 md 与 html 同级)
sed -i.bak "s|fetch('\\.\\./1-题库.md')|fetch('./1-题库.md')|g" "$OUT/js/parser.js"
sed -i.bak "s|fetch('\\.\\./2-补充知识点.md')|fetch('./2-补充知识点.md')|g" "$OUT/js/notes.js"
rm -f "$OUT/js"/*.bak

# 4. start.sh 部署后用不到, 移除
# (留着不影响功能但用不上)

echo
echo "✓ 已生成: $OUT"
echo
du -sh "$OUT"
echo
echo "下一步: rsync 上传到 VPS"
echo "  rsync -avz --delete '$OUT/' user@your-vps:/var/www/pkuccpexamquiz1/"
