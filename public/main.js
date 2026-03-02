const socket = io();

const counterDisplay = document.getElementById('counter');
const tapBtn = document.getElementById('tap-btn');
const counterContainer = document.querySelector('.counter-display');
const progressFill = document.getElementById('progress-fill');

const GOAL = 1000; // 満タンになる目標値（とりあえず1000）

// UIの更新関数
const updateUI = (count) => {
    counterDisplay.textContent = count;
    
    // プログレスバーの計算 (0% 〜 100%)
    const percentage = Math.min((count / GOAL) * 100, 100);
    progressFill.style.width = percentage + '%';
    
    // 1000を超えたら色を変えるなどの演出（おまけ）
    if(count >= GOAL) {
        progressFill.style.background = 'linear-gradient(90deg, #fceabb, #f8b500)';
    } else {
        progressFill.style.background = 'linear-gradient(90deg, #ff416c, #ff4b2b)';
    }
};

// アニメーション用クラスの付与
const animateCounter = () => {
    counterContainer.classList.add('pop');
    setTimeout(() => {
        counterContainer.classList.remove('pop');
    }, 100);
};

// 初期カウントの受信
socket.on('init', (count) => {
    updateUI(count);
});

// カウント更新の受信
socket.on('update', (count) => {
    updateUI(count);
    animateCounter();
});

// ボタンクリック時の処理
tapBtn.addEventListener('click', function(e) {
    // サーバーへクリックイベント送信
    socket.emit('click');

    // ローカル側でも即座にアニメーション (フィードバック用)
    animateCounter();

    // 波紋エフェクト
    const x = e.clientX - e.target.offsetLeft;
    const y = e.clientY - e.target.offsetTop;
    
    const ripples = document.createElement('span');
    ripples.style.left = x + 'px';
    ripples.style.top = y + 'px';
    ripples.classList.add('ripple');
    
    this.appendChild(ripples);
    
    setTimeout(() => {
        ripples.remove();
    }, 600);
});
