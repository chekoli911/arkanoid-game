// ============================================
// АРКАНОИД - Мобильная HTML5 игра
// ============================================

// Получение элементов DOM
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const winScreen = document.getElementById('winScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartWinBtn = document.getElementById('restartWinBtn');
const restartGameOverBtn = document.getElementById('restartGameOverBtn');
const levelDisplay = document.getElementById('levelDisplay');
const ballsDisplay = document.getElementById('ballsDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const levelSelectScreen = document.getElementById('levelSelectScreen');
const pauseScreen = document.getElementById('pauseScreen');
const resumeBtn = document.getElementById('resumeBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const menuFromPauseBtn = document.getElementById('menuFromPauseBtn');
const levelGrid = document.getElementById('levelGrid');
const soundToggle = document.getElementById('soundToggle');

// ============================================
// КОНСТАНТЫ И ПЕРЕМЕННЫЕ ИГРЫ
// ============================================

// Адаптивные размеры в зависимости от размера экрана
function getAdaptiveSizes() {
    const isMobile = window.innerWidth < 768;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    if (isMobile) {
        // Мобильные устройства
        const blockWidth = Math.max(25, Math.floor(screenWidth / 12));
        const blockHeight = Math.max(15, Math.floor(blockWidth * 0.5));
        return {
            PADDLE_HEIGHT: Math.max(12, Math.floor(screenHeight * 0.02)),
            PADDLE_WIDTH: Math.max(80, Math.floor(screenWidth * 0.25)),
            BALL_RADIUS: Math.max(6, Math.floor(screenWidth * 0.015)),
            BLOCK_WIDTH: blockWidth,
            BLOCK_HEIGHT: blockHeight,
            BLOCK_PADDING: Math.max(2, Math.floor(blockWidth * 0.1)),
            BALL_SPEED: 4,
            PADDLE_SPEED: 6
        };
    } else {
        // Десктоп
        return {
            PADDLE_HEIGHT: 15,
            PADDLE_WIDTH: 100,
            BALL_RADIUS: 8,
            BLOCK_WIDTH: 40,
            BLOCK_HEIGHT: 20,
            BLOCK_PADDING: 5,
            BALL_SPEED: 5,
            PADDLE_SPEED: 8
        };
    }
}

// Инициализация размеров игры
let gameSizes;
let PADDLE_HEIGHT;
let PADDLE_WIDTH;
let BALL_RADIUS;
let BLOCK_WIDTH;
let BLOCK_HEIGHT;
let BLOCK_PADDING;
let BALL_SPEED;
let PADDLE_SPEED;

// Функция для обновления размеров
function updateGameSizes() {
    gameSizes = getAdaptiveSizes();
    PADDLE_HEIGHT = gameSizes.PADDLE_HEIGHT;
    PADDLE_WIDTH = gameSizes.PADDLE_WIDTH;
    BALL_RADIUS = gameSizes.BALL_RADIUS;
    BLOCK_WIDTH = gameSizes.BLOCK_WIDTH;
    BLOCK_HEIGHT = gameSizes.BLOCK_HEIGHT;
    BLOCK_PADDING = gameSizes.BLOCK_PADDING;
    BALL_SPEED = gameSizes.BALL_SPEED;
    PADDLE_SPEED = gameSizes.PADDLE_SPEED;
}

// Настройка canvas под размер экрана
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateGameSizes();
}

// Инициализация размеров
updateGameSizes();
resizeCanvas();

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        resizeCanvas();
        if (gameState === 'playing') {
            // Пересоздаем уровень при изменении ориентации
            generateLevel(currentLevel);
        }
    }, 100);
});

let gameState = 'start'; // 'start', 'playing', 'win', 'gameover'
let currentLevel = 1;
let balls = [];
let blocks = [];
let hearts = []; // Падающие сердца
let paddle = null;
let touchX = 0;
let isTouching = false;
let score = 0; // Счет игрока
let lives = 3; // Количество жизней
let lastHeartScore = 0; // Счет, при котором последний раз упало сердце
let lastPlatformBonusScore = 0; // Счет, при котором последний раз был бонус платформы
let scoreAnimations = []; // Анимации очков
let platformBonuses = []; // Падающие бонусы расширения платформы
let paddleWide = false; // Платформа расширена
let paddleWideTimer = 0; // Таймер расширенной платформы
let gamePaused = false; // Пауза игры
let tapCount = 0; // Счетчик тапов для паузы
let lastTapTime = 0; // Время последнего тапа
let soundEnabled = true; // Звук включен по умолчанию
// Функции для сохранения и загрузки прогресса
function saveProgress() {
    try {
        localStorage.setItem('arkanoid_unlockedLevels', unlockedLevels.toString());
    } catch (e) {
        console.log('Не удалось сохранить прогресс:', e);
    }
}

function loadProgress() {
    try {
        const saved = localStorage.getItem('arkanoid_unlockedLevels');
        if (saved !== null) {
            return parseInt(saved, 10);
        }
    } catch (e) {
        console.log('Не удалось загрузить прогресс:', e);
    }
    return 1; // По умолчанию открыт только первый уровень
}

let unlockedLevels = loadProgress(); // Загружаем сохраненный прогресс

// Управление с клавиатуры
let keys = {
    left: false,
    right: false
};

// ============================================
// КЛАССЫ ИГРЫ
// ============================================

// Класс платформы
class Paddle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    update() {
        // Ограничение движения платформы в пределах экрана
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
        }
    }

    draw() {
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 10);
        ctx.fill();
        
        // Градиент для красоты
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#764ba2');
        gradient.addColorStop(1, '#667eea');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

// Класс шара
class Ball {
    constructor(x, y, vx, vy, isStarter = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = BALL_RADIUS;
        this.isStarter = isStarter; // Стартовый шар (красный)
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Отскок от боковых стен
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvas.width) {
            this.vx = -this.vx;
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        }

        // Отскок от верхней стены
        if (this.y - this.radius <= 0) {
            this.vy = -this.vy;
            this.y = this.radius;
        }
    }

    draw() {
        // Стартовый шар красного цвета
        if (this.isStarter) {
            const gradient = ctx.createRadialGradient(
                this.x - this.radius * 0.3,
                this.y - this.radius * 0.3,
                0,
                this.x,
                this.y,
                this.radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#ff1744');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Обводка
            ctx.strokeStyle = '#c51162';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Обычный шар
            const gradient = ctx.createRadialGradient(
                this.x - this.radius * 0.3,
                this.y - this.radius * 0.3,
                0,
                this.x,
                this.y,
                this.radius
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#667eea');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Обводка
            ctx.strokeStyle = '#764ba2';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // Проверка выхода за нижнюю границу
    isOutOfBounds() {
        return this.y - this.radius > canvas.height;
    }
}

// Класс бонуса расширения платформы
class PlatformBonus {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 3;
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.width / 20, this.height / 20);
        
        // Рисуем иконку расширения (две стрелки)
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        // Левая стрелка
        ctx.moveTo(-5, 0);
        ctx.lineTo(-2, -3);
        ctx.lineTo(-2, -1);
        ctx.lineTo(2, -1);
        ctx.lineTo(2, -3);
        ctx.lineTo(5, 0);
        ctx.lineTo(2, 3);
        ctx.lineTo(2, 1);
        ctx.lineTo(-2, 1);
        ctx.lineTo(-2, 3);
        ctx.closePath();
        ctx.fill();
        
        // Правая стрелка
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(8, -3);
        ctx.lineTo(8, -1);
        ctx.lineTo(12, -1);
        ctx.lineTo(12, -3);
        ctx.lineTo(15, 0);
        ctx.lineTo(12, 3);
        ctx.lineTo(12, 1);
        ctx.lineTo(8, 1);
        ctx.lineTo(8, 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    isOutOfBounds() {
        return this.y > canvas.height;
    }
}

// Класс сердца
class Heart {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 3;
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.scale(this.width / 20, this.height / 20);
        
        // Рисуем сердце
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.bezierCurveTo(0, 0, -5, 0, -5, 5);
        ctx.bezierCurveTo(-5, 8, 0, 12, 0, 15);
        ctx.bezierCurveTo(0, 12, 5, 8, 5, 5);
        ctx.bezierCurveTo(5, 0, 0, 0, 0, 5);
        ctx.fill();
        
        // Обводка
        ctx.strokeStyle = '#c51162';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        
        ctx.restore();
    }

    isOutOfBounds() {
        return this.y > canvas.height;
    }
}

// Класс кубика
class Block {
    constructor(x, y, width, height, health = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.destroyed = false;
        
        // Прочность блока: если не указана, случайная от 1 до 3
        if (health !== null) {
            this.health = health;
        } else {
            this.health = Math.floor(Math.random() * 3) + 1; // 1-3
        }
        this.maxHealth = this.health;
        
        // Цвет кубика (случайный для визуального разнообразия)
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b',
            '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894'
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    draw() {
        if (this.destroyed) return;

        // Основной цвет (темнее при меньшей прочности)
        const healthRatio = this.health / this.maxHealth;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 3);
        ctx.fill();

        // Светлый верх
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Обводка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Отображение цифры прочности (адаптивный размер)
        const textX = this.x + this.width / 2;
        const textY = this.y + this.height / 2;
        const isMobile = window.innerWidth < 768;
        const minFontSize = isMobile ? 10 : 12;
        const fontSize = Math.max(minFontSize, this.height * (isMobile ? 0.7 : 0.6));
        ctx.font = 'bold ' + Math.round(fontSize) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Тень для текста для лучшей читаемости
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillText(this.health.toString(), textX + 1, textY + 1);
        
        // Основной текст
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.health.toString(), textX, textY);
    }
}

// ============================================
// ЗВУКИ
// ============================================

// Создание звука с помощью Web Audio API
function playSound(frequency, duration, type = 'sine', volume = 0.3) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        // Игнорируем ошибки звука (например, если браузер не поддерживает)
    }
}

// Звук при отбивании шара платформой
function playPaddleSound() {
    if (soundEnabled) {
        playSound(400, 0.1, 'square', 0.2);
    }
}

// Звук при разбивании блока
function playBlockSound() {
    if (soundEnabled) {
        playSound(200, 0.15, 'sawtooth', 0.25);
    }
}

// ============================================
// ФУНКЦИИ СТОЛКНОВЕНИЙ
// ============================================

// Столкновение шара с платформой
function checkBallPaddleCollision(ball, paddle) {
    if (ball.y + ball.radius < paddle.y) return false;
    if (ball.y - ball.radius > paddle.y + paddle.height) return false;
    if (ball.x + ball.radius < paddle.x) return false;
    if (ball.x - ball.radius > paddle.x + paddle.width) return false;

    // Отскок от платформы
    ball.vy = -Math.abs(ball.vy);
    
    // Изменение угла в зависимости от места удара
    const hitPos = (ball.x - paddle.x) / paddle.width;
    const angle = (hitPos - 0.5) * Math.PI * 0.5; // Максимальный угол 45 градусов
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;

    // Начисление очков за отбитый шар
    score += 100;
    updateUI();
    
    // Звук при отбивании
    playPaddleSound();
    
    // Анимация +100 для стартового (красного) шара
    if (ball.isStarter) {
        scoreAnimations.push({
            x: ball.x,
            y: ball.y,
            text: '+100',
            life: 60, // 60 кадров анимации
            alpha: 1.0
        });
        // Красный шар остается красным до конца уровня
    }

    return true;
}

// Столкновение шара с кубиком
function checkBallBlockCollision(ball, block) {
    if (block.destroyed) return false;

    // Проверка пересечения
    const closestX = Math.max(block.x, Math.min(ball.x, block.x + block.width));
    const closestY = Math.max(block.y, Math.min(ball.y, block.y + block.height));

    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < ball.radius) {
        // Определение стороны столкновения
        const ballLeft = ball.x - ball.radius;
        const ballRight = ball.x + ball.radius;
        const ballTop = ball.y - ball.radius;
        const ballBottom = ball.y + ball.radius;

        const blockLeft = block.x;
        const blockRight = block.x + block.width;
        const blockTop = block.y;
        const blockBottom = block.y + block.height;

        // Текущий угол движения шара
        const currentAngle = Math.atan2(ball.vy, ball.vx);
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        
        // Определяем, какая сторона кубика была затронута
        const overlapX = Math.min(ballRight - blockLeft, blockRight - ballLeft);
        const overlapY = Math.min(ballBottom - blockTop, blockBottom - ballTop);
        
        // Минимальное изменение угла - 10 градусов (в радианах)
        const minAngleChange = (10 * Math.PI) / 180;
        // Случайное изменение угла от 10 до 30 градусов
        const angleChange = minAngleChange + Math.random() * (20 * Math.PI / 180);
        // Случайное направление изменения (влево или вправо)
        const direction = Math.random() < 0.5 ? -1 : 1;
        
        // Горизонтальное столкновение (сверху или снизу кубика)
        if (overlapX > overlapY) {
            // Отражаем вертикальную составляющую
            ball.vy = -ball.vy;
        }
        // Вертикальное столкновение (слева или справа от кубика)
        else {
            // Отражаем горизонтальную составляющую
            ball.vx = -ball.vx;
        }
        
        // Применяем изменение угла минимум на 10 градусов
        const newAngle = Math.atan2(ball.vy, ball.vx) + angleChange * direction;
        ball.vx = Math.cos(newAngle) * speed;
        ball.vy = Math.sin(newAngle) * speed;

        return true;
    }

    return false;
}

// ============================================
// ГЕНЕРАЦИЯ УРОВНЕЙ
// ============================================

// Определение прочности блока на основе его ряда
function getBlockHealth(y, startY) {
    // Определяем ряд блока (относительно startY)
    const rowHeight = BLOCK_HEIGHT + BLOCK_PADDING;
    const row = Math.floor((y - startY) / rowHeight);
    
    // Первые 3-6 рядов имеют прочность 1-2
    const easyRows = 3 + Math.floor(Math.random() * 4); // Случайное число от 3 до 6
    if (row < easyRows) {
        return Math.floor(Math.random() * 2) + 1; // 1 или 2
    }
    
    // Остальные блоки имеют прочность от 1 до 3
    return Math.floor(Math.random() * 3) + 1; // 1-3
}

// Проверка на перекрытие блоков
function isBlockOverlapping(x, y, width, height, existingBlocks) {
    for (const block of existingBlocks) {
        if (block.destroyed) continue;
        
        // Проверяем перекрытие по осям
        if (x < block.x + block.width + BLOCK_PADDING &&
            x + width + BLOCK_PADDING > block.x &&
            y < block.y + block.height + BLOCK_PADDING &&
            y + height + BLOCK_PADDING > block.y) {
            return true;
        }
    }
    return false;
}

// Создание блока с автоматическим определением прочности и проверкой перекрытия
function createBlock(x, y, width, height, startY, existingBlocks = [], minDistanceFromPaddle = 0) {
    // Округляем координаты для точного позиционирования
    x = Math.round(x);
    y = Math.round(y);
    
    // Проверяем на перекрытие
    if (isBlockOverlapping(x, y, width, height, existingBlocks)) {
        return null; // Блок не создается, если перекрывается
    }
    
    // Проверяем минимальное расстояние от платформы
    if (minDistanceFromPaddle > 0) {
        const isMobile = window.innerWidth < 768;
        const paddleY = isMobile ? canvas.height - 130 : canvas.height - 40;
        if (y + height > paddleY - minDistanceFromPaddle) {
            return null; // Блок слишком близко к платформе
        }
    }
    
    const health = getBlockHealth(y, startY);
    return new Block(x, y, width, height, health);
}

// Генерация фигур для разных уровней
function generateLevel(level) {
    blocks = [];
    const cols = Math.floor(canvas.width / (BLOCK_WIDTH + BLOCK_PADDING));
    const isMobile = window.innerWidth < 768;
    // Интерфейс: на десктопе 10px, на мобильных 120px
    const interfaceHeight = isMobile ? 120 : 10;
    const startY = interfaceHeight + 30; // 30px отступ после интерфейса
    // Минимальное расстояние от платформы
    const paddleY = isMobile ? canvas.height - 130 : canvas.height - 40;
    const minDistanceFromPaddle = 100; // Минимальное расстояние от платформы
    let blockCount = 0;
    const targetCount = 300 + (level - 1) * 100; // 300, 400, 500, 600, 700...

    // Уровень 1: Пирамида
    if (level === 1) {
        const rows = 15;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const blocksInRow = cols - row;
            const startX = (canvas.width - blocksInRow * (BLOCK_WIDTH + BLOCK_PADDING) + BLOCK_PADDING) / 2;
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(startX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
        }
    }
    // Уровень 2: Две пирамиды
    else if (level === 2) {
        const rows = 12;
        const midCol = Math.floor(cols / 2);
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const blocksInRow = Math.min(cols - row * 2, Math.floor(cols / 2));
            // Левая пирамида
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round((midCol - blocksInRow) * (BLOCK_WIDTH + BLOCK_PADDING) + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
            // Правая пирамида
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(midCol * (BLOCK_WIDTH + BLOCK_PADDING) + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
        }
    }
    // Уровень 3: Круг
    else if (level === 3) {
        const centerX = canvas.width / 2;
        const centerY = startY + 200;
        const radius = Math.min(canvas.width * 0.3, 200);
        for (let angle = 0; angle < Math.PI * 2 && blockCount < targetCount; angle += 0.1) {
            const x = Math.round(centerX + Math.cos(angle) * radius - BLOCK_WIDTH / 2);
            const y = Math.round(centerY + Math.sin(angle) * radius - BLOCK_HEIGHT / 2);
            if (x >= 0 && x + BLOCK_WIDTH <= canvas.width && y >= startY) {
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
        }
        // Заполнение центра
        for (let row = 0; row < 8 && blockCount < targetCount; row++) {
            for (let col = 0; col < 10 && blockCount < targetCount; col++) {
                const x = Math.round(centerX - 5 * (BLOCK_WIDTH + BLOCK_PADDING) + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(centerY - 4 * (BLOCK_HEIGHT + BLOCK_PADDING) + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                if (x >= 0 && x + BLOCK_WIDTH <= canvas.width) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
    }
    // Уровень 4: Зигзаг
    else if (level === 4) {
        const rows = 20;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const offset = (row % 4) * (BLOCK_WIDTH + BLOCK_PADDING) * 2;
            const blocksInRow = cols - 4;
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(offset + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                if (x + BLOCK_WIDTH <= canvas.width) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
    }
    // Уровень 5: Сложная фигура (звезда + сетка)
    else if (level === 5) {
        // Звезда в центре
        const centerX = canvas.width / 2;
        const centerY = startY + 150;
        const points = 8;
        const outerRadius = 150;
        const innerRadius = 80;
        for (let i = 0; i < points * 2 && blockCount < targetCount; i++) {
            const angle = (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.round(centerX + Math.cos(angle) * radius - BLOCK_WIDTH / 2);
            const y = Math.round(centerY + Math.sin(angle) * radius - BLOCK_HEIGHT / 2);
            if (x >= 0 && x + BLOCK_WIDTH <= canvas.width) {
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
        }
        // Сетка вокруг
        const gridRows = 15;
        const gridCols = cols;
        for (let row = 0; row < gridRows && blockCount < targetCount; row++) {
            for (let col = 0; col < gridCols && blockCount < targetCount; col++) {
                if ((row + col) % 3 !== 0) { // Пропуски для узора
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
    }
    // Уровень 6: Спираль
    else if (level === 6) {
        const centerX = canvas.width / 2;
        const centerY = startY + 100;
        let radius = 30;
        let angle = 0;
        let maxIterations = 5000; // Защита от бесконечного цикла
        let iterations = 0;
        while (blockCount < targetCount && radius < Math.min(canvas.width, canvas.height) * 0.4 && iterations < maxIterations) {
            iterations++;
            const x = Math.round(centerX + Math.cos(angle) * radius - BLOCK_WIDTH / 2);
            const y = Math.round(centerY + Math.sin(angle) * radius - BLOCK_HEIGHT / 2);
            if (x >= 0 && x + BLOCK_WIDTH <= canvas.width && y >= startY && y + BLOCK_HEIGHT < paddleY - minDistanceFromPaddle) {
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
            angle += 0.3;
            radius += 0.5;
        }
    }
    // Уровень 7: Крест
    else if (level === 7) {
        const centerX = canvas.width / 2;
        const centerY = startY + 200;
        const crossSize = 8;
        // Горизонтальная линия
        for (let col = 0; col < cols && blockCount < targetCount; col++) {
            const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
            const y = Math.round(centerY);
            const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks);
            if (block) {
                blocks.push(block);
                blockCount++;
            }
        }
        // Вертикальная линия
        for (let row = 0; row < 20 && blockCount < targetCount; row++) {
            const x = Math.round(centerX - BLOCK_WIDTH / 2);
            const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
            if (y !== centerY) {
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
        }
        // Заполнение вокруг креста (упрощенная логика)
        for (let row = 0; row < 12 && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const distFromCenterX = Math.abs(x - centerX);
                const distFromCenterY = Math.abs(y - centerY);
                // Упрощенное условие для избежания зависания
                if (distFromCenterX > BLOCK_WIDTH * 3 || distFromCenterY > BLOCK_HEIGHT * 3) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
    }
    // Уровень 8: Шахматная доска
    else if (level === 8) {
        const rows = 18;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                if ((row + col) % 2 === 0) {
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
    }
    // Уровень 9: Три пирамиды
    else if (level === 9) {
        const rows = 12;
        const thirdWidth = Math.floor(cols / 3);
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const blocksInRow = Math.max(1, thirdWidth - row);
            // Левая пирамида
            const leftStartX = (thirdWidth - blocksInRow) * (BLOCK_WIDTH + BLOCK_PADDING);
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(leftStartX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
            // Средняя пирамида
            const midStartX = thirdWidth * (BLOCK_WIDTH + BLOCK_PADDING) + (thirdWidth - blocksInRow) * (BLOCK_WIDTH + BLOCK_PADDING) / 2;
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(midStartX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
            // Правая пирамида
            const rightStartX = (thirdWidth * 2) * (BLOCK_WIDTH + BLOCK_PADDING) + (thirdWidth - blocksInRow) * (BLOCK_WIDTH + BLOCK_PADDING);
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(rightStartX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                if (x + BLOCK_WIDTH <= canvas.width) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
    }
    // Уровень 10: Ромбы
    else if (level === 10) {
        const centerX = canvas.width / 2;
        const diamondSize = 10;
        for (let row = 0; row < diamondSize * 2 && blockCount < targetCount; row++) {
            const blocksInRow = diamondSize - Math.abs(row - diamondSize);
            const startX = centerX - (blocksInRow * (BLOCK_WIDTH + BLOCK_PADDING)) / 2;
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(startX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
        }
        // Второй ромб ниже
        for (let row = 0; row < diamondSize * 2 && blockCount < targetCount; row++) {
            const blocksInRow = diamondSize - Math.abs(row - diamondSize);
            const startX = centerX - (blocksInRow * (BLOCK_WIDTH + BLOCK_PADDING)) / 2;
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(startX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + (diamondSize * 2 + 3) * (BLOCK_HEIGHT + BLOCK_PADDING) + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                if (y + BLOCK_HEIGHT < canvas.height - 100) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
    }
    // Уровень 11: Волны
    else if (level === 11) {
        const rows = 18;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const waveOffset = Math.sin(row * 0.5) * (cols * 0.2);
            const blocksInRow = Math.floor(cols * 0.8);
            const startX = (canvas.width - blocksInRow * (BLOCK_WIDTH + BLOCK_PADDING)) / 2 + waveOffset;
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(startX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                if (x >= 0 && x + BLOCK_WIDTH <= canvas.width) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
    }
    // Уровень 12: Лабиринт
    else if (level === 12) {
        const rows = 20;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                // Создаем узор лабиринта
                const pattern = (row * 3 + col * 2) % 5;
                if (pattern !== 0 && pattern !== 2) {
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
    }
    // Уровень 13: Концентрические круги
    else if (level === 13) {
        const centerX = canvas.width / 2;
        const centerY = startY + 200;
        let radius = 40;
        let maxIterations = 50; // Максимум 50 кругов
        let iterations = 0;
        while (blockCount < targetCount && radius < Math.min(canvas.width, canvas.height) * 0.35 && iterations < maxIterations) {
            iterations++;
            const circumference = Math.PI * 2 * radius;
            const blocksOnCircle = Math.floor(circumference / (BLOCK_WIDTH + BLOCK_PADDING));
            for (let i = 0; i < blocksOnCircle && blockCount < targetCount; i++) {
                const angle = (i / blocksOnCircle) * Math.PI * 2;
                const x = Math.round(centerX + Math.cos(angle) * radius - BLOCK_WIDTH / 2);
                const y = Math.round(centerY + Math.sin(angle) * radius - BLOCK_HEIGHT / 2);
                if (x >= 0 && x + BLOCK_WIDTH <= canvas.width && y >= startY) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
            radius += BLOCK_HEIGHT + BLOCK_PADDING + 5;
        }
    }
    // Уровень 14: Стрелки (исправлено для избежания зависания)
    else if (level === 14) {
        const arrowCount = 3; // Уменьшено с 4 до 3
        const arrowWidth = Math.floor(cols / arrowCount);
        for (let a = 0; a < arrowCount && blockCount < targetCount; a++) {
            const arrowStartX = a * arrowWidth * (BLOCK_WIDTH + BLOCK_PADDING);
            const arrowRows = 6; // Уменьшено с 8 до 6
            // Стрелка вверх
            for (let row = 0; row < arrowRows && blockCount < targetCount; row++) {
                const blocksInRow = Math.max(1, arrowWidth - Math.abs(row - Math.floor(arrowRows / 2)) * 2);
                if (blocksInRow > 0 && blocksInRow <= cols) {
                    const startX = arrowStartX + (arrowWidth - blocksInRow) / 2 * (BLOCK_WIDTH + BLOCK_PADDING);
                    for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                        const x = Math.round(startX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                        const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                        if (x >= 0 && x + BLOCK_WIDTH <= canvas.width && y >= startY) {
                            const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                            if (block) {
                                blocks.push(block);
                                blockCount++;
                            }
                        }
                    }
                }
            }
        }
        // Дополнительные блоки для заполнения (ограничено)
        const maxAdditionalRows = 10; // Ограничение
        for (let row = 6; row < maxAdditionalRows && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                if ((row + col) % 3 === 0) {
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    if (y + BLOCK_HEIGHT < paddleY - minDistanceFromPaddle) {
                        const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                        if (block) {
                            blocks.push(block);
                            blockCount++;
                        }
                    }
                }
            }
        }
    }
    // Уровень 15: Финальный босс - сложная комбинация
    else if (level === 15) {
        // Большая звезда
        const centerX = canvas.width / 2;
        const centerY = startY + 150;
        const points = 12;
        const outerRadius = 180;
        const innerRadius = 100;
        for (let i = 0; i < points * 2 && blockCount < targetCount; i++) {
            const angle = (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.round(centerX + Math.cos(angle) * radius - BLOCK_WIDTH / 2);
            const y = Math.round(centerY + Math.sin(angle) * radius - BLOCK_HEIGHT / 2);
            if (x >= 0 && x + BLOCK_WIDTH <= canvas.width) {
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
        }
        // Заполнение сеткой
        const gridRows = 18;
        const gridCols = cols;
        for (let row = 0; row < gridRows && blockCount < targetCount; row++) {
            for (let col = 0; col < gridCols && blockCount < targetCount; col++) {
                const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const distFromCenter = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );
                // Пропускаем блоки слишком близко к центру звезды
                if (distFromCenter > innerRadius + 30) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) {
                        blocks.push(block);
                        blockCount++;
                    }
                }
            }
        }
        // Дополнительные блоки по краям
        for (let row = 0; row < 5 && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                if (col < 3 || col > cols - 4) {
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + (gridRows + row) * (BLOCK_HEIGHT + BLOCK_PADDING));
                    if (y + BLOCK_HEIGHT < paddleY - minDistanceFromPaddle) {
                        const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                        if (block) {
                            blocks.push(block);
                            blockCount++;
                        }
                    }
                }
            }
        }
    }
    // Уровень 16: Ромбы
    else if (level === 16) {
        const rows = 10;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const blocksInRow = Math.min(cols, Math.abs(rows - row - Math.floor(rows/2)) * 2 + 1);
            const startX = (cols - blocksInRow) / 2 * (BLOCK_WIDTH + BLOCK_PADDING);
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(startX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) {
                    blocks.push(block);
                    blockCount++;
                }
            }
        }
    }
    // Уровень 17: Квадраты по углам
    else if (level === 17) {
        const squareSize = 4;
        // Верхний левый
        for (let row = 0; row < squareSize && blockCount < targetCount; row++) {
            for (let col = 0; col < squareSize && blockCount < targetCount; col++) {
                const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) { blocks.push(block); blockCount++; }
            }
        }
        // Верхний правый
        for (let row = 0; row < squareSize && blockCount < targetCount; row++) {
            for (let col = 0; col < squareSize && blockCount < targetCount; col++) {
                const x = Math.round((cols - squareSize + col) * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) { blocks.push(block); blockCount++; }
            }
        }
        // Центральная полоса
        for (let col = squareSize; col < cols - squareSize && blockCount < targetCount; col++) {
            for (let row = 4; row < 8 && blockCount < targetCount; row++) {
                const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) { blocks.push(block); blockCount++; }
            }
        }
    }
    // Уровень 18: Зигзаг
    else if (level === 18) {
        const rows = 12;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const offset = (row % 2) * 2; // Смещение для зигзага
            const blocksInRow = cols - 2;
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round((col + offset) * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                if (x + BLOCK_WIDTH <= canvas.width) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
    // Уровень 19: Шахматная доска
    else if (level === 19) {
        const rows = 11;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                if ((row + col) % 2 === 0) {
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
    // Уровень 20: Кресты
    else if (level === 20) {
        const crossSize = 3;
        const spacing = 5;
        for (let i = 0; i < 3 && blockCount < targetCount; i++) {
            const centerX = (i + 1) * (cols / 4) * (BLOCK_WIDTH + BLOCK_PADDING);
            const centerY = startY + 100;
            // Горизонтальная линия
            for (let col = 0; col < crossSize * 2 + 1 && blockCount < targetCount; col++) {
                const x = Math.round(centerX - crossSize * (BLOCK_WIDTH + BLOCK_PADDING) + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(centerY);
                if (x >= 0 && x + BLOCK_WIDTH <= canvas.width) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
            // Вертикальная линия
            for (let row = 0; row < crossSize * 2 + 1 && blockCount < targetCount; row++) {
                if (row !== crossSize) {
                    const x = Math.round(centerX);
                    const y = Math.round(centerY - crossSize * (BLOCK_HEIGHT + BLOCK_PADDING) + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    if (y >= startY) {
                        const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                        if (block) { blocks.push(block); blockCount++; }
                    }
                }
            }
        }
    }
    // Уровень 21: Треугольники
    else if (level === 21) {
        const triangleHeight = 6;
        for (let t = 0; t < 2 && blockCount < targetCount; t++) {
            const startX = t * cols * 0.5 * (BLOCK_WIDTH + BLOCK_PADDING);
            for (let row = 0; row < triangleHeight && blockCount < targetCount; row++) {
                const blocksInRow = triangleHeight - row;
                for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                    const x = Math.round(startX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    if (x + BLOCK_WIDTH <= canvas.width) {
                        const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                        if (block) { blocks.push(block); blockCount++; }
                    }
                }
            }
        }
    }
    // Уровень 22: Вертикальные полосы
    else if (level === 22) {
        const rows = 12;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                if (col % 3 === 0) {
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
    // Уровень 23: Диагональные линии
    else if (level === 23) {
        const rows = 13;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                if ((row + col) % 4 === 0) {
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
    // Уровень 24: Концентрические прямоугольники
    else if (level === 24) {
        const centerX = canvas.width / 2;
        const centerY = startY + 120;
        const layers = 4;
        for (let layer = 0; layer < layers && blockCount < targetCount; layer++) {
            const width = (layers - layer) * 3;
            const height = (layers - layer) * 2;
            // Верхняя и нижняя линии
            for (let col = 0; col < width && blockCount < targetCount; col++) {
                const x = Math.round(centerX - width/2 * (BLOCK_WIDTH + BLOCK_PADDING) + col * (BLOCK_WIDTH + BLOCK_PADDING));
                // Верх
                const yTop = Math.round(centerY - height/2 * (BLOCK_HEIGHT + BLOCK_PADDING));
                if (x >= 0 && x + BLOCK_WIDTH <= canvas.width && yTop >= startY) {
                    const block = createBlock(x, yTop, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
                // Низ
                const yBottom = Math.round(centerY + height/2 * (BLOCK_HEIGHT + BLOCK_PADDING));
                if (x >= 0 && x + BLOCK_WIDTH <= canvas.width && blockCount < targetCount) {
                    const block = createBlock(x, yBottom, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
            // Левая и правая линии
            for (let row = 1; row < height && blockCount < targetCount; row++) {
                const y = Math.round(centerY - height/2 * (BLOCK_HEIGHT + BLOCK_PADDING) + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                // Лево
                const xLeft = Math.round(centerX - width/2 * (BLOCK_WIDTH + BLOCK_PADDING));
                if (xLeft >= 0 && y >= startY) {
                    const block = createBlock(xLeft, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
                // Право
                const xRight = Math.round(centerX + (width/2 - 1) * (BLOCK_WIDTH + BLOCK_PADDING));
                if (xRight + BLOCK_WIDTH <= canvas.width && y >= startY && blockCount < targetCount) {
                    const block = createBlock(xRight, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
    // Уровень 25: Волны
    else if (level === 25) {
        const rows = 10;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const waveOffset = Math.sin(row * 0.8) * 3;
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                if (Math.abs(col - cols/2 - waveOffset) < 4) {
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
    // Уровень 26: Сетка с большими ячейками
    else if (level === 26) {
        const rows = 11;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                if (row % 2 === 0 || col % 2 === 0) {
                    const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
    // Уровень 27: Ступеньки
    else if (level === 27) {
        const rows = 10;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const blocksInRow = Math.min(cols, Math.floor(cols * (1 - row * 0.1)));
            const startX = (cols - blocksInRow) / 2 * (BLOCK_WIDTH + BLOCK_PADDING);
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                const x = Math.round(startX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) { blocks.push(block); blockCount++; }
            }
        }
    }
    // Уровень 28: Ромбовидная сетка
    else if (level === 28) {
        const rows = 12;
        for (let row = 0; row < rows && blockCount < targetCount; row++) {
            const offset = Math.abs(row - Math.floor(rows/2));
            const blocksInRow = cols - offset * 2;
            const startX = offset * (BLOCK_WIDTH + BLOCK_PADDING);
            for (let col = 0; col < blocksInRow && blockCount < targetCount; col++) {
                if (col % 2 === row % 2) {
                    const x = Math.round(startX + col * (BLOCK_WIDTH + BLOCK_PADDING));
                    const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
    // Уровень 29: Случайные кластеры
    else if (level === 29) {
        for (let cluster = 0; cluster < 10 && blockCount < targetCount; cluster++) {
            const clusterX = Math.random() * (canvas.width - 150);
            const clusterY = startY + Math.random() * 300;
            const clusterSize = 4 + Math.floor(Math.random() * 4);
            for (let i = 0; i < clusterSize && blockCount < targetCount; i++) {
                const x = Math.round(clusterX + (Math.random() - 0.5) * 80);
                const y = Math.round(clusterY + (Math.random() - 0.5) * 60);
                if (x >= 0 && x + BLOCK_WIDTH <= canvas.width && y >= startY) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
    // Уровень 30: Финальный босс - комплексная комбинация
    else if (level === 30) {
        // Центральная звезда
        const centerX = canvas.width / 2;
        const centerY = startY + 120;
        const points = 10;
        const outerRadius = 140;
        const innerRadius = 70;
        for (let i = 0; i < points * 2 && blockCount < targetCount; i++) {
            const angle = (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.round(centerX + Math.cos(angle) * radius - BLOCK_WIDTH / 2);
            const y = Math.round(centerY + Math.sin(angle) * radius - BLOCK_HEIGHT / 2);
            if (x >= 0 && x + BLOCK_WIDTH <= canvas.width && y >= startY) {
                const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                if (block) { blocks.push(block); blockCount++; }
            }
        }
        // Окружающая сетка
        const gridRows = 14;
        for (let row = 0; row < gridRows && blockCount < targetCount; row++) {
            for (let col = 0; col < cols && blockCount < targetCount; col++) {
                const x = Math.round(col * (BLOCK_WIDTH + BLOCK_PADDING));
                const y = Math.round(startY + row * (BLOCK_HEIGHT + BLOCK_PADDING));
                const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                if (distFromCenter > outerRadius + 40 && distFromCenter < outerRadius + 200) {
                    const block = createBlock(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, startY, blocks, minDistanceFromPaddle);
                    if (block) { blocks.push(block); blockCount++; }
                }
            }
        }
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ИГРЫ
// ============================================

// Получение скорости шара для уровня (увеличивается на 1% каждый уровень)
function getBallSpeedForLevel(level) {
    const baseSpeed = BALL_SPEED;
    const speedMultiplier = 1 + (level - 1) * 0.01; // +1% за каждый уровень
    return baseSpeed * speedMultiplier;
}

function initGame() {
    // Сброс расширения платформы
    paddleWide = false;
    platformBonuses = [];
    lastPlatformBonusScore = 0;
    
    // Создание платформы
    const isMobile = window.innerWidth < 768;
    const paddleY = isMobile ? canvas.height - 130 : canvas.height - 40;
    paddle = new Paddle(
        canvas.width / 2 - PADDLE_WIDTH / 2,
        paddleY,
        PADDLE_WIDTH,
        PADDLE_HEIGHT
    );

    // Создание начального шара (красный) с учетом скорости уровня
    const ballY = isMobile ? canvas.height - 150 : canvas.height - 60;
    const levelBallSpeed = getBallSpeedForLevel(currentLevel);
    balls = [new Ball(
        canvas.width / 2,
        ballY,
        (Math.random() - 0.5) * levelBallSpeed,
        -levelBallSpeed,
        true // Стартовый шар
    )];

    // Очистка сердец
    hearts = [];
    if (gameState === 'start') {
        lastHeartScore = 0;
    }

    // Генерация уровня
    generateLevel(currentLevel);

    gameState = 'playing';
    updateUI();
}

function resetGame() {
    currentLevel = 1;
    score = 0;
    lives = 3;
    lastHeartScore = 0;
    hearts = [];
    scoreAnimations = [];
    initGame();
}

// ============================================
// ОБНОВЛЕНИЕ ИГРЫ
// ============================================

function update() {
    if (gameState !== 'playing' || gamePaused) return;

    // Обновление платформы
    if (isTouching) {
        // Touch управление (мобильное)
        paddle.x = touchX - paddle.width / 2;
    } else if (keys.left || keys.right) {
        // Клавиатурное управление (ПК)
        if (keys.left) {
            paddle.x -= PADDLE_SPEED;
        }
        if (keys.right) {
            paddle.x += PADDLE_SPEED;
        }
    }
    paddle.update();

    // Обновление шаров
    const ballsToAdd = [];
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        ball.update();

        // Проверка выхода за границы
        if (ball.isOutOfBounds()) {
            // Если это красный шар - отнимаем жизнь и создаем новый красный
            if (ball.isStarter) {
                lives--;
                balls.splice(i, 1);
                // Создаем новый красный шар с учетом скорости уровня
                const isMobile = window.innerWidth < 768;
                const ballY = isMobile ? canvas.height - 150 : canvas.height - 60;
                const levelBallSpeed = getBallSpeedForLevel(currentLevel);
                balls.push(new Ball(
                    canvas.width / 2,
                    ballY,
                    (Math.random() - 0.5) * levelBallSpeed,
                    -levelBallSpeed,
                    true // Красный шар
                ));
                updateUI();
                
                if (lives <= 0) {
                    gameState = 'gameover';
                    gameOverScreen.classList.remove('hidden');
                }
            } else {
                // Обычный шар - просто удаляем
                // Анимация -5 очков
                scoreAnimations.push({
                    x: ball.x,
                    y: ball.y,
                    text: '-5',
                    life: 60, // 60 кадров анимации
                    alpha: 1.0,
                    color: '#ff1744' // Красный цвет
                });
                balls.splice(i, 1);
                score = Math.max(0, score - 25);
                updateUI();
            }
            continue;
        }

        // Столкновение с платформой
        checkBallPaddleCollision(ball, paddle);

        // Столкновение с кубиками
        for (let j = blocks.length - 1; j >= 0; j--) {
            const block = blocks[j];
            if (!block.destroyed && checkBallBlockCollision(ball, block)) {
                // Уменьшаем прочность блока
                block.health--;
                
                // Если блок полностью разрушен
                if (block.health <= 0) {
                    block.destroyed = true;
                    
                    // Звук при разбивании блока
                    playBlockSound();
                    
                    // Деление шара только при полном разрушении блока
                    const newAngle = Math.atan2(ball.vy, ball.vx) + (Math.random() - 0.5) * 0.5;
                    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                    ballsToAdd.push(new Ball(
                        ball.x,
                        ball.y,
                        Math.cos(newAngle) * speed,
                        Math.sin(newAngle) * speed
                    ));
                }
                
                break; // Один кубик за раз
            }
        }
    }

    // Добавление новых шаров
    balls.push(...ballsToAdd);

    // Обновление анимаций очков
    for (let i = scoreAnimations.length - 1; i >= 0; i--) {
        const anim = scoreAnimations[i];
        anim.life--;
        anim.y -= 2; // Движение вверх
        anim.alpha = anim.life / 60; // Плавное исчезновение
        
        if (anim.life <= 0) {
            scoreAnimations.splice(i, 1);
        }
    }

    // Проверка победы (все кубики разрушены)
    const remainingBlocks = blocks.filter(b => !b.destroyed).length;
    if (remainingBlocks === 0) {
        if (currentLevel >= 30) {
            gameState = 'win';
            winScreen.classList.remove('hidden');
            if (currentLevel > unlockedLevels) {
                unlockedLevels = currentLevel;
                saveProgress(); // Сохраняем прогресс
            }
        } else {
            currentLevel++;
            if (currentLevel > unlockedLevels) {
                unlockedLevels = currentLevel;
                saveProgress(); // Сохраняем прогресс
            }
            generateLevel(currentLevel);
            // Сброс позиции шаров (новый стартовый шар) с учетом скорости уровня
            const isMobile = window.innerWidth < 768;
            const ballY = isMobile ? canvas.height - 150 : canvas.height - 60;
            const levelBallSpeed = getBallSpeedForLevel(currentLevel);
            balls = [new Ball(
                canvas.width / 2,
                ballY,
                (Math.random() - 0.5) * levelBallSpeed,
                -levelBallSpeed,
                true // Стартовый шар
            )];
            // Сброс расширения платформы
            paddleWide = false;
            paddle.width = PADDLE_WIDTH;
        }
        updateUI();
    }

    // Обновление сердец
    for (let i = hearts.length - 1; i >= 0; i--) {
        const heart = hearts[i];
        heart.update();

        // Проверка выхода за границы
        if (heart.isOutOfBounds()) {
            hearts.splice(i, 1);
            continue;
        }

        // Столкновение с платформой
        if (heart.x < paddle.x + paddle.width &&
            heart.x + heart.width > paddle.x &&
            heart.y < paddle.y + paddle.height &&
            heart.y + heart.height > paddle.y) {
            // Получение жизни
            lives++;
            hearts.splice(i, 1);
            updateUI();
        }
    }

    // Проверка падения нового сердца (каждые 15,000 очков)
    const heartInterval = 15000;
    if (score >= lastHeartScore + heartInterval) {
        lastHeartScore = Math.floor(score / heartInterval) * heartInterval;
        // Создаем сердце в случайной позиции сверху
        const heartX = Math.random() * (canvas.width - 20);
        hearts.push(new Heart(heartX, -20));
    }

    // Проверка падения бонуса платформы (каждые 25,000 очков)
    const platformBonusInterval = 25000;
    if (score >= lastPlatformBonusScore + platformBonusInterval) {
        lastPlatformBonusScore = Math.floor(score / platformBonusInterval) * platformBonusInterval;
        // Создаем бонус в случайной позиции сверху
        const bonusX = Math.random() * (canvas.width - 20);
        platformBonuses.push(new PlatformBonus(bonusX, -20));
    }

    // Обновление бонусов платформы
    for (let i = platformBonuses.length - 1; i >= 0; i--) {
        const bonus = platformBonuses[i];
        bonus.update();

        // Проверка выхода за границы
        if (bonus.isOutOfBounds()) {
            platformBonuses.splice(i, 1);
            continue;
        }

        // Столкновение с платформой
        if (bonus.x < paddle.x + paddle.width &&
            bonus.x + bonus.width > paddle.x &&
            bonus.y < paddle.y + paddle.height &&
            bonus.y + bonus.height > paddle.y) {
            // Расширение платформы до конца уровня
            paddleWide = true;
            paddle.width = PADDLE_WIDTH * 2;
            platformBonuses.splice(i, 1);
        }
    }

    // Проверка проигрыша (все шары улетели)
    if (balls.length === 0) {
        lives--;
        updateUI();
        
        if (lives <= 0) {
            gameState = 'gameover';
            gameOverScreen.classList.remove('hidden');
        } else {
            // Создаем новый шар, если есть жизни (новый стартовый шар) с учетом скорости уровня
            const isMobile = window.innerWidth < 768;
            const ballY = isMobile ? canvas.height - 150 : canvas.height - 60;
            const levelBallSpeed = getBallSpeedForLevel(currentLevel);
            balls = [new Ball(
                canvas.width / 2,
                ballY,
                (Math.random() - 0.5) * levelBallSpeed,
                -levelBallSpeed,
                true // Стартовый шар
            )];
        }
    }

    updateUI();
}

// ============================================
// ОТРИСОВКА
// ============================================

function draw() {
    // Очистка canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Звёздный фон
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 50; i++) {
        const x = (i * 137.5) % canvas.width;
        const y = (i * 197.3) % canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    if (gameState === 'playing') {
        // Отрисовка кубиков
        blocks.forEach(block => block.draw());

        // Отрисовка платформы
        paddle.draw();

        // Отрисовка шаров
        balls.forEach(ball => ball.draw());

        // Отрисовка сердец
        hearts.forEach(heart => heart.draw());
        
        // Отрисовка анимаций очков
        scoreAnimations.forEach(anim => {
            ctx.save();
            ctx.globalAlpha = anim.alpha;
            // Тонкий шрифт для -5, обычный для +100
            const fontSize = anim.text.startsWith('-') ? '20px' : 'bold 24px';
            ctx.font = fontSize + ' Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Тень
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillText(anim.text, anim.x + 2, anim.y + 2);
            
            // Основной текст (красный для -5, зеленый для +100)
            ctx.fillStyle = anim.color || '#4caf50';
            ctx.fillText(anim.text, anim.x, anim.y);
            
            ctx.restore();
        });
    }
}

// ============================================
// ИГРОВОЙ ЦИКЛ
// ============================================

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ============================================
// ОБНОВЛЕНИЕ UI
// ============================================

function updateUI() {
    levelDisplay.textContent = currentLevel;
    ballsDisplay.textContent = balls.length;
    scoreDisplay.textContent = score;
    // Отображаем жизни символами сердец
    livesDisplay.textContent = '❤️'.repeat(lives);
}

// ============================================
// ОБРАБОТКА СОБЫТИЙ
// ============================================

// Touch события для управления платформой
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        // Проверка тройного тапа для паузы
        const currentTime = Date.now();
        if (currentTime - lastTapTime < 300) { // 300ms между тапами
            tapCount++;
        } else {
            tapCount = 1;
        }
        lastTapTime = currentTime;
        
        if (tapCount >= 3) {
            gamePaused = !gamePaused;
            tapCount = 0;
            if (gamePaused) {
                pauseScreen.classList.remove('hidden');
            } else {
                pauseScreen.classList.add('hidden');
            }
        }
        
        isTouching = true;
        touchX = e.touches[0].clientX;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameState === 'playing' && isTouching) {
        touchX = e.touches[0].clientX;
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isTouching = false;
});

canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    isTouching = false;
});

// Клавиатурное управление (WASD, русская раскладка ФВ, и стрелки)
// Используем e.code для поддержки разных раскладок
document.addEventListener('keydown', (e) => {
    // Пауза по пробелу
    if (e.code === 'Space' && gameState === 'playing') {
        e.preventDefault();
        gamePaused = !gamePaused;
        if (gamePaused) {
            pauseScreen.classList.remove('hidden');
        } else {
            pauseScreen.classList.add('hidden');
        }
        return;
    }
    
    if (gameState !== 'playing') return;
    
    // A (английская) или Ф (русская) или стрелка влево
    // KeyA - физическая клавиша A (в английской раскладке) или Ф (в русской)
    if (e.code === 'KeyA' || e.code === 'KeyF' || e.key === 'ArrowLeft' || 
        e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
        keys.left = true;
        e.preventDefault();
    }
    // D (английская) или В (русская) или стрелка вправо
    // KeyD - физическая клавиша D (в английской раскладке) или В (в русской)
    if (e.code === 'KeyD' || e.code === 'KeyV' || e.key === 'ArrowRight' || 
        e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        keys.right = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    // A (английская) или Ф (русская) или стрелка влево
    if (e.code === 'KeyA' || e.code === 'KeyF' || e.key === 'ArrowLeft' || 
        e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
        keys.left = false;
        e.preventDefault();
    }
    // D (английская) или В (русская) или стрелка вправо
    if (e.code === 'KeyD' || e.code === 'KeyV' || e.key === 'ArrowRight' || 
        e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        keys.right = false;
        e.preventDefault();
    }
});

// Кнопки
// Инициализация меню выбора уровней
function initLevelSelect() {
    if (!levelGrid) return;
    // Загружаем актуальный прогресс перед показом меню
    unlockedLevels = loadProgress();
    levelGrid.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
        const cube = document.createElement('div');
        cube.className = 'levelCube';
        if (i > unlockedLevels) {
            cube.classList.add('locked');
        }
        cube.textContent = i;
        cube.addEventListener('click', () => {
            if (i <= unlockedLevels) {
                currentLevel = i;
                if (levelSelectScreen) levelSelectScreen.classList.add('hidden');
                initGame();
            }
        });
        levelGrid.appendChild(cube);
    }
}

startBtn.addEventListener('click', () => {
    if (startScreen) startScreen.classList.add('hidden');
    if (levelSelectScreen) {
        levelSelectScreen.classList.remove('hidden');
        initLevelSelect();
    } else {
        initGame();
    }
});

if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
        gamePaused = false;
        if (pauseScreen) pauseScreen.classList.add('hidden');
    });
}

if (backToMenuBtn) {
    backToMenuBtn.addEventListener('click', () => {
        if (levelSelectScreen) levelSelectScreen.classList.add('hidden');
        if (startScreen) startScreen.classList.remove('hidden');
    });
}

restartWinBtn.addEventListener('click', () => {
    winScreen.classList.add('hidden');
    resetGame();
});

restartGameOverBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    levelSelectScreen.classList.remove('hidden');
    initLevelSelect();
});

if (menuFromPauseBtn) {
    menuFromPauseBtn.addEventListener('click', () => {
        gamePaused = false;
        if (pauseScreen) pauseScreen.classList.add('hidden');
        if (levelSelectScreen) {
            levelSelectScreen.classList.remove('hidden');
            initLevelSelect();
        }
    });
}

if (soundToggle) {
    // Загружаем сохраненную настройку звука
    const savedSound = localStorage.getItem('arkanoid_soundEnabled');
    if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
        soundToggle.checked = soundEnabled;
    }
    
    soundToggle.addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
        localStorage.setItem('arkanoid_soundEnabled', soundEnabled.toString());
    });
}

// ============================================
// ЗАПУСК ИГРЫ
// ============================================

// Полифилл для roundRect (для старых браузеров)
if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// Запуск игрового цикла
gameLoop();

