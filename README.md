# 超簡易ウォッチリストサーバー

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/index.html)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

お気に入りのメディアコンテンツ（映画、ドラマなど）を記録・管理し、自身の視聴傾向や好みを分析するためのウォッチリストWebアプリケーションです。

## ✨ 主な機能

このアプリケーションには、コンテンツ管理をより豊かにするための様々な機能が搭載されています。

- **コンテンツの簡単登録:** URL(Amazon Prime Video)を貼り付けるだけで、タイトル、概要、画像などのメタデータを自動で取得し、コンテンツを登録できます。
- **ウォッチリスト管理:** 観たいもの、観たものをリストで管理し、評価や感想を記録できます。
- **視聴傾向の分析・可視化:** 登録したコンテンツのデータを基に、あなたの好みを分析します。キーワードのワードクラウドや、ジャンル・属性のチャートなどで、自身の傾向を視覚的に把握できます。
- **柔軟な検索・フィルタリング:** タイトル、タグ、評価などで、登録したコンテンツを簡単に検索・絞り込みできます。

---

## 📚 目次

- [超簡易ウォッチリストサーバー](#watch-list-app)
  - [✨ 主な機能](#-主な機能)
  - [📚 目次](#-目次)
  - [🛠️ 環境](#️-環境)
  - [📁 ディレクトリ構成](#-ディレクトリ構成)
  - [🚀 開発環境構築](#-開発環境構築)
    - [1. リポジトリのクローン](#1-リポジトリのクローン)
    - [2. 環境変数の設定](#2-環境変数の設定)
    - [3. コンテナの起動](#3-コンテナの起動)
    - [4. 動作確認](#4-動作確認)
  - [⚙️ コマンド一覧](#️-コマンド一覧)
  - [🤔 トラブルシューティング](#-トラブルシューティング)

---

## 🛠️ 環境

本プロジェクトで使用している主要な技術とそのバージョンです。

| カテゴリ | 技術 | バージョン |
| :--- | :--- | :--- |
| **フロントエンド** | Next.js | `^15.4.1` |
| | React | `^19` |
| | TypeScript | `^5` |
| **バックエンド** | Hono | `^4.8.5` |
| | Node.js | (Dockerfile参照) |
| | Sequelize | `^6.37.7` |
| **データベース** | SQLite | `^5.1.7` |
| **その他** | Docker | - |

---

## 📁 ディレクトリ構成

```
.
├── .github
│   └── workflows
├── backend
│   ├── Dockerfile
│   ├── example.env
│   ├── package.json
│   ├── server.js
│   └── ...
├── components
│   ├── AddEditContentsDialog.tsx
│   ├── WatchListComponent.tsx
│   └── ...
├── public
├── app
│   ├── home
│   │   └── page.tsx
│   ├── login
│   │   └── page.tsx
│   └── ...
├── Dockerfile
├── docker-compose.yml
├── next.config.mjs
├── package.json
└── README.md
```

---

## 🚀 開発環境構築

以下の手順に従って、開発環境を構築します。

### 1. リポジトリのクローン

```bash
git clone https://github.com/SPICKEY0965/watch-list-docker.git
cd watch-list-docker
```

### 2. 環境変数の設定

フロントエンドとバックエンド、それぞれの環境変数ファイルを作成します。

**フロントエンド**

```bash
cp .env.example .env
```

` .env` ファイルをエディタで開き、バックエンドAPIのURLを設定します。

| 変数名 | 役割 | 設定例 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | バックエンドAPIサーバーのURL | `http://localhost:5000` |

**バックエンド**

```bash
cp backend/.env.example backend/.env
```

`backend/.env` ファイルをエディタで開き、各項目を設定してください。

| 変数名 | 役割 | 設定例 |
| :--- | :--- | :--- |
| `JWT_SECRET` | JWT署名用の秘密鍵 | `your-super-secret-key` |
| `INTERNAL_DOMAINS` | 内部アクセスを許可するドメイン | `localhost:3000` |
| `WHITE_LIST` | メタデータ取得を許可するドメイン | `trusted-image-server.com` |
| `OLLAMA_API_URL` | Ollamaの埋め込みAPIエンドポイント | `http://host.docker.internal:11434/api/embeddings` |
| `OLLAMA_EMBEDDING_MODEL` | 使用する埋め込みモデル名 | `nomic-embed-text` |

### 3. コンテナの起動

Dockerコンテナをビルドし、起動します。

```bash
docker-compose up --build -d
```

### 4. 動作確認

ブラウザで以下のURLにアクセスし、アプリケーションが表示されることを確認してください。

- **フロントエンド:** [http://localhost:3000](http://localhost:3000)
- **バックエンド:** [http://localhost:5000](http://localhost:5000)

---

## ⚙️ コマンド一覧

本プロジェクトでよく使用するコマンドの一覧です。

| コマンド | 実行する処理 |
| :--- | :--- |
| `docker-compose up --build -d` | コンテナをビルドしてバックグラウンドで起動します。 |
| `docker-compose down` | コンテナを停止・削除します。 |
| `docker-compose logs -f` | 全てのコンテナのログをリアルタイムで表示します。 |
| `docker-compose exec backend node migrate.js` | データベースのマイグレーションを実行します。 |
| `npm run dev` (ルート) | フロントエンドの開発サーバーを起動します。 |
| `npm run build` (ルート) | フロントエンドのプロダクションビルドを生成します。 |

---

## 🤔 トラブルシューティング

| エラー内容 | 解決策 |
| :--- | :--- |
| `backend/.env: no such file or directory` | `backend/example.env` をコピーして `backend/.env` ファイルを作成してください。 |
| `docker daemon is not running` | Docker Desktopが起動しているか確認してください。 |
| `Ports are not available: address already in use` | 使用中のポート（3000や5000など）を停止するか、`docker-compose.yml`でポート番号を変更してください。 |  

### Dockerのインストール

#### Windowsの場合

- [Docker Desktopのインストール手順](https://docs.docker.com/desktop/install/windows-install/) に従ってDocker Desktopをインストールしてください。

#### Ubuntuの場合

- [Docker Engineのインストール手順](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository) に従ってDocker Engineをインストールしてください。

---

## 注意事項

- 必要に応じて、`docker-compose.yml`ファイルの設定を変更してください。
- Dockerが正常に動作するためには、Hyper-VやWSL 2が有効化されていることを確認してください。
- このリポジトリは適当に作成されており、セキュリティについては考慮されていません。いかなる損害についても当方は一切の責任を追わないことをご留意ください。(プライベートネットワーク内での使用を推奨します。)
- Git初心者なためかなり醜いリポジトリとなっておりますがご容赦ください...

[▲ トップへ戻る](#watch-list-app)
