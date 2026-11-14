/** 履歴が無い間だけ出す、最初の使い方の案内（保存せず、最初の記録で自然に消える）。 */
export function FirstRunGuide() {
  return (
    <section className="guide" aria-labelledby="guide-title">
      <h2 id="guide-title" className="guide__title">
        はじめに
      </h2>
      <ol className="guide__list">
        <li>洗車しながら、終えた工程にチェックを付けます（「コツ」で手順のポイントも見られます）。</li>
        <li>終わったら「施工を記録」を押すと、履歴に残ります。</li>
        <li>「計画」タブに、次回の予定と洗車メニューが出ます。</li>
      </ol>
    </section>
  )
}
