# BOTTOPIA

AI 영상 포트폴리오, 프롬프트 아카이브, Google 회원 로그인을 갖춘 독립 웹앱입니다. OpenAI Sites 전용 D1/R2/SIWC 의존성을 제거하고 일반 Next.js + Supabase 구조로 이전했습니다.

## 구성

- Next.js 16 / React 19
- Supabase Auth: Google OAuth 회원가입·로그인
- Supabase Postgres: 작품과 프롬프트 메타데이터
- Supabase Storage: 영상·커버 직접 업로드(최대 500MB)
- Vercel 배포 준비
- 공개 아카이브, 프롬프트 복사, 소유자 전용 `/studio`

## 1. Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다.
3. Authentication → Providers → Google을 활성화하고 Google OAuth Client ID/Secret을 입력합니다.
4. Authentication → URL Configuration에 아래 주소를 등록합니다.
   - Site URL: 배포된 Vercel URL
   - Redirect URL: `https://YOUR_DOMAIN/auth/callback`

Google Cloud OAuth 앱의 Authorized redirect URI에는 Supabase가 안내하는 콜백 URL(`https://YOUR_PROJECT.supabase.co/auth/v1/callback`)을 등록해야 합니다.

## 2. 환경 변수

`.env.example`을 `.env.local`로 복사하고 값을 채웁니다. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 비밀 값이므로 브라우저 코드나 GitHub에 커밋하지 마세요.

```bash
cp .env.example .env.local
npm install
npm run dev
```

`SITE_OWNER_EMAIL`에는 `/studio` 업로드 권한을 가질 Google 계정 이메일을 입력합니다.

## 3. Vercel 배포

1. Vercel에서 이 GitHub 저장소를 Import합니다.
2. `.env.example`의 다섯 환경 변수를 Production에 등록합니다.
3. Deploy 후 `NEXT_PUBLIC_SITE_URL`을 실제 배포 URL로 바꿉니다.
4. Supabase와 Google OAuth의 URL 목록에도 실제 도메인을 추가합니다.

## 보안 모델

- 포트폴리오와 공개된 영상은 누구나 볼 수 있습니다.
- Google 사용자는 회원가입/로그인할 수 있습니다.
- 업로드 URL 발급, 작품 등록·삭제는 서버가 `SITE_OWNER_EMAIL`과 일치하는 로그인 사용자에게만 허용합니다.
- Storage 업로드는 짧게 유효한 signed upload URL을 사용하므로 대용량 영상이 Vercel 서버를 통과하지 않습니다.
