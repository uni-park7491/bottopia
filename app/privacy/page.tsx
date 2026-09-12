import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './privacy.module.css';

// Reference draft, not legal advice. Review operator disclosures, retention and
// international transfers with counsel before publication. Never insert the
// operator's private name or phone number without separate publication approval.
export const metadata: Metadata = {
  title: '개인정보처리방침 · BOTTOPIA STUDIO',
  description: 'BOTTOPIA STUDIO의 소셜 로그인, 공개 프로필, 작품 및 개인정보 처리 안내.',
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <header>
        <p className={styles.eyebrow}>BOTTOPIA STUDIO · PRIVACY</p>
        <h1>개인정보처리방침</h1>
        <p>작품을 공유하는 공간에서, 내 정보가 어떻게 사용되는지 안내합니다.</p>
        <p className={styles.notice}>시행일: 2026년 9월 13일 · 문의: bottopia030@gmail.com</p>
        <nav aria-label="문서 언어"><a href="#korean">한국어</a><a href="#english">English summary</a></nav>
      </header>
      <article id="korean" lang="ko">
        <section>
          <h2>1. 서비스와 문의 창구</h2>
          <p>BOTTOPIA STUDIO는 한국에서 개인이 운영하는 AI 영상 포트폴리오·크리에이터 커뮤니티입니다. 작품 감상은 로그인 없이 가능하며, 회원 기능을 이용할 때 소셜 로그인을 사용합니다.</p>
          <p>계정, 개인정보 열람·정정·삭제 및 게시물 관련 문의는 운영자 이메일 <a href="mailto:bottopia030@gmail.com">bottopia030@gmail.com</a>으로 보내실 수 있습니다.</p>
        </section>
        <section>
          <h2>2. 수집하는 정보와 이용 목적</h2>
          <ul>
            <li><strong>소셜 로그인:</strong> 로그인 제공자의 계정 식별자, 이메일, 제공된 이름·닉네임·프로필 이미지, 인증 상태와 세션 정보를 회원 식별, 로그인 유지 및 프로필 초기값 생성에 사용합니다. 제공 항목은 선택한 로그인 제공자와 동의 내용에 따라 달라집니다.</li>
            <li><strong>프로필:</strong> 직접 입력한 표시 이름, 아이디, 소개, 지역, 사용 도구, 소셜 링크, 웹사이트 주소, 프로필 사진과 협업 가능 상태를 저장합니다. 공개 이메일 기능이 제공되는 경우에는 별도로 입력하고 공개를 선택한 이메일만 공개합니다.</li>
            <li><strong>작품과 활동:</strong> 업로드한 영상·표지, 제목, 설명, 프롬프트, 제작 도구, 게시 상태, 댓글, 좋아요와 생성 시각을 콘텐츠 표시와 회원 활동 관리에 사용합니다. 업로드는 부여된 권한 범위에서 이용할 수 있습니다.</li>
            <li><strong>문의:</strong> 문의 양식이나 이메일로 전달한 이름, 회신 연락처, 문의 내용 및 직접 제공한 프로젝트 정보를 문의 응대에 사용합니다.</li>
            <li><strong>접속과 보안:</strong> 서버 요청 처리 과정에서 IP 주소, 요청 시각, 브라우저·기기 및 오류 정보가 호스팅·인증 서비스에 의해 처리될 수 있습니다. 자체 요청 횟수 제한에는 계정 식별자 또는 IP 주소를 비밀키로 변환한 값을 사용합니다.</li>
          </ul>
          <p>회원 기능 제공과 요청 이행, 동의받은 공개, 부정 이용 방지 및 적용되는 법령상 의무 이행에 필요한 범위로 처리를 제한합니다. 선택 정보는 입력하지 않아도 됩니다. 로그인에 필요한 정보 제공을 거절하면 회원 기능은 이용할 수 없지만 공개 작품은 볼 수 있습니다.</p>
        </section>
        <section>
          <h2>3. Google 계정 정보</h2>
          <p>Google 로그인에서 요청하는 범위는 기본 계정 식별(openid), 이메일(userinfo.email), 프로필(userinfo.profile)입니다. Google 비밀번호, Gmail 메일 내용, 연락처, Google Drive 파일에는 접근하지 않습니다.</p>
          <p>Google에서 받은 정보는 로그인, 계정 관리와 프로필 구성에 사용하며 광고 목적으로 판매하거나 AI 모델 학습에 사용하지 않습니다. 인증 정보는 Supabase를 통해 처리되고, 회원 기능을 제공하는 서버에서 필요한 범위로 이용됩니다.</p>
          <p><a href="https://myaccount.google.com/connections">Google 계정의 연결 관리</a>에서 접근을 철회할 수 있습니다. 연결 철회만으로 BOTTOPIA에 이미 저장된 계정이나 게시물이 자동 삭제되지는 않습니다. 삭제는 운영자에게 요청해주세요.</p>
        </section>
        <section>
          <h2>4. 공개되는 정보</h2>
          <p>공개된 크리에이터 프로필, 작품과 프롬프트, 댓글의 표시 이름 및 내용은 비회원도 볼 수 있습니다. 프로필 초기 이름은 소셜 계정 정보에서 제안될 수 있으므로, 공개 전에 원하는 닉네임으로 수정해주세요. 로그인 이메일 자체를 공개 연락 이메일로 자동 전환하지 않습니다.</p>
          <p>공개 정보는 다른 사람이 복사하거나 검색 서비스에 수집할 수 있습니다. 이후 수정·삭제해도 제3자가 보관한 사본까지 회수할 수는 없습니다. 영상·프롬프트·소개에 비밀번호, 개인 연락처 또는 다른 사람의 사적인 정보를 넣지 마세요.</p>
          <p>소셜 링크를 누르면 외부 사이트로 이동하며 해당 서비스의 개인정보처리방침이 적용됩니다.</p>
        </section>
        <section>
          <h2>5. 외부 서비스와 국외 처리</h2>
          <p>서비스 제공을 위해 다음 외부 서비스를 이용합니다. 제공자가 자체적으로 처리하는 계정·접속 정보에는 해당 제공자의 정책도 적용됩니다.</p>
          <ul>
            <li><strong>Supabase:</strong> 회원 인증, 데이터베이스 및 업로드 파일 저장. 현재 프로젝트의 주 저장 리전은 호주 시드니입니다. 인증·지원 및 하위 처리업체의 처리 위치는 Supabase 계약과 하위 처리업체 안내에 따릅니다. <a href="https://supabase.com/legal/dpa">데이터 처리 계약</a> · <a href="https://supabase.com/privacy">개인정보 안내</a></li>
            <li><strong>Vercel:</strong> 웹페이지 제공, 서버 요청 처리 및 운영 로그. 글로벌 인프라에서 접속 정보와 서버 요청 데이터가 처리될 수 있습니다. <a href="https://vercel.com/legal/dpa">데이터 처리 계약</a> · <a href="https://vercel.com/legal/privacy-notice">개인정보 안내</a></li>
            <li><strong>Cloudflare:</strong> 도메인과 DNS 관리. 사이트 접속에 필요한 도메인 조회 처리가 이루어집니다. <a href="https://www.cloudflare.com/privacypolicy/">개인정보 안내</a></li>
            <li><strong>Google 및 Kakao:</strong> 이용자가 선택한 소셜 로그인 인증. <a href="https://policies.google.com/privacy">Google 개인정보처리방침</a> · <a href="https://www.kakao.com/policy/privacy">Kakao 개인정보처리방침</a></li>
            <li><strong>Gmail:</strong> 운영자에게 이메일로 문의할 때 회신 이메일과 문의 내용이 Google 메일 서비스에서 처리됩니다.</li>
          </ul>
          <p>회원 인증, 저장 및 서버 처리에 필요한 데이터는 해당 기능 이용 시 네트워크를 통해 전달됩니다. 국외 처리를 원하지 않는 경우 회원 기능 이용을 중단하고 계정 삭제를 요청할 수 있습니다. 로그인 없이 방문할 때도 웹페이지 전달에 필요한 접속 정보 처리는 발생합니다.</p>
        </section>
        <section>
          <h2>6. 보관과 삭제</h2>
          <p>계정과 프로필은 회원 서비스 제공 기간 동안, 작품과 회원 활동은 게시·활동 제공 기간 동안 보관합니다. 탈퇴나 삭제 요청을 받으면 본인 확인 후 관련 데이터와 파일을 확인하여 삭제합니다. 문의 기록은 문의 처리에 필요한 기간 동안 보관하고 목적이 종료되면 삭제합니다.</p>
          <p>현재 탈퇴는 이메일로 접수하며, 즉시 자동 삭제 기능은 제공하지 않습니다. 계정 연결을 끊거나 로그아웃하는 것은 탈퇴가 아닙니다.</p>
          <p>자체 요청 제한 값은 1시간 단위로 만료되며 이후 요청 처리 때 만료 기록을 순차 정리합니다. 만료와 물리적 삭제 시점은 다를 수 있습니다. 호스팅·인증 서비스의 로그와 백업 보관 주기는 해당 서비스의 계약 및 설정에 따릅니다.</p>
          <p>법령에 따라 별도 보관이 필요한 경우에는 적용 근거와 기간을 확인하여 필요한 정보만 분리 보관합니다. 삭제는 데이터베이스 기록과 저장 파일을 제거하는 방식으로 처리하며, 제공자 백업 사본은 해당 제공자의 삭제 주기에 따라 정리될 수 있습니다.</p>
        </section>
        <section>
          <h2>7. 열람·정정·삭제와 동의 철회</h2>
          <p>로그인 후 내 프로필에서 제공되는 항목을 수정할 수 있습니다. 개인정보 열람, 정정, 삭제, 처리 정지, 동의 철회 또는 계정 탈퇴는 <a href="mailto:bottopia030@gmail.com">bottopia030@gmail.com</a>으로 요청해주세요. 계정의 회신 가능한 이메일과 요청 범위를 알려주시면 필요한 최소한의 방법으로 본인을 확인합니다. 비밀번호나 신분증 전체 사본을 보내지 마세요.</p>
          <p>적용 법령에 따른 기간과 절차에 맞춰 요청을 처리하고, 요청을 처리할 수 없는 경우 이유를 안내합니다. 법정대리인이나 위임받은 대리인은 권한을 확인할 수 있는 방법으로 요청할 수 있습니다. 지역에 따라 적용되는 개인정보 이동권이나 감독기관에 대한 이의 제기 권리도 보장됩니다.</p>
        </section>
        <section>
          <h2>8. 쿠키와 브라우저 저장소</h2>
          <p>인증 쿠키는 로그인 세션 유지에, 브라우저의 로컬 저장소는 선택한 언어 기억에 사용합니다. 현재 사이트 코드에는 광고 추적 픽셀이나 Google Analytics를 설치하지 않았습니다.</p>
          <p>브라우저 설정에서 쿠키와 사이트 데이터를 차단·삭제할 수 있습니다. 이 경우 로그인이 풀리거나 언어 설정이 초기화될 수 있습니다. 소셜 로그인 제공자와 외부 링크의 쿠키는 해당 사이트에서 관리할 수 있습니다.</p>
        </section>
        <section>
          <h2>9. 안전 조치</h2>
          <p>HTTPS 통신, 서버 측 접근 권한 확인, 데이터베이스 접근 제한, 비공개 파일 저장소와 요청 횟수 제한을 사용합니다. 운영용 비밀키는 클라이언트 코드에 포함하지 않습니다. 보안 조치가 모든 사고의 방지를 보장하는 것은 아니며, 문제를 발견하면 운영자에게 알려주세요.</p>
        </section>
        <section>
          <h2>10. 아동과 민감한 정보</h2>
          <p>회원 서비스는 만 14세 이상을 대상으로 합니다. 거주 지역에서 더 높은 동의 연령이나 법정대리인 동의를 요구하는 경우 그 요건을 충족해야 합니다. 만 14세 미만 아동의 계정 정보가 수집된 사실을 알게 되면 확인 후 필요한 삭제 조치를 진행합니다.</p>
          <p>주민등록번호나 건강·생체 인식 정보 수집을 요구하지 않습니다. 개인정보를 이용한 자동화된 합격·불합격 또는 신용 심사 기능은 운영하지 않으며, 회원 개인정보를 별도 가명정보 분석 목적으로 활용하지 않습니다.</p>
        </section>
        <section>
          <h2>11. 문의·분쟁과 변경 안내</h2>
          <p>운영자 문의: <a href="mailto:bottopia030@gmail.com">bottopia030@gmail.com</a>. 개인정보 관련 상담이나 분쟁 조정은 <a href="https://privacy.kisa.or.kr/">개인정보침해 신고센터</a> 또는 <a href="https://www.kopico.go.kr/">개인정보분쟁조정위원회</a>에서도 안내받을 수 있습니다.</p>
          <p>방침을 변경할 때에는 변경 내용과 시행일을 이 페이지에 안내합니다. 별도 동의가 필요한 변경은 해당 절차를 거칩니다.</p>
        </section>
      </article>
      <section id="english" lang="en" className={styles.english}>
        <h2>Privacy summary</h2>
        <p>BOTTOPIA STUDIO is an individually operated AI video portfolio and creator community based in Korea. Effective date: September 13, 2026.</p>
        <p>We use your social account identifier, email and available profile information for sign-in, account management and profile setup. Google access is limited to openid, userinfo.email and userinfo.profile. We do not access your Google password, Gmail messages, contacts or Drive files. Google user data is not sold for advertising or used to train AI models.</p>
        <p>Published profiles, works, prompts and comments can be viewed by visitors. Review your display name before publishing. Your login email is not automatically published as a contact email. Others may retain copies of public content.</p>
        <p>Supabase handles authentication, database records and files; the project’s primary storage region is Sydney, Australia. Vercel serves the website and server requests using global infrastructure. Cloudflare manages the domain and DNS. Data may be processed outside your country. Google or Kakao handles the sign-in method you select, and Gmail processes messages sent to our support address.</p>
        <p>Account information is retained to provide your membership, and published content to provide the corresponding features. Contact us for access, correction, deletion, withdrawal or account closure. Deletion is handled manually after verifying the request; revoking Google access or signing out does not automatically delete existing data. Provider logs and backups follow their respective retention schedules.</p>
        <p>Authentication cookies maintain your session and local storage remembers your language. We have not installed advertising pixels or Google Analytics in the site code. Membership is for people aged 14 or older, subject to any higher consent age and guardian-consent requirements in your jurisdiction.</p>
        <p>Privacy and account requests: <a href="mailto:bottopia030@gmail.com">bottopia030@gmail.com</a>. Where applicable, you may also exercise data portability rights or complain to your local privacy regulator.</p>
      </section>
      <Link href="/" className={styles.back}>홈 피드로 돌아가기 →</Link>
    </main>
  );
}
