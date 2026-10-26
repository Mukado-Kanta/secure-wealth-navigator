# 🛡️ Secure Wealth Navigator (安全な資産形成ナビ)

> **100% Client-Side Only / Zero-Knowledge**
> 5,000回モンテカルロ試行 ＆ 楽天証券CSV連携対応のセキュア資産設計シミュレーター

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://secure-wealth-navigator.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 特徴 & セキュリティ設計

### 1. 🛡️ 完全クライアント完結 (Zero-Knowledge)
- 入力された資産情報やCSVデータは、**ブラウザのメモリおよびローカルストレージでのみ処理**されます。
- 外部サーバー、分析追跡（アナリティクス）、広告SDKへの通信は **一切発生しません（0%通信）**。

### 2. 👁️ プライバシー・ステルスモード（覗き見防止）
- ナビゲーションバーの「目のアイコン」をクリックするだけで、すべての金額表示がワンタッチで `••••` に切り替わります。
- カフェ、コワーキングスペース、大学講義室、画面共有時でも周囲の目を気にせず安全にポートフォリオを確認できます。

### 3. 📑 CSV Injection（数式インジェクション）完全無害化
- 楽天証券等の保有残高CSVをインポートおよびエクスポートする際、悪意ある数式記号（`=`, `+`, `-`, `@`, `\t`, `\r`）を自動サニタイズ。
- ExcelやGoogleスプレッドシート連携時のDDE攻撃や数式実行脆弱性を完全に遮断します。

### 4. 🔒 厳格なセキュリティヘッダー (`vercel.json`)
- Content Security Policy (CSP)
- `X-Frame-Options: DENY` (クリックジャッキング遮断)
- `X-Content-Type-Options: nosniff` (MIMEスニッフィング防止)
- `Strict-Transport-Security` (常時HSTS強制)

---

## 🚀 4大コア機能

1. **現実的プランナー (RealisticPlanner)**
   - 幾何ブラウン運動による **5,000回モンテカルロ試行**。
   - 10%（悲観）・50%（中央値）・90%（楽観）の確率信頼区間を可視化。
   - リーマンショック級の暴落シナリオ耐性シミュレーション。
2. **積立・複利シミュレーター (CompoundSimulator)**
   - 毎月積立額、想定利回り、年数に応じた資産推移グラフ。
   - 「元本」と「運用益」の色分け分離。
3. **目標逆算プランナー (GoalPlanner)**
   - 目標資産額と目標達成年齢から、「月々の必要積立額」または「必要リターン」を逆算。
4. **マイ資産ダッシュボード (MyAssets)**
   - 楽天証券の保有商品CSV（`assetbalance(all)_*.csv`）をドラッグ＆ドロップで即座に解析。
   - アセットクラス（外国株、国内株、債券、現金等）の自動分類・円グラフ分析。
   - 安全なJSON / CSVエクスポート・インポート。

---

## 🛠️ ローカル開発・ビルド

```bash
# 依存パッケージインストール
npm install

# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build
```

---

## 📄 免責事項
本シミュレーション結果は確率分布に基づく統計的試算値であり、将来の運用成果を保証するものではありません。実際の投資判断はご自身の責任で行ってください。
