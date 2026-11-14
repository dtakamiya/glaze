import { useEffect } from 'react'

export const OFUSE_SCRIPT_SRC = 'https://ofuse.me/assets/platform/widget.js'
const OFUSE_USER_ID = '234231'
const OFUSE_URL = `https://ofuse.me/o?uid=${OFUSE_USER_ID}`

/** 公式ウィジェットを 1 回だけ読み込む（外部通信が発生する唯一の箇所）。 */
function loadWidgetScript(): void {
  if (document.querySelector(`script[src="${OFUSE_SCRIPT_SRC}"]`) !== null) return
  const script = document.createElement('script')
  script.src = OFUSE_SCRIPT_SRC
  script.async = true
  script.charset = 'utf-8'
  document.body.appendChild(script)
}

/** 開発者への応援ボタン（OFUSE）。ウィジェットが読み込めなくても、通常のリンクとして動く。 */
export function OfuseButton() {
  useEffect(loadWidgetScript, [])

  return (
    <a
      className="button button--ghost ofuse"
      data-ofuse-widget-button
      href={OFUSE_URL}
      data-ofuse-id={OFUSE_USER_ID}
      target="_blank"
      rel="noopener noreferrer"
    >
      OFUSEで応援を送る
    </a>
  )
}
