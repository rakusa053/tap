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
let currentCount = 0;
try {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        currentCount = JSON.parse(data).count || 0;
    } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ count: 0 }));
    }
} catch (error) {
    console.error('Error reading count.json:', error);
}

// カウントの保存関数
const saveCount = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ count: currentCount }));
    } catch (error) {
        console.error('Error saving count:', error);
    }
};

// レート制限用データストア: Map<IP, timestamps[]>
const rateLimiter = new Map();
const MAX_CLICKS_PER_SEC = 10; // 1秒間に許可する最大クリック数
const RATE_LIMIT_WINDOW = 1000; // 1秒(ms)

io.on('connection', (socket) => {
    const clientIp = socket.handshake.address || socket.handshake.headers['x-forwarded-for'];

    // 接続時に現在のカウントを送信
    socket.emit('init', currentCount);

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

        currentCount += power;
        saveCount();
        io.emit('update', currentCount);
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
