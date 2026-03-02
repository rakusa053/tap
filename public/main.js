const socket = io();

const counterDisplay = document.getElementById('counter');
const tapBtn = document.getElementById('tap-btn');
const counterContainer = document.querySelector('.counter-display');

// アニメーション用クラスの付与
const animateCounter = () => {
    counterContainer.classList.add('pop');
    setTimeout(() => {
        counterContainer.classList.remove('pop');
    }, 100);
};

// 初期カウントの受信
socket.on('init', (count) => {
    counterDisplay.textContent = count;
});

// カウント更新の受信
socket.on('update', (count) => {
    counterDisplay.textContent = count;
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
