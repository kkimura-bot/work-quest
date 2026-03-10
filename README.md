# ⚔ WORK QUEST
> 在宅勤務管理アプリ — by RegalCast

## 技術スタック
- **フロントエンド**: React 18 + Vite + Tailwind CSS
- **バックエンド**: Firebase (Auth + Firestore)
- **ホスティング**: Netlify

---

## セットアップ手順

### 1. Firebase プロジェクトを作る
1. https://console.firebase.google.com にアクセス
2. 「プロジェクトを追加」→ プロジェクト名: `work-quest`
3. **Authentication** を有効化 → 「メール/パスワード」をオン
4. **Firestore Database** を作成 → ルール: テスト モードで開始
5. プロジェクト設定 → マイアプリ → Webアプリを追加 → 設定値をコピー

### 2. 環境変数を設定する
```bash
cp .env.local.example .env.local
# .env.local を開いて Firebase の値を貼り付ける
```

### 3. 開発サーバーを起動する
```bash
npm install
npm run dev
# → http://localhost:5173 で開く
```

### 4. 最初のユーザーを作る
Firebase Console の Authentication → ユーザーを追加 でアカウントを作成。
Firestore の `users` コレクションに以下のドキュメントを追加：

```json
// ドキュメントID = Firebase Auth の UID
{
  "name": "田中 さくら",
  "email": "sakura@regalcast.com",
  "role": "employee",
  "level": 1,
  "xp": 0,
  "title": "見習い冒険者",
  "createdAt": "2026-03-11T00:00:00Z"
}
```

`role` は `"employee"` または `"manager"` を指定してください。

### 5. Netlify にデプロイする
1. GitHub にコードを push する
2. Netlify でリポジトリを連携 → Build command: `npm run build` / Publish: `dist`
3. 環境変数（VITE_FIREBASE_*）を Netlify の Site settings に設定する

---

## フォルダ構成
```
src/
├── components/
│   └── layout/   AppLayout.jsx（サイドバー）
├── hooks/
│   └── useAuth.jsx（認証Context）
├── lib/
│   ├── firebase.js（Firebase初期化）
│   └── xp.js（XP・レベル計算）
├── pages/
│   ├── Login.jsx
│   └── Home.jsx（マイクエスト）
├── styles/
│   └── index.css
└── main.jsx（ルーター）
```

## 次に追加する画面（Phase 1）
- [ ] `/goals`   週次目標設定
- [ ] `/history` 実績ログ
- [ ] `/status`  マイステータス
- [ ] `/guild`   ギルドダッシュボード（マネージャー）
- [ ] `/guild/:userId` 社員詳細
　
