# BOTTOPIA 소셜 로그인 연결

코드는 Google → 네이버 → 카카오 순서로 구현되어 있습니다. 실제 로그인은 아래 외부 설정이 끝난 서비스만 활성화하세요. 버튼 표시만으로 가입이 완료되는 구조가 아닙니다. 첫 OAuth 인증 성공 시 Supabase가 회원을 생성하고, 이후 같은 계정으로 로그인합니다.

## 1. 공통 설정

1. Supabase 프로젝트를 생성하고 README의 DB·Storage 설정을 마칩니다.
2. `.env.example`을 참고하여 `.env.local`에 실제 프로젝트 URL과 anon/publishable key, 서버 전용 service role key를 설정합니다. 비밀 키는 채팅·GitHub에 올리지 마세요.
3. Supabase Authentication → URL Configuration에서 Site URL을 실제 배포 주소로 설정합니다. 로컬 개발 중에는 `http://127.0.0.1:3000`입니다.
4. Redirect URLs에 앱의 인증 완료 주소를 추가합니다.
   - `http://127.0.0.1:3000/auth/callback**` (로컬 검수용, next/lang 쿼리 포함)
   - `http://localhost:3000/auth/callback**` (localhost를 사용하는 경우)
   - `https://YOUR_DOMAIN/auth/callback**` (실제 운영 호스트만 허용)
   - 전체 도메인 와일드카드는 사용하지 마세요. 앱은 next 값을 검증하여 외부 사이트로의 이동을 막습니다.
5. 운영 환경의 `NEXT_PUBLIC_SITE_URL`을 정확한 HTTPS 사이트 주소로 설정합니다. OAuth 시작과 완료는 동일한 호스트에서 진행해야 PKCE 쿠키가 유지됩니다.

로그인 제공자에 등록하는 **Supabase 콜백 URL**과 Supabase에 등록하는 **BOTTOPIA `/auth/callback` URL**은 서로 다릅니다. 제공자 콜백은 Supabase 화면의 값을 그대로 복사하세요.

## 2. Google

1. Google Cloud Console에서 OAuth 동의 화면과 웹 애플리케이션 클라이언트를 만듭니다.
2. Google의 Authorized redirect URI에 Supabase Google 제공자 화면의 Callback URL을 등록합니다.
3. Supabase Authentication → Sign In / Providers → Google에 Client ID와 Client Secret을 입력하고 활성화합니다.
4. 앱의 `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`를 설정하고 재시작/재배포합니다.
5. 테스트 모드이면 지정 테스트 사용자만 로그인할 수 있습니다. 외부 공개 전 앱 게시 상태를 확인하세요.

[Supabase Google 공식 가이드](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 3. 네이버 (Custom OIDC)

네이버는 Supabase의 기본 제공자 목록이 아닌 **Custom OAuth/OIDC provider**로 연결합니다. 현재 네이버는 OIDC 및 PKCE S256을 지원합니다. 별도 비밀번호나 자체 네이버 토큰 저장 서버는 필요하지 않습니다.

1. 네이버 개발자센터에서 네이버 로그인 애플리케이션을 등록합니다. 필요한 제공 정보만 신청합니다.
2. Supabase Authentication → Sign In / Providers에서 custom OAuth provider를 생성합니다. 아래 값으로 OIDC를 설정합니다.

| 항목 | 값 |
| --- | --- |
| Provider type | `oidc` |
| Identifier / ID | `custom:naver` (UI가 접두사를 붙이면 `naver` 입력) |
| Name | `NAVER` |
| Issuer | `https://nid.naver.com` |
| Discovery URL | `https://nid.naver.com/.well-known/openid-configuration` |
| Scopes | `openid`, `profile` |
| Client ID / Secret | 네이버 앱에서 발급한 값 |
| PKCE | 활성화 (S256) |
| Skip nonce check | 비활성화, 검증 유지 |
| Email optional | 활성화 |

Discovery는 `client_secret_post` 토큰 인증 방식을 제공합니다. 임의로 `email` 스코프를 추가하지 마세요. 네이버의 표시 이름·이메일 반환 여부는 앱의 제공 정보 설정과 사용자 동의에 따라 달라집니다. 이메일 없이도 Supabase 사용자 ID로 커뮤니티 기능을 사용할 수 있습니다.

3. Supabase의 custom provider 화면에 표시된 **Callback URL**을 네이버 앱의 Callback URL에 그대로 등록합니다. 기본 제공자 콜백 주소와 같다고 추측하지 마세요.
4. Supabase 제공자를 활성화한 뒤 `NEXT_PUBLIC_AUTH_NAVER_ENABLED=true`를 설정하고 재시작/재배포합니다. 코드의 식별자는 `custom:naver`이므로 대시보드와 정확히 일치해야 합니다.
5. 네이버 앱이 개발/검수 중이면 허용된 계정으로 먼저 검수하고, 누구나 이용할 수 있는 상태로 전환됐는지 확인합니다.

[네이버 로그인 개발 가이드](https://developers.naver.com/docs/login/web/web.md) · [Supabase Custom OAuth/OIDC 공식 가이드](https://supabase.com/docs/guides/auth/custom-oauth-providers)

## 4. 카카오

1. Kakao Developers에서 앱을 생성하고 카카오 로그인을 활성화합니다.
2. 카카오 로그인 Redirect URI에 Supabase Kakao 제공자 화면의 Callback URL을 등록합니다.
3. 카카오 앱의 REST API 키 및 Client Secret을 Supabase Kakao 제공자에 입력합니다. 브라우저용 JavaScript 키와 혼동하지 마세요.
4. 닉네임·프로필 이미지 동의 항목을 설정합니다. 이메일은 앱 자격/동의 여부에 따라 제공되지 않을 수 있으므로 불필요하게 필수 동의로 요구하지 마세요. Supabase에서 이메일 없는 계정 허용을 확인합니다.
5. Supabase 제공자 활성화 후 `NEXT_PUBLIC_AUTH_KAKAO_ENABLED=true`를 설정하고 재시작/재배포합니다.
6. 외부 사용자가 로그인할 수 있도록 앱 권한 및 게시 상태를 확인합니다.

[Supabase Kakao 공식 가이드](https://supabase.com/docs/guides/auth/social-login/auth-kakao)

## 5. 운영자와 일반 회원

- 일반 회원은 좋아요·댓글을 사용할 수 있으며 작품 업로드 권한이 없습니다.
- 권장: 운영자 계정으로 한 번 로그인한 뒤 Supabase Authentication → Users의 UUID를 `SITE_OWNER_USER_ID`에 설정합니다. 이메일 없는 네이버/카카오 계정도 이렇게 운영자로 지정할 수 있습니다.
- UUID를 설정하지 않은 경우에만 `SITE_OWNER_EMAIL`과 **확인된** 회원 이메일의 일치 여부를 검사합니다. 두 설정이 모두 없으면 누구에게도 운영자 권한을 주지 않습니다.
- 서로 다른 제공자 계정이 항상 하나로 합쳐지는 것은 아닙니다. Supabase가 검증된 동일 이메일을 연결할 수 있지만, 앱이 이메일을 임의로 신뢰해 계정을 병합하지 않습니다. 운영자는 하나의 지정된 UUID를 유지하세요.
- `NEXT_PUBLIC_*_ENABLED`는 UI 표시 설정일 뿐 보안 경계가 아닙니다. 제공자를 중단할 때는 Supabase에서도 비활성화하세요.

## 6. 배포 전 실제 계정 검수 (아직 미실행)

각 제공자마다 다음을 실제 운영 주소에서 확인해야 합니다.

- 최초 로그인 → 동의 → 회원 생성 → `/` 또는 원래 요청한 `/studio` 복귀.
- 재로그인 시 같은 사용자 ID가 유지되고 중복 회원이 생기지 않음.
- 동의 취소, 만료 코드, 쿠키 차단 시 안내 페이지에서 재시도 가능.
- 새로고침, 세션 만료·갱신, 로그아웃 후 권한 회수.
- 일반 회원은 `/studio` 및 업로드 API 접근 불가. 운영자만 업로드 가능.
- 게시 작품에서 댓글·좋아요·본인 댓글 삭제. 운영자는 다른 댓글 삭제 가능.
- 이메일 없는 계정, 4개 언어, 모바일 브라우저.

개인정보 안내·회원 탈퇴/데이터 삭제 절차·신고/운영 정책은 실제 수집 항목과 운영 방식에 맞춰 공개 전에 마련해야 합니다. 이 문서가 해당 정책이나 각 서비스의 심사를 대신하지 않습니다.

## 자동 검사

`npm test`는 제공자 매핑·콜백 인자·안전한 복귀 경로·운영자 권한 정책을 검사합니다. `npm run lint`, `npm run build`로 정적 검사와 배포 빌드를 확인합니다. 외부 서비스의 자격 증명·동의 화면·토큰 교환 성공을 자동 검사로 확인했다고 간주하지 마세요.
