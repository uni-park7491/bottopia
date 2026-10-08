// Generated derivatives are activated only after every file has been uploaded.
export function optimizedMediaKeys(id: string, poster: string | null) {
  const prefix = `optimized/${id}/v1`;
  return poster === `${prefix}/poster.jpg`
    ? { poster, preview: `${prefix}/preview.mp4`, playback: `${prefix}/playback.mp4` }
    : null;
}
