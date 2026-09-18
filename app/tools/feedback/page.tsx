import {redirect} from 'next/navigation';
import Link from 'next/link';
import {getCurrentUser} from '../../../lib/auth';
import {isSiteOwner} from '../../../lib/auth-policy';
import ToolFeedback from './ToolFeedback';
import '../tools.css';
import '../workspace.css';
import '../studio-theme.css';
export const dynamic='force-dynamic';
export const metadata={title:'창작도구 피드백 · BOTTOPIA',robots:{index:false,follow:false}};
export default async function FeedbackPage(){
  const user=await getCurrentUser();
  if(!user)redirect('/login?next=%2Ftools%2Ffeedback&lang=ko');
  const owner=isSiteOwner(user,process.env.SITE_OWNER_USER_ID,process.env.SITE_OWNER_EMAIL);
  return <main className="creative-tools feedback-workspace" lang="ko"><Link href="/tools">← 창작도구</Link><header className="tool-section-head"><div><h1>창작도구 피드백</h1><p>오류나 개선할 점을 남겨주세요. 접수된 내용은 운영자만 열람합니다.</p></div></header><ToolFeedback owner={owner}/></main>;
}
