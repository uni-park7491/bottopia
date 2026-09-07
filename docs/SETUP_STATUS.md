# BOTTOPIA 연결 작업 상태 — 2026-09-01

## 확인 완료

- Supabase 조직: uni-park7491's Org (Free)
- 새 프로젝트: bottopia (`dctpjovrthpndgorzbpe`), Healthy
- 프로젝트 URL: `https://dctpjovrthpndgorzbpe.supabase.co`
- 실제 생성 리전: Sydney (`ap-southeast-2`). 이전에 준비했던 Seoul과 다름. 기존 프로젝트를 임의로 삭제하거나 재생성하지 않음.
- 무료 Storage 전역 파일 업로드 제한: 50MB. 영상 업로드 UI·서버 검증·SQL 버킷 제한을 50MB로 통일함. 커버는 10MB.
- 공개 피드 `/` 응답 200. 기존 개발 서버 `127.0.0.1:3000` 유지.
- Google Cloud는 로그인됨. 사용자가 `bottopia` 프로젝트와 기본 OAuth 브랜딩(앱 이름 및 연락처)을 생성한 상태를 확인함. 기존 Gemini API 등 다른 프로젝트는 변경하지 않음.

## 실제 적용 및 연결 완료

- `supabase/schema.sql`: 작품·댓글·좋아요 테이블, RLS 및 서버 전용 테이블 권한, 비공개 `works` 저장소. 트랜잭션 안에서 실행하도록 준비.
- 공개 영상은 `/api/works/[id]/media`가 공개 여부를 확인하여 5분짜리 재생 URL로 이동. 비공개 작품은 운영자만 허용. 발급된 URL은 만료 전까지 유효함.
- 관리자 클라이언트에 `server-only` 경계 추가.
- 테스트 36개, lint, production build, git diff --check 통과.
- 사용자 승인 후 `supabase/schema.sql`을 새 프로젝트에 실행 완료. 실행 전 public 테이블과 Storage 버킷이 모두 비어 있음을 확인함.
- SQL 검증: 세 테이블 모두 RLS=true, anon/member SELECT=false, service_role 접근=true.
- Storage 검증: `works`, public=false, file_size_limit=52428800.
- Site URL: `http://127.0.0.1:3000`. 허용 콜백은 `http://127.0.0.1:3000/auth/callback**`, `http://localhost:3000/auth/callback**` 두 개만 등록.
- 기본 publishable key 및 서버 secret key를 `.env.local`에 저장함. 기존 환경 변수명 `SUPABASE_SERVICE_ROLE_KEY`에 새 `sb_secret_…` 키 사용 가능함을 실제 읽기로 확인. 파일 권한 600, Git 제외 확인. 비밀 값은 문서·채팅에 표시하지 않음.
- `/api/works` 응답 `{"works":[],"configured":true}` 확인. 아직 작품 없음.
- `node scripts/check-supabase.mjs`: 실제 통합 검증 17개 통과. 원본 테이블 익명 조회 차단, 서버 조회, 비공개 버킷, 홈 공개, 운영자 경로/쓰기 차단, 키 미노출 검사. 샘플 데이터나 회원을 만들지 않음.
- 2026-09-01 Google 실제 로그인 성공. Supabase Auth에 생성된 유일한 Google 사용자를 로컬 `SITE_OWNER_USER_ID`로 지정했고, `/studio`의 `403 / OWNER-ONLY` 차단이 해제되어 작품 업로드 화면이 정상 표시됨.
- Storage signed upload URL 발급을 파일 생성 없이 검증함. 업로드 URL과 단기 토큰이 정상 발급되며, 실제 작품 파일 업로드·등록은 사용자의 첫 작품으로 최종 검수 예정.

## 승인 처리 및 현재 사용자 입력 대기

사용자가 “다 승인할게”라고 답변하여 아래 세 작업을 승인했고, 위와 같이 완료함.

1. 위 Supabase `bottopia` 프로젝트에 테이블·비공개 저장소·서버 전용 권한을 생성.
2. 해당 프로젝트의 서버 키를 이 Mac의 프로젝트 `.env.local`에 저장하여 연결. GitHub·채팅에는 공개하지 않음.
3. 로그인 복귀 주소는 로컬 `127.0.0.1:3000` 및 `localhost:3000` 콜백만 등록. 유료 전환 없음.

2026-09-01 Chrome에서 소셜 로그인 상태를 확인하고 아래와 같이 준비함. 이 날짜의 확인 작업에서는 로그인 키를 발급·전달·저장하거나 제공자를 활성화하지 않았음.

- Naver: 사용자가 `bottopia` 앱 등록 완료. 상태는 `개발 중`이며 검수 접수 완료가 아님. 검수 화면에 로고 등록 필요 안내가 표시되고, 활용 화면 및 로그인 절차 증빙은 아직 첨부되지 않음. API 설정은 별명만 추가 동의, PC 웹 서비스 URL `http://127.0.0.1:3000`, Callback URL `https://dctpjovrthpndgorzbpe.supabase.co/auth/v1/callback`으로 정확함. 네이버 설정은 변경하지 않음.
- Google: 사용자가 `BOTTOPIA Web` OAuth 클라이언트를 생성하고 Supabase Google 제공자에 Client ID와 Client Secret을 저장함. 원본은 `http://127.0.0.1:3000` 및 `http://localhost:3000`, 콜백은 `https://dctpjovrthpndgorzbpe.supabase.co/auth/v1/callback`으로 확인함. Supabase Google은 Enabled이며 `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`로 사이트 버튼을 활성화함. 실제 Google 계정 선택·동의·Supabase 회원 생성·재로그인까지 확인함.
- Kakao: 사용자 로그인 및 `bottopia` 앱(ID `1562866`, Owner) 생성 완료. 로그인 OFF, 닉네임·프로필 사진 사용 안 함, 이메일 권한 없음. 기존 REST API 키 설정 위치를 확인함. 비즈 앱 전환이나 새 키 생성은 하지 않음.
- Supabase: Google Enabled, Kakao Disabled, Custom Providers 없음. Google 사용자 1명이 생성되었고 해당 사용자를 로컬 운영자로 지정함.
- 재검증: 단위 테스트 37개, 실제 통합 검사 17개, lint와 production build 통과. Google OAuth 회원가입·재로그인 확인 완료.

현재 사용자에게 구체적으로 승인을 요청한 범위:

1. 위 Google 웹 OAuth 클라이언트 생성 및 두 로컬 원본/정확한 Supabase 콜백 등록.
2. 위 Kakao 앱의 로그인 활성화, 같은 Supabase 콜백 등록, 닉네임만 선택 동의, 이메일 없는 로그인 허용.
3. Google·Kakao 로그인 키와 비밀 키를 Supabase `bottopia` 프로젝트에만 전달·저장하고 제공자를 활성화. 채팅·GitHub에 비밀 키를 공개하지 않음.

결제·유료 전환·Google 운영 게시 전환은 승인 요청 범위에서 제외함. 현재 요청은 네이버 상태 확인과 Google·Kakao 연결이며, 네이버 검수 제출이나 새 Supabase 네이버 제공자 생성은 이번에 실행하지 않음.

## 남은 작업

- Naver Custom OIDC와 Kakao 앱 연결. 필요한 약관·키 전달·접근 권한 변경은 해당 화면에서 구체적으로 승인/인계. Google 로그인과 로컬 운영자 지정은 완료됨.
- 실제 작품 1개로 영상 전송·DB 등록·공개 재생·프롬프트 복사·삭제 흐름을 최종 검수.
- 실제 로그인 제공자 연결 전에는 `NEXT_PUBLIC_AUTH_*_ENABLED`를 켜지 않음.
- 외부 배포 주소/운영 URL과 운영 정책은 아직 미완료. 실제 로그인이나 영상 업로드가 검증 완료됐다고 안내하지 말 것.

이 문서에는 자격 증명이나 비밀 키를 저장하지 않습니다.
