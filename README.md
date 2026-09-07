# BOTTOPIA

AI 영상 포트폴리오, 프롬프트 아카이브, Google·네이버·카카오 회원 로그인 코드가 구현된 독립 웹앱입니다. Next.js + Supabase 구조이며 실제 로그인은 각 제공자의 설정을 완료해야 활성화됩니다.

## 구성

- Next.js 16 / React 19
- Supabase Auth: Google, Kakao OAuth + Naver Custom OIDC 회원가입·로그인
- Supabase Postgres: 작품, 프롬프트, 좋아요, 커뮤니티 노트, 프로젝트 문의함
- Supabase Storage: 비공개 저장소에 영상·커버 직접 업로드(무료 플랜 영상 최대 50MB, 커버 10MB)
- Vercel 배포 준비
- 공개 포트폴리오, 작품별 공유 URL, 프롬프트 복사, 회원 좋아요·댓글, 프로젝트 문의 접수, 소유자 전용 `/studio`
- `/creators` 공개 크리에이터 디렉터리, `/profile` 프로필·소셜 링크 관리, Original/Community/Remix 계보
- `/login`: 3개 제공자 선택, 4개 언어, 실패 안내 및 안전한 원래 페이지 복귀

## 1. Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
3. [소셜 로그인 설정 가이드](docs/SOCIAL_LOGIN.md)에 따라 각 제공자와 콜백 URL을 설정합니다. 네이버는 `custom:naver` OIDC 제공자로 추가합니다.
4. 설정을 끝낸 제공자만 `NEXT_PUBLIC_AUTH_*_ENABLED=true`로 활성화합니다. 누락된 설정은 화면에 ‘설정 대기’로 표시됩니다.

이미 BOTTOPIA 데이터베이스를 만들었다면 전체 스키마 대신 [`supabase/migrations/20260907_creator_profiles.sql`](supabase/migrations/20260907_creator_profiles.sql)만 한 번 실행하면 크리에이터 프로필과 Remix 필드가 추가됩니다. 실행 후 운영자 계정으로 `/profile`을 열면 해당 계정이 `FOUNDING_CREATOR`로 승인되고, 이후 올리는 작품부터 작성자 프로필에 연결됩니다.

## 2. 환경 변수

`.env.example`을 `.env.local`로 복사하고 값을 채웁니다. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 비밀 값이므로 브라우저 코드나 GitHub에 커밋하지 마세요.

새 Supabase 키를 사용하는 경우 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에는 publishable key를, `SUPABASE_SERVICE_ROLE_KEY`에는 서버 secret key를 넣을 수 있습니다. 변수명은 기존 코드와의 호환을 위해 유지합니다.

```bash
cp .env.example .env.local
npm install
npm run dev
```

`SITE_OWNER_USER_ID`에는 `/studio` 운영자 계정의 Supabase UUID를 입력하는 것을 권장합니다. 비어 있으면 `SITE_OWNER_EMAIL`과 확인된 회원 이메일로만 검사합니다.

## 3. Vercel 배포

1. Vercel에서 이 GitHub 저장소를 Import합니다.
2. `.env.example`의 환경 변수를 Production에 등록합니다. 서비스별 Client Secret은 앱의 공개 환경 변수에 넣지 않고 Supabase 제공자 설정에 저장합니다.
3. Deploy 후 `NEXT_PUBLIC_SITE_URL`을 실제 배포 URL로 바꿉니다.
4. Supabase의 허용 URL 목록과 제공자 앱의 설정을 확인하고 실제 계정으로 3개 로그인 흐름을 검수합니다.

## 보안 모델

- 기본 접속 주소 `/`는 공개 홈 피드입니다. 홈페이지에 인증 리다이렉트나 자동 로그인 팝업을 적용하지 않습니다.
- 포트폴리오와 공개된 영상은 누구나 볼 수 있습니다.
- 프롬프트 열람·복사와 공개 댓글 읽기는 로그인 없이 가능합니다. 홈의 일반 소개 영역에는 가입 폼을 표시하지 않습니다.
- 좋아요·댓글 작성 버튼을 눌렀을 때만 로그인 선택지를 펼칩니다. 로그인 후에는 보고 있던 공개 영상으로 복귀하며 좋아요/댓글을 자동 제출하지 않습니다.
- 영상 업로드 버튼은 `/studio`로 이동합니다. 비로그인 상태는 `/login?next=%2Fstudio&lang=ko`로 안내하고, 로그인 후에도 운영자 권한을 별도로 검사합니다. 일반 회원의 영상 업로드는 허용하지 않습니다.
- 소셜 회원은 별도 비밀번호 없이 회원가입/로그인하고 좋아요와 커뮤니티 노트를 남길 수 있습니다.
- 프로젝트 문의는 로그인 없이 전송할 수 있고, 원문은 브라우저에 남기지 않고 서버를 거쳐 비공개 `project_inquiries` 테이블에 저장됩니다. 운영자만 `/studio` 문의함에서 확인합니다.
- 업로드 URL 발급, 작품 등록·삭제는 서버가 운영자 ID(또는 확인된 운영자 이메일)를 검증한 사용자에게만 허용합니다.
- Storage 업로드는 짧게 유효한 signed upload URL을 사용하므로 대용량 영상이 Vercel 서버를 통과하지 않습니다.
- 원본 저장소는 비공개입니다. `/api/works/[id]/media`가 공개 여부 또는 운영자 권한을 검사한 후 5분짜리 재생 URL로 이동합니다. 발급된 URL은 만료 전까지 사용할 수 있으므로 즉각적인 회수가 필요한 경우 해당 파일도 삭제해야 합니다.
- 테이블은 RLS를 켜고 브라우저의 직접 접근을 차단합니다. 서버 API만 허용된 정보를 반환하여 운영자 이메일과 회원 식별자가 노출되지 않도록 합니다.
- 비공개 작품의 댓글은 공개 API로 노출하지 않습니다. 인증 관련 응답은 캐시하지 않습니다.

## 검증

```bash
npm test
npm run lint
npm run build
```

외부 로그인 E2E 검수 및 배포 전 체크리스트는 [소셜 로그인 설정 가이드](docs/SOCIAL_LOGIN.md)를 참고하세요.

실제 Supabase 연결 후 로컬 개발 서버를 실행한 상태에서 `node scripts/check-supabase.mjs`로 읽기 권한·접근 차단·키 미노출을 검사할 수 있습니다. 이 검사는 샘플 작품이나 회원을 생성하지 않으며, 실제 OAuth 로그인·영상 업로드 검수를 대신하지 않습니다.
