#!/bin/bash
echo "로컬 웹 서버를 시작합니다..."
echo ""
echo "브라우저에서 http://localhost:8000/src/index.html 을 열어주세요"
echo ""
echo "서버를 중지하려면 Ctrl+C를 누르세요"
echo ""

cd "$(dirname "$0")"

# Python이 있으면 사용
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m http.server 8000
# Node.js가 있으면 사용
elif command -v npx &> /dev/null; then
    npx http-server -p 8000 -c-1
else
    echo "Python 또는 Node.js가 필요합니다."
    exit 1
fi

