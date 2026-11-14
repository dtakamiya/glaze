interface UpgradeNoticeProps {
  onDismiss: () => void
}

/** 以前のバージョンから引き継いだ利用者向けの、新機能の案内。閉じるまで出す。 */
export function UpgradeNotice({ onDismiss }: UpgradeNoticeProps) {
  return (
    <section className="guide" aria-labelledby="upgrade-title">
      <h2 id="upgrade-title" className="guide__title">
        新しくなりました
      </h2>
      <ul className="guide__list">
        <li>「計画」タブで、次回の洗車の予定とメニュー（コーティング補充・水シミ除去）を確認できます。</li>
        <li>工程が BEAUTIFUL CARS 流になりました。これまでの工程の並びはそのままです。新しい標準の工程にしたいときは、画面下の「初期プランに戻す」を押してください（追加・削除した工程とチェックは消えますが、施工履歴は残ります）。</li>
        <li>各工程の「コツ」と、所要時間の目安も見られます。</li>
      </ul>
      <button type="button" className="button button--ghost" onClick={onDismiss}>
        閉じる
      </button>
    </section>
  )
}
