// Service Workerの登録 (ファイルの先頭に記述)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered: ', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed: ', error);
            });
    });
}

const canvas = document.getElementById('tetrisCanvas');
const context = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const startButton = document.getElementById('startButton');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 20; // 200 / 10 = 20

// テトリミノの定義 (形状と色)
const TETROMINOES = [
    { shape: [[1, 1, 1, 1]], color: 'cyan' }, // I
    { shape: [[1, 1], [1, 1]], color: 'yellow' }, // O
    { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' }, // T
    { shape: [[1, 1, 0], [0, 1, 1]], color: 'green' }, // S
    { shape: [[0, 1, 1], [1, 1, 0]], color: 'red' }, // Z
    { shape: [[1, 0, 0], [1, 1, 1]], color: 'orange' }, // L
    { shape: [[0, 0, 1], [1, 1, 1]], color: 'blue' } // J
];

let board = [];
let currentTetromino = null;
let nextTetromino = null;
let currentX = 0;
let currentY = 0;
let score = 0;
let level = 1;
let dropInterval = 1000; // ミリ秒
let gameLoop;
let gameOver = true;

// ボードの初期化
function initBoard() {
    board = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
}

// テトロミノの生成
function generateTetromino() {
    if (!nextTetromino) {
        nextTetromino = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
    }
    currentTetromino = nextTetromino;
    nextTetromino = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)]; // 次のテトロミノを予約
    currentX = Math.floor((COLS - currentTetromino.shape[0].length) / 2);
    currentY = 0;

    // ゲームオーバー判定
    if (checkCollision(0, 0, currentTetromino.shape)) {
        gameOver = true;
        clearInterval(gameLoop);
        alert(`ゲームオーバー！ スコア: ${score}`);
        startButton.textContent = 'もう一度プレイ';
        startButton.disabled = false;
    }
}

// ブロックの描画
function drawBlock(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeStyle = '#333';
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// ゴーストブロックの描画
function drawGhostBlock(x, y, color) {
    context.fillStyle = color;
    context.globalAlpha = 0.4; // 少し透明にする
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeStyle = '#333';
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.globalAlpha = 1.0; // 透明度を元に戻す
}

// ボードと現在のテトロミノの描画
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height); // キャンバスをクリア

    // ボードを描画
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== 0) {
                drawBlock(c, r, board[r][c]);
            }
        }
    }

    // ゴーストブロックを描画
    if (currentTetromino) {
        let ghostY = currentY;
        // 現在のテトロミノの形状で衝突せずに落下できる一番下のY座標を計算
        while (!checkCollision(0, ghostY + 1 - currentY, currentTetromino.shape)) {
            ghostY++;
        }
        for (let r = 0; r < currentTetromino.shape.length; r++) {
            for (let c = 0; c < currentTetromino.shape[r].length; c++) {
                if (currentTetromino.shape[r][c] === 1) {
                    drawGhostBlock(currentX + c, ghostY + r, currentTetromino.color);
                }
            }
        }

        // 現在のテトロミノを描画
        for (let r = 0; r < currentTetromino.shape.length; r++) {
            for (let c = 0; c < currentTetromino.shape[r].length; c++) {
                if (currentTetromino.shape[r][c] === 1) {
                    drawBlock(currentX + c, currentY + r, currentTetromino.color);
                }
            }
        }
    }

    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
}

// 衝突判定
function checkCollision(offsetX, offsetY, shape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] === 0) continue;

            const newX = currentX + c + offsetX;
            const newY = currentY + r + offsetY;

            // 境界外、または既にブロックがある場所に衝突
            if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY][newX] !== 0)) {
                return true;
            }
        }
    }
    return false;
}

// テトロミノをボードに固定
function mergeTetromino() {
    for (let r = 0; r < currentTetromino.shape.length; r++) {
        for (let c = 0; c < currentTetromino.shape[r].length; c++) {
            if (currentTetromino.shape[r][c] === 1) {
                board[currentY + r][currentX + c] = currentTetromino.color;
            }
        }
    }
}

// ライン消去
function clearLines() {
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
            // 行が完全に埋まっている場合
            board.splice(r, 1); // その行を削除
            board.unshift(Array(COLS).fill(0)); // 新しい空の行を上に追加
            linesCleared++;
            r++; // 行を削除したので、同じ行をもう一度チェックするためにインクリメント
        }
    }
    if (linesCleared > 0) {
        score += linesCleared * 100 * level; // スコア加算
        // レベルアップのロジック (例: 10ライン消すごとにレベルアップ)
        if (score >= level * 500) {
            level++;
            dropInterval = Math.max(50, dropInterval - 50); // 落下速度を上げる (最低50ms)
            clearInterval(gameLoop);
            gameLoop = setInterval(drop, dropInterval);
        }
    }
}

// テトロミノを落とす
function drop() {
    if (!gameOver) {
        if (!checkCollision(0, 1, currentTetromino.shape)) {
            currentY++;
        } else {
            mergeTetromino();
            clearLines();
            generateTetromino();
        }
        draw();
    }
}

// テトロミノの移動
function move(direction) {
    if (!gameOver) {
        if (!checkCollision(direction, 0, currentTetromino.shape)) {
            currentX += direction;
            draw();
        }
    }
}

// テトロミノの回転
function rotate() {
    if (!gameOver) {
        const originalShape = currentTetromino.shape;
        const rotatedShape = [];
        for (let c = 0; c < originalShape[0].length; c++) {
            const newRow = [];
            for (let r = originalShape.length - 1; r >= 0; r--) {
                newRow.push(originalShape[r][c]);
            }
            rotatedShape.push(newRow);
        }

        // 回転後の衝突判定 (Wall Kick)
        if (!checkCollision(0, 0, rotatedShape)) {
            currentTetromino.shape = rotatedShape;
            draw();
        } else {
            // 壁蹴りロジック (簡易版)
            // 右に1つずらして試す
            if (!checkCollision(1, 0, rotatedShape)) {
                currentX++;
                currentTetromino.shape = rotatedShape;
                draw();
            }
            // 左に1つずらして試す
            else if (!checkCollision(-1, 0, rotatedShape)) {
                currentX--;
                currentTetromino.shape = rotatedShape;
                draw();
            }
        }
    }
}

// キーボード入力
document.addEventListener('keydown', e => {
    if (gameOver) return;

    switch (e.key) {
        case 'ArrowLeft':
            move(-1);
            break;
        case 'ArrowRight':
            move(1);
            break;
        case 'ArrowDown':
            // ソフトドロップ: 1マス下に動かす
            if (!checkCollision(0, 1, currentTetromino.shape)) {
                currentY++;
                score += 1; // ソフトドロップで微量のスコア
                draw();
            }
            break;
        case 'ArrowUp':
        case 'z':
        case 'x':
            rotate();
            break;
        case ' ': // スペースキーでハードドロップ
            e.preventDefault(); // スペースキーによるスクロールを防ぐ
            while (!checkCollision(0, 1, currentTetromino.shape)) {
                currentY++;
                score += 2; // ハードドロップで多めのスコア
            }
            mergeTetromino();
            clearLines();
            generateTetromino();
            draw();
            break;
    }
});

// ゲーム開始ボタン
startButton.addEventListener('click', startGame);

function startGame() {
    gameOver = false;
    score = 0;
    level = 1;
    dropInterval = 1000;
    initBoard();
    generateTetromino();
    draw();
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    gameLoop = setInterval(drop, dropInterval);
    startButton.disabled = true; // ゲーム中はボタンを無効化
    startButton.textContent = 'ゲーム中...';
}

// 初期描画
draw();
