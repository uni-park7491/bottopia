/** Signed, single-object capability from the authenticated upload-ticket endpoint. */
export function uploadTransfer(url: string, file: File, onProgress: (percent: number) => void, createRequest = () => new XMLHttpRequest()): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = createRequest();
    xhr.open('PUT', url);
    xhr.timeout = 600_000;
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.min(99, Math.floor(event.loaded / event.total * 100))); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); }
      else reject(new Error(`파일 전송에 실패했습니다 (${xhr.status}). 연결을 확인하고 다시 시도해주세요.`));
    };
    xhr.onerror = () => reject(new Error('네트워크 연결을 확인하고 다시 시도해주세요. 작성 내용은 유지됩니다.'));
    xhr.ontimeout = () => reject(new Error('전송 시간이 초과되었습니다. 안정적인 연결에서 다시 시도해주세요.'));
    xhr.onabort = () => reject(new Error('파일 전송이 중단되었습니다.'));
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', file);
    xhr.send(body);
  });
}
