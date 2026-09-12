'use client';
import Image from 'next/image';
import { useState } from 'react';
import { creatorInitials } from '../../lib/profile-policy';
export default function CreatorAvatar({ handle, name, className = 'creator-avatar', own = false, version = 0 }: { handle: string; name: string; className?: string; own?: boolean; version?: number }) {
  const src = (own ? '/api/profile/avatar' : '/api/creators/' + encodeURIComponent(handle) + '/avatar') + '?v=' + version;
  const [failed, setFailed] = useState('');
  return <div className={className}><span aria-hidden="true">{creatorInitials(name)}</span>{failed !== src && <Image key={src} src={src} alt={name + ' 프로필 사진'} fill sizes="140px" unoptimized onError={() => setFailed(src)} />}</div>;
}
