const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "count.json");

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, "public")));

// カウントの読み込み
let serverData = { count: 0, personal: {} };
try {
    if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        try {
            const parsed = JSON.parse(fileContent);
            if (typeof parsed.count !== 'undefined') {
                serverData = { count: parsed.count, personal: parsed.personal || {} };
            } else {
                serverData.count = parsed || 0; // 古い形式の互換性
            }
        } catch(e) {
            serverData.count = 0;
        }
    } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify(serverData));
    }
} catch (error) {
    console.error('Error reading count.json:', error);
}

// カウントの保存関数
const saveCount = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(serverData));
    } catch (error) {
        console.error('Error saving count.json:', error);
    }
};

// レート制限用データストア: Map<IP, timestamps[]>
const rateLimiter = new Map();
const MAX_CLICKS_PER_SEC = 50; // 連打ツール対応のため少し緩和
const RATE_LIMIT_WINDOW = 1000; // 1秒(ms)

io.on('connection', (socket) => {
    const clientIp = socket.handshake.address || socket.handshake.headers['x-forwarded-for'] || 'unknown';

    // クライアントの現在の累計クリック数を取得
    const personalCount = serverData.personal[clientIp] || 0;

    // 接続時に現在のカウントと個人の累計を送信
    socket.emit('init', { globalCount: serverData.count, personalCount: personalCount });

    // クリックイベントの受信
    socket.on('click', (reqPower) => {
        const now = Date.now();
        
        // レート制限のチェック
        let timestamps = rateLimiter.get(clientIp) || [];
        timestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
        
        if (timestamps.length >= MAX_CLICKS_PER_SEC) {
            rateLimiter.set(clientIp, timestamps);
            return;
        }

        timestamps.push(now);
        rateLimiter.set(clientIp, timestamps);

        let power = parseInt(reqPower, 10);
        if (isNaN(power) || power < 1 || power > 50) power = 1;

        // 全体カウントと個人カウントを両方増やす
        serverData.count += power;
        serverData.personal[clientIp] = (serverData.personal[clientIp] || 0) + power;
        
        saveCount();
        
        // 全員に新しいカウントを送信 (個人データはクリックした本人にだけ返す)
        io.emit('update', serverData.count);
        socket.emit('personal_update', serverData.personal[clientIp]);
    });
});

// 定期的に rateLimiter の古いデータをクリーンアップ（メモリリーク防止）
setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimiter.entries()) {
        const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
        if (validTimestamps.length === 0) {
            rateLimiter.delete(ip);
        } else {
            rateLimiter.set(ip, validTimestamps);
        }
    }
}, 60000); // 1分ごとにクリーンアップ

// 終了時に確実に保存
process.on('SIGINT', () => {
    saveCount();
    process.exit();
});
process.on('SIGTERM', () => {
    saveCount();
    process.exit();
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
