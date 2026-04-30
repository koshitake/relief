# Next.js 開発環境用 Dockerfile
# ベースイメージ: Node.js 20 Alpine（軽量版）
FROM node:20-alpine

# 作業ディレクトリをコンテナ内に設定する
WORKDIR /app/frontend

# package.json と package-lock.json を先にコピーする
# （ソースコード変更時に npm install のキャッシュが効くようにするため）
COPY frontend/package*.json ./

# 依存パッケージをインストールする
RUN npm install

# 開発サーバーを起動する
# --hostname 0.0.0.0 でコンテナ外からのアクセスを受け付ける
CMD ["npm", "run", "dev"]
