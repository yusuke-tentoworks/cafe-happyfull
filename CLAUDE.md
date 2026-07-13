# カフェ はぴふる（cafe-happyfull）

## プロジェクト概要
- **顧客名 / 目的**: カフェ はぴふる（代表 水谷順子 様）／担当: 井上裕介
- **本番URL**: Netlify管理画面を参照
- **プレビュー環境**: `test` ブランチ → GitHub Pages（Netlifyの無料ビルド時間節約のため。`?contentId=...&draftKey=...` 付与で下書き記事のハイブリッドプレビュー可）
- **技術スタック**: 静的HTML + Vanilla CSS/JS + microCMS（お知らせ・メニュー管理） / Netlify

## 起動・ビルドコマンド
- 開発サーバー: `npx serve .`（ローカル確認用）
- デプロイ: **mainへのマージでNetlifyが自動ビルド・公開**。プレビューは `test` ブランチへpush

## 運用ルール
- コーディング規約は `tentoworks-dev-rules/ai-coding-guidelines/03_coding_management_guidelines.md`、セキュリティは `01_security_guidelines.md`、SEOは `02_seo_performance_guidelines.md` に従う。
- microCMS入稿コンテンツの原稿は `microcms-content` リポジトリで管理する。
- 公開前・大きな修正後は `/legal-check` `/qa-check` を実施する。
- セッション開始時に `進捗ログ.md` を読み、終了時に追記する。詳細は `PROJECT_MEMO.md` を参照。

## 注意事項・制約
- **Netlifyの無料ビルド枠を節約する運用**。日常の確認は `test` ブランチ（GitHub Pages）で行い、mainへのマージは本番公開の意思があるときのみ。
- GA4は顧客のご要望により**導入しない**（提案不要）。
- microCMS APIキーはコードに書かない（サーバーレス関数・環境変数で保護）。
- 写真はダミー・AI生成画像を暫定使用中 → 実写真への差し替えとライセンス確認が未了。
