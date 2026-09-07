export async function copyText(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

export const clipboardError = {
  ko: '복사하지 못했어요. 브라우저의 클립보드 권한을 확인하거나 텍스트를 직접 복사해주세요.',
  en: 'Could not copy. Check clipboard permission or select and copy the text manually.',
  zh: '复制失败，请检查剪贴板权限或手动选择并复制文本。',
  ja: 'コピーできませんでした。権限を確認するか、テキストを選択してコピーしてください。',
} as const;
