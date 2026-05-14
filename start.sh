#!/bin/sh
# 启动本地复习站
# 注: 从父目录起服, 这样 study-app 可以通过 ../ 读取题库 markdown
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${PORT:-8765}"
URL="http://localhost:$PORT/study-app/"

cd "$PARENT_DIR"
echo "→ 服务根目录: $PARENT_DIR"
echo "→ 打开浏览器: $URL"
echo "→ 关闭服务请按 Ctrl+C"
( sleep 0.8 && open "$URL" ) &
exec python3 -m http.server "$PORT"
