# 超簡易ウォッチリストサーバー

このプロジェクトは、Dockerを使用したウォッチリストサーバーのサンプルです。

## 必要条件

このプロジェクトを実行するには、以下のソフトウェアが必要です。

### Dockerのインストール

#### Windowsの場合

+ [Docker Desktopのインストール手順](https://docs.docker.com/desktop/install/windows-install/)に従って、Docker Desktopをインストールしてください。

#### Ubuntuの場合

+ [Docker Engineのインストール手順](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)に従って、Docker Engineをインストールしてください。

## セットアップ

1. リポジトリをクローンします。

   ```bash
   git clone https://github.com/SPICKEY0965/Watch-list.git
   cd Watch-List
    ```
2. Docker Composeを実行します。

    **注意**: アクションは**root**権限で実行する必要があります。

    ```bach
    docker compose up -d
    ```

## 使用方法

アプリケーションが正常に起動したら、ブラウザで http://serverIP:3000 にアクセスして、アプリケーションを利用できます。

** アクセスできない場合3000, 5000のポートがファイヤーウォールの設定で遮断されていないか確認してください。

## 注意事項

+ 必要に応じて、docker-compose.ymlファイルの設定を変更してください。
+ Dockerが正常に動作するためには、Hyper-VやWSL 2（Windowsの場合）が有効になっていることを確認してください。
+ このリポジトリは適当に作成されており、セキュリティについては考慮されていません。いかなる損害についても当方は一切の責任を追わないことをご留意ください。(プライベートネットワーク内で遊ぶことを推奨します。)
+ なにか不都合があればこのリポジトリは即刻削除します。
