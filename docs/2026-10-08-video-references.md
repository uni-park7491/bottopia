# 2026-10-08 영상 레퍼런스·브랜드 톤

## 반영

- 실제 공개 로고 `public/og.png`, `public/favicon.svg`의 라임 #dfff00 / 오렌지 #ff4d16을 사용. 밝은 배경은 차가운 회색, 어두운 배경은 먹색. 기존 베이지·녹색 제거.
- 홈 작품 목록 기본 최신순 유지. 장르는 BL·액션·드라마·로맨스·판타지·SF·공포·코미디·애니메이션·뮤직비디오 등으로 구분. 업로드에서도 선택 가능.
- 모델 버전과 15초/30초 필터를 별도 제공. 길이가 없는 기존 작품은 특정 길이로 추정해 분류하지 않음. 기존 STORY는 스토리·미분류로 보존.
- 국내외 레퍼런스는 작품과 별도 탭. 원본 출처로 연결하고 재구성 프롬프트를 제공. 타인 영상 파일을 복제·업로드하지 않음.
- 레퍼런스는 게시일 최신순, 날짜 미확인 자료는 마지막. 아래 모델 이름은 제작자 표기이며 독립적인 모델 실행 검증 결과는 아님.

## 수집한 출처 6개

| 제작자 | 모델 표기 | 길이 | 분류 | 원본 |
| --- | --- | --- | --- | --- |
| u/Livid_Necessary_Real | Seedance 2.5 | 30초: 게시자 표기 | 라이프스타일 | https://www.reddit.com/r/seedance2pro/comments/1x0bfb3/i_made_a_30second_get_ready_with_me_vlog_using/ |
| Prompt_what | Seedance 2.5 + Claude Code 후편집 | 생성 30초: 게시자 표기 / 편집본 브라우저 29.708초 | 실험 | https://x.com/Promptwhat/status/2106006916665372872 |
| arelion.dev | MiniMax Hailuo 3 | 15초: 제작자 표기 | 뮤직비디오 | https://arelion.dev/case-studies/hotel-lobby-ai-video/ |
| u/Fresh-Resolution182 | Seedance 2.5 | 30초: 게시자 표기 | 라이프스타일 | https://www.reddit.com/r/Seedance_AI/comments/1vg13x1/seedance_25_handled_this_30s_singletake/ |
| Matt Workman | Kling 3.0 Multi Shot | 15초: 제작자 표기 | 드라마 | https://www.linkedin.com/posts/mattworkman_with-new-ai-models-its-hard-to-market-nuance-activity-7425175011222503424-XPVt |
| Billy Boman | Kling 3.0 Multicam | 15초: 제작자 표기 | 드라마 | https://www.linkedin.com/posts/billyboman_kling-30-is-absolutely-bonkers-this-activity-7425258978022068224-_6ng |

프롬프트 본문과 확인 근거는 `lib/video-references.ts`에 기록. 원문 전체를 복사하지 않고 봇토피아가 작성한 예시로 표시한다. 프롬프트로 같은 결과가 재현된다는 보장은 없다. 실제 인물·음악 사용 사례는 원본의 권리 확보 여부와 별개로 직접 사용 권리가 확보된 자료로 제작해야 한다.

현재 BL·액션 등 일부 장르는 필터만 있으며 확인된 사례가 아직 없다. 검색에서 나온 장편 영상, 15숏을 15초로 혼동한 자료, 길이 표기가 서로 다른 자료는 제외했다. 해외 사례 파일 길이는 직접 측정하지 못했다.

## 검증

- 자동 테스트 247개 통과, 실패 0.
- Next.js 프로덕션 빌드 성공.
- 전체 ESLint 오류 0. 기존 vendor 번들과 이미지 경고는 남아 있으며 이번 수정 파일은 별도 검사.
- PC 1440px / 모바일 390px: 장르·모델·길이·지역 필터, 필터 초기화, 최신순 기본값, 밝은/어두운 테마 확인.
- 모바일 참조 목록 한 열, 가로 문서 넘침 없음. 장르는 가로 스크롤.
- 브라우저 경고 로그는 MetaMask 확장 출처이며 사이트 코드 오류로 분류하지 않음.
