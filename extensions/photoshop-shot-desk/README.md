# BOTTOPIA Shot Desk · development preview

Photoshop 24.2+ 전용 무료 플러그인 소스입니다. Photoshop 자체 이용권은 별도이며, 이 플러그인이 Adobe 이용권을 제공하지 않습니다. **아직 UDT 패키징 및 실제 호스트 설치 검증 전입니다. 일반 배포 완료로 안내하지 마세요.**

## 기능

새 콘티 보드 기능(호스트 검증 중): JSON에서 최대 32개 샷을 읽고 4개씩 최대 8페이지로 나눕니다. 각 샷에 PNG/JPEG 참고 이미지를 연결한 뒤 페이지를 선택해 새 문서를 만듭니다. 이미지 비율을 유지하며 2×2로 배치하고, 설명은 별도 텍스트 레이어로, 이미지와 설명은 샷별 그룹으로 묶습니다. PSD 저장과 PNG 사본 저장 버튼은 마지막으로 완성한 콘티 보드를 대상으로 하며 사용자가 저장 위치를 고릅니다. 기존 작업 문서에는 쓰지 않습니다. 이미지 연결은 세션 전용이며 JSON에 포함되지 않습니다. 원본 이미지 수정·네트워크·AI 생성·자동 공개는 없습니다.

이미지는 파일당 10MB, 16MP, 가로·세로 8,192px 이하입니다. Photoshop 디코딩 전에 PNG/JPEG 헤더를 확인합니다. 단위 테스트는 32개 샷 순서/페이지 경계/최대 길이 텍스트/이미지 크기 제한/비율 유지 등을 검사하지만 실제 Photoshop 레이어 생성·저장 성공을 대신하지 않습니다.

BOTTOPIA 작업실의 샷리스트가 포함된 `bottopia-story-project.json` 파일을 열고 샷별 화면·카메라·소리 노트를 읽습니다. 버튼을 누르면 선택한 샷의 텍스트를 편집 가능한 텍스트 레이어로 담은 새 Photoshop 문서를 만듭니다. 기존 문서 수정, 자동 저장, 파일 업로드, 이미지 생성, 네트워크 연결은 없습니다. 글꼴과 줄바꿈을 확인한 뒤 사용자가 PSD로 저장합니다.

## 개발용 설치 및 검증

1. Adobe Creative Cloud에서 UXP Developer Tool(UDT)을 설치합니다.
2. UDT와 Photoshop의 개발자 모드를 켜고, UDT에서 이 폴더의 `manifest.json`을 Add Plugin으로 등록합니다.
3. Load 후 Photoshop 플러그인 메뉴에서 BOTTOPIA Shot Desk를 엽니다.
4. 테스트 JSON으로 8초+7초 샷의 표시, 한글 텍스트, 새 문서 생성 및 기존 문서 불변을 확인합니다.
5. 비정상 JSON, 취소, 빈 샷, 반복 생성, 작은 패널 크기와 누락 글꼴을 확인합니다.
6. UDT Actions → Package로 `.ccx`를 생성합니다. 임의로 ZIP 확장자만 바꾸지 않습니다.
7. 개발용 플러그인을 내린 뒤 `.ccx` 설치와 재시작 후 동작을 확인하고 배포합니다. Adobe 미검증 플러그인 경고는 숨기지 않습니다.

독립 배포 ID는 `studio.bottopia.shotdesk`입니다. Marketplace ID를 발급받는 경우 별도 배포 채널로 관리합니다. 파일 선택 대화상자로 선택한 파일에만 접근하도록 `localFileSystem: request`를 사용하며 네트워크·전체 디스크·셸·클립보드 권한은 없습니다.

## 근거

- [Adobe 공식 패키징 절차](https://developer.adobe.com/uxp/guides/how-to/distribution/package/)
- [파일 접근 권한](https://developer.adobe.com/uxp/guides/how-to/recipes/filesystem-operations/)
- [텍스트 레이어 생성](https://developer.adobe.com/photoshop/uxp/ps_reference/objects/createoptions/textlayercreateoptions/)

현재 검증: JSON 형식·샷 시간·입력 크기·최소 권한 단위 테스트 통과. 호스트 실기 및 CCX 설치 검증은 미완료.
