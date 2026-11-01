# CAD-Viewer（日本語）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

cad-viewer は、`バックエンドサービスに一切依存せず、完全にブラウザ上で動作する` CAD 図面エディタです。セッションは常に新しい空白の図面から始まり、図面をファイルから読み込んだりファイルへ保存したりすることはありません。
ジオメトリ処理とレンダリングはブラウザ内で直接行われるため、cad-viewer はオフライン利用やプライバシーに配慮が必要なワークフローに最適です。

- [**🌐 ホームページ**](https://mlightcad.com/)
- **🌐 ライブデモ**：[Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API ドキュメント**：[Read the Docs](https://cad-viewer.readthedocs.io/en/latest/)（バージョン管理あり）· [MCP サーバー](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

## 機能

- **高性能** — 大規模な図面を 60 FPS 以上の滑らかなレンダリングで表示
- **バックエンド不要** — ファイルの解析と処理をすべてブラウザ内で完結
- **データセキュリティの強化** — ファイルがデバイス外に出ないため、完全なプライバシーを確保
- **容易な統合** — サーバー設定やバックエンドインフラが不要
- サードパーティ連携に適したモジュラーアーキテクチャ
- **モバイルレイアウトとタッチ操作** — `@mlightcad/cad-simple-viewer` にレスポンシブなスマホ/タブレット UI とタッチジェスチャ（ピンチズーム、単指パン、タップ選択）を内蔵。専用モバイルアプリなしでモバイルブラウザから利用可能
- オフラインおよびオンライン編集ワークフロー
- 高度な最適化手法を備えた THREE.js 3D レンダリングエンジン
- CMS、Notion、WeChat などのプラットフォームとの連携を見据えた拡張性

## はじめに

### 前提条件

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### インストール

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### 開発

```bash
# フル機能ビューア（cad-viewer）を起動
pnpm dev

# またはシンプルビューアを起動
pnpm dev:simple
```

### ビルド

```bash
pnpm build
```

### プレビュー

```bash
# フル機能ビューアをプレビュー
pnpm preview

# シンプルビューアをプレビュー
pnpm preview:simple
```

## 使い方

CAD Viewer を初めてお使いですか？**[ユーザーガイド](https://mlightcad.com/cad-viewer/docs/)** では、ビューアの画面構成、デスクトップ/タッチ操作、マークアップ、計測ツールについて順を追って説明しています。

### デスクトップブラウザ操作
- **選択**：エンティティを左クリック
- **拡大/縮小**：マウスホイールを上下にスクロール
- **パン**：マウス中ボタンを押したままドラッグ
- **消去**：エンティティを選択して `Del` キーを押す

### タブレット/モバイルブラウザ操作
- **選択**：エンティティをタップ
- **ズーム**：2 本指でピンチ
- **パン**：1 本指でドラッグ

## プラグインシステム

CAD-Viewer は [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer) 内のモジュラー **プラグインシステム** を中心に構築されています。プラグインは `AcApPlugin` インターフェースを実装し、`onLoad` / `onUnload` 経由でビューアのライフサイクルにフックします。通常はコマンド登録、UI 追加、エクスポート/インポートパイプラインの接続に使用します。

プラグインは `AcApDocManager.instance.pluginManager`（`loadPlugin`、`registerLazyPlugin`、またはドキュメントマネージャー作成時の `plugins.fromConfig`）から読み込みます。プラグインは **遅延読み込み** をサポートします。起動時に小さなスタブだけを登録し、ユーザーが関連コマンドを実行した時点で重いバンドルをダウンロードします。

モノレポには複数のファーストパーティプラグインが同梱されています。各プラグインは 1 つの関心事に集中しており、必要に応じて組み合わせられます。**インストール、登録、API の詳細は各パッケージの README に記載されています** — 下記リンクを参照してください。

### 公式プラグイン

| パッケージ | 役割 | コマンド / 機能 |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | `cad-simple-viewer` 向け **ツールバー・計測パレット UI**（プレーン DOM、Vue/React 非依存） | `measurementpanel`、デフォルトツールバー（表示、測定、テーマ、ロケール） |

### `@mlightcad/cad-simple-ui-plugin` — シンプルビューア向け UI 層

[`cad-simple-viewer`](packages/cad-simple-viewer) は意図的に **アプリケーション UI を同梱しません** — キャンバスと CAD コアのみです。シンプルビューアを独自 Web アプリに埋め込み、Vue ベースのフル [`cad-viewer`](packages/cad-viewer) シェルを採用せずにすぐ使える UI が必要な場合、**`cad-simple-ui-plugin` が想定される UI 層** です。

提供機能：

- **設定可能なツールバー**（任意の辺に配置、デフォルト CAD コマンド、ネストメニュー、カスタム項目）
- **ドックパネル**：**計測**タブ
- **`COLORTHEME` システム変数とホスト要素上の `--ml-ui-*` CSS トークンとのテーマ同期**
- **`AcApI18n` とのロケール同期**（英語 / 中国語 / チェコ語 / トルコ語）

すべてのウィジェットはフレームワーク非依存（プレーン DOM）です。フル Vue [`cad-viewer`](packages/cad-viewer) アプリは Element Plus UI を内蔵しており、このプラグインは不要です。`cad-simple-viewer` を直接ベースに構築する場合に `cad-simple-ui-plugin` を使用してください。

→ **クイックスタート、ツールバーカスタマイズ、オプション：** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

## パフォーマンス

CAD-Viewer は **卓越したパフォーマンス** 向けに設計されており、高フレームレートを維持しながら非常に大きな図面を処理できます。複数の高度なレンダリング技術でパフォーマンスを最適化しています：

- **カスタムシェーダーマテリアル**：GPU 加速シェーダーマテリアルで複雑な線種とハッチ塗りつぶしパターンを効率的にレンダリング
- **ジオメトリバッチング**：同一マテリアルの点、線、面をマージし、ドローコールを大幅に削減
- **インスタンスレンダリング**：インスタンシング技術で反復ジオメトリのレンダリングを最適化
- **バッファジオメトリ最適化**：効率的なメモリ管理とジオメトリマージングで GPU オーバーヘッドを低減
- **マテリアルキャッシュ**：類似エンティティ間でマテリアルを再利用し、状態変更を最小化
- **WebGL 最適化**：モダン WebGL 機能でハードウェア加速レンダリングを活用

これらの最適化により、CAD-Viewer は数千のエンティティを含む複雑な CAD 図面を滑らかにレンダリングし、応答性の高いユーザー操作を維持します。

## ロードマップ

本プロジェクトの目標は、モジュラーアーキテクチャとフレームワーク非依存の統合を備えた、**ブラウザ上のフル機能 2D AutoCAD ライクシステム**（ビューア + エディタ）を構築することです。

凡例：
- [x] 完了
- [ ] 計画
- [ ] ⏳ 進行中

### コアファイルとデータ層

#### データモデル

* [x] 統一エンティティデータモデル
* [x] レイヤーテーブルサポート
* [x] ブロック / 挿入構造
* [ ] ⏳ Handle と object ID 管理：現在 objectId は handle と同一で、bigint（int64）ではなく 1 つの文字列として表現されている
* [ ] ⏳ XData / 拡張辞書サポート
* [ ] プロキシエンティティ処理

### レンダリングとパフォーマンス

#### レンダリングエンジン

* [x] WebGL ベースレンダリング（Three.js）
* [x] 2D 専用最適化パイプライン
* [x] レイヤーベースのシーン構成
* [x] レイアウト / ペーパースペースレンダリング
* [ ] ビューポートエンティティサポート

#### パフォーマンス最適化

* [x] ジオメトリマージとバッチング
* [x] 空間インデックス（基本）
* [x] 高度な空間インデックス（R-tree / BVH）
* [ ] レベルオブディテール（LOD）レンダリング
* [ ] 超大規模図面向けマルチキャンバス / タイルレンダリング

### 表示とナビゲーション

#### ビュー制御

* [x] パン
* [x] ズーム（ホイール / ボックスズーム）
* [x] 全体表示 / 範囲フィット
* [ ] 名前付きビュー
* [ ] ビュー履歴（ビュー変更の元に戻す / やり直し）

#### 表示制御

* [x] 線幅表示
* [ ] 線種スケーリング
* [x] 背景 / テーマ切り替え

### 選択と操作

#### 選択

* [x] 単一エンティティ選択
* [x] 選択エンティティのハイライト
* [x] ウィンドウ選択
* [x] クロシング選択
* [x] 選択フィルター（タイプ / レイヤー別）
* [x] 選択サイクリング

#### スナップ（OSNAP）

* [x] 端点
* [x] 中点
* [x] 中心
* [x] 交点
* [ ] 垂線 / 接線
* [x] 最近点
* [ ] スナップトラッキング


### 編集と変更

#### 基本編集

* [x] エンティティ編集フレームワーク
* [x] 移動
* [x] コピー
* [x] 回転
* [ ] スケール
* [x] 削除
* [x] 元に戻す / やり直し

#### ジオメトリ編集

* [x] グリップポイント
* [ ] ストレッチ
* [ ] トリム
* [ ] 延長
* [x] オフセット
* [ ] 分解
* [ ] 結合 / フィレット / 面取り（2D）

### 作図と作成ツール

#### 基本エンティティ

* [x] 線分
* [x] ポリライン
* [x] スプライン
* [x] 円
* [x] 円弧
* [x] 楕円
* [x] 矩形 / 多角形

#### 高度なエンティティ

* [x] ハッチ
* [ ] テキスト（単一行 / 複数行）
* [ ] 寸法（線形、位置合わせ、角度）
* [ ] ブロック作成と挿入

### 測定

* [x] 距離
* [x] 弧長
* [x] 面積
* [x] 角度
* [ ] 座標
* [ ] エンティティ統計（長さ、面積、数）

### 寸法

* [x] 線形寸法
* [ ] 角度寸法
* [ ] 座標

### プロパティと UI パネル

#### プロパティパレット

* [x] 選択エンティティのプロパティ
* [ ] 色、線種の編集
* [x] 変更時のライブ更新

#### パネルと UI

* [ ] ブロックマネージャー
* [x] コマンド履歴 / コンソール
* [x] ステータスバー（スナップ、直交、グリッド）

#### コマンドシステム

* [x] コマンドレジストリ
* [x] コマンドエイリアス
* [x] コマンドプロンプト（AutoCAD スタイル）

### 統合と拡張性

#### フレームワーク統合

* [x] フレームワーク非依存コア
* [ ] React 統合サンプル
* [x] Vue 統合サンプル
* [ ] OpenLayers / マップ統合
* [ ] CMS / Notion 埋め込み

#### プラグインシステム

* [x] プラグイン API
* [ ] カスタムエンティティサポート
* [x] カスタムコマンド

### オフラインとオンライン編集

#### オフラインエディタ

* [x] ブラウザ内ローカル編集
* [ ] 変更セット / diff の保存
* [ ] IndexedDB 永続化

#### オンラインエディタ

* [ ] バックエンド API 設計
* [ ] ユーザー認証
* [ ] ファイルバージョン管理
* [ ] マルチユーザーアクセス制御
* [ ] リアルタイムコラボレーション（将来）

### プラットフォーム目標

* [ ] WeChat Mini Program ビューア
* [x] モバイルブラウザサポート（レスポンシブレイアウトとタッチ操作）

### ドキュメントとコミュニティ

* [x] アーキテクチャドキュメント
* [x] API リファレンス
* [ ] コントリビューションガイド
* [x] サンプルプロジェクト
* [x] ロードマップとチェンジログのメンテナンス

このロードマップは意図的に細分化されており、コントリビューターが **存在する機能**、**不足している機能**、**支援が必要な領域** を明確に把握できるようにしています。

## コントリビューション

コントリビューションを歓迎します！バグ修正、新機能、提案については issue または pull request を開いてください。バグ報告では、問題のある図面へのリンクを提供いただくと、再現と修正に役立ちます。

## ライセンス

cad-viewer モノレポは主に [MIT](LICENSE) ライセンスです。