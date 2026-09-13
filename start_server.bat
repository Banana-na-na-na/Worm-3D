@echo off
echo 로컬 웹 서버를 시작합니다...
echo.
echo 브라우저에서 아래 중 하나를 열어 주세요:
echo   http://localhost:8000/
echo   http://localhost:8000/src/index.html
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요
echo.
cd /d "%~dp0"
python -m http.server 8000
if errorlevel 1 (
    echo Python이 설치되어 있지 않습니다.
    echo Node.js를 사용하여 서버를 시작합니다...
    npx http-server -p 8000 -c-1
)

