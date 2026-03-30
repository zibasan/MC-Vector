export default function NgrokGuideView() {
  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="ngrok-guide-view">
      <h1 className="ngrok-guide-view__title">🌐 ポート開放不要化 (ngrok) 設定ガイド</h1>

      <div className="ngrok-guide-view__intro">
        <p className="ngrok-guide-view__intro-text">
          この機能を使うと、難しいルーターの設定（ポート開放）をせずに、世界中の友達をあなたのサーバーに招待できます。
          <br />
          利用には無料の <strong>ngrokアカウント</strong> と <strong>認証トークン</strong>{' '}
          が必要です。
        </p>
      </div>

      <div className="ngrok-guide-view__summary-grid">
        <div className="ngrok-guide-view__summary-card">
          <div className="ngrok-guide-view__summary-label">必要なもの</div>
          <div className="ngrok-guide-view__summary-value">ngrok アカウント</div>
          <div className="ngrok-guide-view__summary-note">無料プランで開始できます。</div>
        </div>
        <div className="ngrok-guide-view__summary-card">
          <div className="ngrok-guide-view__summary-label">取得する情報</div>
          <div className="ngrok-guide-view__summary-value">Authtoken</div>
          <div className="ngrok-guide-view__summary-note">アプリの初回接続時に必要です。</div>
        </div>
        <div className="ngrok-guide-view__summary-card">
          <div className="ngrok-guide-view__summary-label">共有形式</div>
          <div className="ngrok-guide-view__summary-value">tcp://host:port</div>
          <div className="ngrok-guide-view__summary-note">
            表示されるアドレスを友達に共有します。
          </div>
        </div>
      </div>

      <div className="ngrok-guide-view__checklist-panel">
        <h2 className="ngrok-guide-view__checklist-title">接続前チェック</h2>
        <ul className="ngrok-guide-view__checklist">
          <li>サーバーが起動済みで、ローカル接続できる</li>
          <li>ngrokアカウントのログイン状態を確認済み</li>
          <li>トークン文字列を安全に保管できる状態</li>
        </ul>
      </div>

      <div className="ngrok-guide-view__step">
        <div className="ngrok-guide-view__step-badge">Step 1</div>
        <h3>公式サイトへアクセス</h3>
        <p>
          ngrokの公式サイトにアクセスし、アカウントを作成（Sign up）またはログインしてください。
        </p>
        <button
          className="btn-primary ngrok-guide-view__cta-btn"
          onClick={() => openLink('https://dashboard.ngrok.com/get-started/your-authtoken')}
        >
          ngrok ダッシュボードを開く
        </button>
        <div className="ngrok-guide-view__tip-box">
          初回はダッシュボードの案内に従ってインストール案内が表示されますが、本アプリではバイナリ管理を内部で行うためトークン取得だけで十分です。
        </div>
      </div>

      <div className="ngrok-guide-view__step">
        <div className="ngrok-guide-view__step-badge">Step 2</div>
        <h3>Authtoken (認証トークン) をコピー</h3>
        <p>
          ダッシュボードの左メニューから <strong>"Your Authtoken"</strong> をクリックします。
          <br />
          ページ上部に表示されている <code>2A...</code>{' '}
          などから始まる長い文字列をコピーしてください。
        </p>
        <div className="ngrok-guide-view__token-example">
          例: 2Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxxxxxxx
        </div>
        <p className="ngrok-guide-view__note ngrok-guide-view__note--warning">
          セキュリティ注意:
          このトークンはパスワード同等です。チャットや配信画面へ貼り付けないでください。
        </p>
      </div>

      <div className="ngrok-guide-view__step">
        <div className="ngrok-guide-view__step-badge">Step 3</div>
        <h3>アプリに入力して接続</h3>
        <p>
          このアプリの <strong>General Settings</strong> タブに戻り、スイッチをONにしてください。
          <br />
          トークンの入力を求められるので、先ほどコピーした文字列を貼り付けてください。
        </p>
        <p className="ngrok-guide-view__note">
          ※ アドレスは毎回変わります。遊ぶたびに新しいアドレスを友達に教えてあげてください。
        </p>
        <div className="ngrok-guide-view__tip-box">
          接続テスト手順:
          表示アドレスをコピーし、別PCまたは友人環境から直接参加して確認します。入れない場合はサーバー側ログを先に確認してください。
        </div>
      </div>
    </div>
  );
}
