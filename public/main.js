const socket = io();

const counterDisplay = document.getElementById('counter');
const goalDisplay = document.getElementById('goal');
const hoverExact = document.getElementById('hover-exact');
const tapBtn = document.getElementById('tap-btn');
const counterContainer = document.querySelector('.counter-display');
const progressFill = document.getElementById('progress-fill');
const powerDisplay = document.getElementById('power-display');

const shopBtn = document.getElementById('shop-btn');
const shopPanel = document.getElementById('shop-panel');
const achievementsBtn = document.getElementById('achievements-btn');
const achievementsPanel = document.getElementById('achievements-panel');

// Toggle Panels
shopBtn.addEventListener('click', () => {
    shopPanel.classList.toggle('hidden');
    achievementsPanel.classList.add('hidden'); // Close the other
});

achievementsBtn.addEventListener('click', () => {
    achievementsPanel.classList.toggle('hidden');
    shopPanel.classList.add('hidden'); // Close the other
});

// Local user stats (Now synchronized with Server via IP)
let personalCount = 0;

// Colors for power levels
const powerColors = {
    1: { main: '#222222', shadow: '#111111' }, // Default Dark
    2: { main: '#4facfe', shadow: '#00f2fe' }, // Blue
    3: { main: '#43e97b', shadow: '#38f9d7' }, // Green
    4: { main: '#b19cd9', shadow: '#775ada' }, // Purple
    5: { main: '#ff0844', shadow: '#ffb199' }, // Red
    6: { main: '#f6d365', shadow: '#fda085' }, // Gold
    7: { main: '#000000', shadow: '#ff0000' }  // Ultimate
};

// Power thresholds based on personal contribution
function getPower(count) {
    if (count >= 1000000) return 7;
    if (count >= 100000) return 6;
    if (count >= 10000) return 5;
    if (count >= 1000) return 4;
    if (count >= 100) return 3;
    if (count >= 10) return 2;
    return 1;
}

let currentPower = Math.min(getPower(personalCount), 7);
let currentGlobalCount = 0;
let currentGoal = 1000;

function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
}

function getGoal(count) {
    if (count < 1000) return 1000;
    let exp = Math.floor(Math.log10(count)); 
    let base = Math.pow(10, exp);
    return base * 10;
}

function getPrevGoal(goal) {
    if (goal <= 1000) return 0;
    return goal / 10;
}

function updateTheme() {
    const pLevel = Math.min(currentPower, 7);
    const colors = powerColors[pLevel] || powerColors[1];
    document.documentElement.style.setProperty('--theme-color', colors.main);
    document.documentElement.style.setProperty('--box-shadow-color', colors.shadow);
    powerDisplay.textContent = `+${currentPower} click`;
    
    if (currentPower >= 6) {
        tapBtn.style.textShadow = `0 0 5px #fff`;
    }
}

const updateUI = (count) => {
    currentGlobalCount = count;
    counterDisplay.textContent = formatNumber(count);
    hoverExact.textContent = count.toLocaleString();
    
    const newGoal = getGoal(count);
    
    if (newGoal > currentGoal) {
        // Celebration!
        progressFill.classList.add('celebrate');
        setTimeout(() => progressFill.classList.remove('celebrate'), 500);
        currentGoal = newGoal;
    } else if (count === 0 && newGoal !== currentGoal) {
        currentGoal = getGoal(count);
    }
    
    goalDisplay.textContent = formatNumber(currentGoal);
    
    const prevGoal = getPrevGoal(currentGoal);
    const percentage = Math.max(0, Math.min(((count - prevGoal) / (currentGoal - prevGoal)) * 100, 100));
    progressFill.style.width = percentage + '%';
};

const animateCounter = () => {
    counterContainer.classList.add('pop');
    setTimeout(() => {
        counterContainer.classList.remove('pop');
    }, 100);
};

socket.on('init', (data) => {
    typeof data === 'object' ? personalCount = data.personalCount : personalCount = 0;
    const count = typeof data === 'object' ? data.globalCount : data;
    
    currentPower = Math.min(getPower(personalCount), 7);
    currentGoal = getGoal(count);
    updateTheme();
    updateUI(count);
});

socket.on('update', (count) => {
    updateUI(count);
    animateCounter();
});

socket.on('personal_update', (pCount) => {
    personalCount = pCount;
    const newPower = getPower(personalCount);
    if (newPower > currentPower) {
        currentPower = newPower;
        updateTheme();
        
        powerDisplay.classList.add('pop');
        setTimeout(() => powerDisplay.classList.remove('pop'), 200);
    }
});

tapBtn.addEventListener('click', function(e) {
    // サーバーへクリックイベント送信
    // サーバー側で計算されるため、ローカルでの計算・保存は撤去
    socket.emit('click', currentPower);


    animateCounter();

    // 波紋エフェクト
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripples = document.createElement('span');
    ripples.style.left = x + 'px';
    ripples.style.top = y + 'px';
    ripples.classList.add('ripple');
    
    this.appendChild(ripples);
    
    setTimeout(() => {
        ripples.remove();
    }, 600);
});
