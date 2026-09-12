'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import AvatarUploader from '../components/AvatarUploader';
import CreatorAvatar from '../components/CreatorAvatar';
import CreatorBadge from '../components/CreatorBadge';
import type { PublicProfile } from '../../lib/profiles';

export default function ProfileEditor({ email, siteHost }: { email: string; siteHost: string }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [persisted, setPersisted] = useState(true);
  const [contactEmailReady, setContactEmailReady] = useState(false);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [avatarVersion, setAvatarVersion] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/profile').then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '프로필을 불러오지 못했습니다.');
      if (active) { setProfile(data.profile); setPersisted(Boolean(data.persisted)); setContactEmailReady(data.contactEmailReady === true); setStatus('idle'); }
    }).catch((error) => { if (active) { setStatus('error'); setMessage(error instanceof Error ? error.message : '프로필을 불러오지 못했습니다.'); } });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving'); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          handle: data.get('handle'), displayName: data.get('displayName'), bio: data.get('bio'),
          location: data.get('location'), tools: data.get('tools'), instagramUrl: data.get('instagramUrl'),
          xUrl: data.get('xUrl'), youtubeUrl: data.get('youtubeUrl'), tiktokUrl: data.get('tiktokUrl'),
          websiteUrl: data.get('websiteUrl'), availableForWork: data.get('availableForWork') === 'true',
          contactEmail: data.get('contactEmail'), publishContactEmail: data.get('publishContactEmail') === 'true',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '프로필을 저장하지 못했습니다.');
      setProfile(result.profile); setPersisted(true); setStatus('saved'); setMessage('프로필이 저장되었습니다.');
      window.setTimeout(() => setStatus('idle'), 1800);
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : '프로필을 저장하지 못했습니다.');
    }
  }

  return <main className="profile-editor-shell">

    <section className="profile-editor-intro"><p className="eyebrow">CREATOR IDENTITY / PUBLIC PROFILE</p><h1>나의 크리에이터 프로필</h1><p>표시 이름, 소개, 제작 도구와 외부 채널을 연결하세요. 로그인 이메일은 비공개이며, 별도로 입력한 연락 이메일만 선택해서 공개할 수 있습니다.</p></section>
    {status === 'loading' ? <div className="creator-loading" role="status">LOADING CREATOR PROFILE…</div> : !profile ? <div className="creator-loading" role="alert">{message || '프로필을 불러오지 못했습니다.'}</div> : <section className="profile-editor-grid">
      <aside className="creator-profile-card profile-live-preview">
        <CreatorAvatar handle={profile.handle} name={profile.displayName} own version={avatarVersion} />
        <CreatorBadge role={profile.role} />
        <h2>{profile.displayName}</h2>
        <p>@{profile.handle}</p>
        <p>{profile.bio || '소개를 입력하면 방문자에게 표시됩니다.'}</p>
        <dl><div><dt>BASE</dt><dd>{profile.location || '—'}</dd></div><div><dt>TOOLS</dt><dd>{profile.tools || '—'}</dd></div><div><dt>CONTACT</dt><dd>{profile.availableForWork ? 'OPEN FOR WORK' : 'NOT LISTED'}</dd></div></dl>
        <small>{email} · PRIVATE</small>
        {persisted && <Link href={`/creators/${profile.handle}`}>공개 프로필 보기 ↗</Link>}
      </aside>
      <form className="profile-form" onSubmit={save}>
        <AvatarUploader disabled={!persisted} onUploaded={setAvatarVersion} />
        <fieldset className="profile-contact-fields" disabled={!contactEmailReady}>
          <legend>연락 이메일 · 선택 사항</legend>
          {!contactEmailReady && <p role="status">연락 이메일 공개 기능을 준비 중입니다. 다른 프로필 정보와 소셜 링크는 저장할 수 있습니다.</p>}
          <label>공개용 연락 이메일<input name="contactEmail" type="email" maxLength={254} defaultValue={profile.contactEmail ?? ''} autoComplete="off" placeholder="hello@example.com" aria-describedby="contact-email-notice" /></label>
          <label className="profile-availability"><input type="checkbox" name="publishContactEmail" value="true" defaultChecked={Boolean(profile.contactEmail)} /><span>이 이메일을 공개 프로필에 표시합니다.</span></label>
          <small id="contact-email-notice">누구나 볼 수 있어 스팸을 받을 수 있습니다. 로그인 이메일은 자동으로 채워지지 않습니다. 체크를 해제하고 저장하면 연락 이메일이 삭제됩니다.</small>
        </fieldset>
        <div className="profile-form-row"><label>DISPLAY NAME<input required name="displayName" defaultValue={profile.displayName} maxLength={60} /></label><label>PUBLIC ID<input required name="handle" defaultValue={profile.handle} minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]" /><small>{siteHost}/creators/{profile.handle}</small></label></div>
        <label>BIO<textarea name="bio" defaultValue={profile.bio} rows={4} maxLength={500} placeholder="어떤 세계와 영상을 만드는지 소개해주세요." /></label>
        <div className="profile-form-row"><label>LOCATION<input name="location" defaultValue={profile.location} maxLength={80} placeholder="Seoul, Korea" /></label><label>PRIMARY TOOLS<input name="tools" defaultValue={profile.tools} maxLength={200} placeholder="Kling · Midjourney · Runway" /></label></div>
        <div className="profile-social-fields"><p>SOCIAL LINKS</p><label>INSTAGRAM<input name="instagramUrl" type="url" defaultValue={profile.instagramUrl ?? ''} placeholder="https://instagram.com/..." /></label><label>X / TWITTER<input name="xUrl" type="url" defaultValue={profile.xUrl ?? ''} placeholder="https://x.com/..." /></label><label>YOUTUBE<input name="youtubeUrl" type="url" defaultValue={profile.youtubeUrl ?? ''} placeholder="https://youtube.com/@..." /></label><label>TIKTOK<input name="tiktokUrl" type="url" defaultValue={profile.tiktokUrl ?? ''} placeholder="https://tiktok.com/@..." /></label><label>WEBSITE<input name="websiteUrl" type="url" defaultValue={profile.websiteUrl ?? ''} placeholder="https://..." /></label></div>
        <label className="profile-availability"><input type="checkbox" name="availableForWork" value="true" defaultChecked={profile.availableForWork} /><span><b>OPEN FOR PROJECTS</b>프로필에 프로젝트 의뢰 가능 상태를 표시합니다.</span></label>
        <button className="profile-save" type="submit" disabled={status === 'saving' || !persisted}>{status === 'saving' ? 'SAVING…' : 'SAVE PROFILE ↗'}</button>
        {!persisted && <p className="profile-form-message error" role="alert">프로필 데이터베이스 적용이 필요합니다. 코드는 준비되었지만 아직 저장할 수 없습니다.</p>}
        {message && <p className={`profile-form-message ${status}`} role={status === 'error' ? 'alert' : 'status'}>{message}</p>}
      </form>
    </section>}
  </main>;
}
