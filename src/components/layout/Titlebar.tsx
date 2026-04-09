export function Titlebar() {
  const minimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      getCurrentWindow().minimize()
    } catch {}
  }
  const maximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      getCurrentWindow().toggleMaximize()
    } catch {}
  }
  const close = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      getCurrentWindow().close()
    } catch {}
  }

  return (
    <div className="titlebar" data-tauri-drag-region>
      <span className="text-[11px] text-[var(--text-3)] font-medium tracking-wider pl-2"
            data-tauri-drag-region>
        KIRITCLIENT
      </span>
      <div className="titlebar-controls">
        <button className="titlebar-btn maximize" onClick={maximize} />
        <button className="titlebar-btn minimize" onClick={minimize} />
        <button className="titlebar-btn close" onClick={close} />
      </div>
    </div>
  )
}
