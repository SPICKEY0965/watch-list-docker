# 超簡易ウォッチリストサーバー

このプロジェクトは、Dockerを利用して簡単に構築可能なウォッチリストサーバーのサンプルです。

---

## 必要条件

このプロジェクトを実行するためには、以下のソフトウェアが必要です。
- Docker
- Docker Compose

### Dockerのインストール

#### Windowsの場合

- [Docker Desktopのインストール手順](https://docs.docker.com/desktop/install/windows-install/) に従ってDocker Desktopをインストールしてください。

#### Ubuntuの場合

- [Docker Engineのインストール手順](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository) に従ってDocker Engineをインストールしてください。

---

## セットアップ

1. リポジトリをクローンします。

   ```bash
   git clone https://github.com/SPICKEY0965/watch-list-docker.git

   cd watch-list-docker
   ```

2. 環境変数を設定します。

   - **APIサーバーのアドレス**を設定

     ```properties
     # ./.env
     NEXT_PUBLIC_API_URL=https://api.example.com:port
     ```

   - **JWT認証のキー**を設定

     ```properties
     # ./backend/.env
     JWT_SECRET=your_secret_key
     ```

3. Docker Composeを実行します。

   **注意**: このコマンドは「**root権限**」で実行する必要があります。

   ```bash
   docker compose up -d --build
   ```

---

## 使用方法

アプリケーションが正常に起動したら、ブラウザで [http://example.com:3000](http://serverIP:3000) にアクセスして、アプリを利用できます。

PWAに対応しており、アクセス後ホーム画面に追加すると以下の機能が利用可能になります。
- オフライン使用
- ストリーミングアプリへの直接画面転移

**注意**: アクセスできない場合は、3000、または5000ポートがファイヤーウォールの設定で無効化されていないかを確認してください。

---

## 注意事項

- 必要に応じて、`docker-compose.yml`ファイルの設定を変更してください。
- Dockerが正常に動作するためには、Hyper-VやWSL 2が有効化されていることを確認してください。
- このリポジトリは適当に作成されており、セキュリティについては考慮されていません。いかなる損害についても当方は一切の責任を追わないことをご留意ください。(プライベートネットワーク内での使用を推奨します。)
- Git初心者なためかなり醜いリポジトリとなっておりますがご容赦ください...
