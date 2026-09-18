#!/bin/sh
finish() {
  printf '\n종료하려면 Return을 누르세요.\n'
  read -r answer || :
  exit "$1"
}
case "$0" in
  */.Trash/*|*/.Trashes/*)
    printf '휴지통 안에서는 실행할 수 없습니다.\nFinder의 휴지통에서 BOTTOPIA 폴더를 선택하고 ‘다시 넣기’로 복원하거나, ZIP을 다운로드 폴더에 새로 풀어 실행하세요.\n보안 설정이나 파일 접근 권한을 해제할 필요는 없습니다.\n'
    finish 1 ;;
esac
cd "$(dirname "$0")" || finish 1
case "$(pwd -P)" in */.Trash/*|*/.Trashes/*)
  printf '휴지통에 있는 폴더를 복원한 뒤 다시 실행하세요.\n'; finish 1 ;;
esac
if [ ! -r connector.py ]; then
  printf 'connector.py를 읽을 수 없습니다. ZIP 전체를 일반 폴더에 압축 해제한 뒤 실행하세요.\n'
  finish 1
fi
tts_python=''
for candidate in python3.11 /Library/Frameworks/Python.framework/Versions/3.11/bin/python3.11 /opt/homebrew/bin/python3.11 /usr/local/bin/python3.11; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys;sys.exit(sys.version_info[:2] != (3,11))' >/dev/null 2>&1; then
    tts_python="$candidate"; break
  fi
done
if [ -z "$tts_python" ]; then
  printf 'Python 3.11이 필요합니다. https://www.python.org/downloads/ 에서 설치한 뒤 다시 실행하세요.\n기본 python3가 3.14여도 이 연결기는 3.11을 따로 사용합니다.\n'
  finish 1
fi
"$tts_python" -u "$PWD/connector.py" menu
tts_exit=$?
if [ "$tts_exit" -ne 0 ]; then printf '\n연결기가 오류로 종료되었습니다. 위 오류 내용을 확인하세요.\n'; fi
finish "$tts_exit"
