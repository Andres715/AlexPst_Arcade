// Módulo del juego Fresa Diet Simulator (Catch the Falling Objects)
export function initCakesGame() {
    const canvas = document.getElementById('canvas-cakes');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Estados de juego
    let gameState = 'START_SCREEN'; 
    let gameLoopId = null;
    let score = 0;
    
    // Sistema de Vidas y Clutch
    let lives = 3;
    let clutchCounter = 0; // Contador para recuperar vida

    let items = [];
    let lastSpawnTime = 0;
    
    // Control del Jugador y Berserker
    let playerVisualState = 'IDLE'; 
    let berserkerTimer = 0;
    let lastEatTime = 0;
    let gameOverCooldown = 0;
    let cooldownIntervalId = null;

    const keys = { left: false, right: false };
    let targetTouchX = null;

    // ⚙️ CONFIGURACIÓN PARAMETRIZABLE
    const difficulties = {
        facil: { 
            playerSpeed: 6.0,
            fallSpeedMin: 2.5,
            fallSpeedMax: 4.0,
            spawnInterval: 1200,
            badFoodChance: 0.15,   // 15% de probabilidad de que caiga algo malo
            specialChance: 0.02    // 2% de probabilidad de palomitas (Berserker)
        },
        medio: { 
            playerSpeed: 7.5,
            fallSpeedMin: 4.0,
            fallSpeedMax: 6.0,
            spawnInterval: 800,
            badFoodChance: 0.25,
            specialChance: 0.03
        },
        dificil: { 
            playerSpeed: 8.5,
            fallSpeedMin: 5.0,
            fallSpeedMax: 7.0,
            spawnInterval: 500,
            badFoodChance: 0.35,
            specialChance: 0.04
        }
    };
    let selectedDifficulty = 'medio';

    // Parámetros físicos de tamaño
    const sizeConfig = {
        base: 60,
        max: 90, // 150% de 60
        increment: 3, // Cuánto crece por comida
        shrinkDelay: 3000 // ms sin comer para empezar a encoger
    };

    // 🎨 CARGA DE RECURSOS (Imágenes)
    const imgs = {
        idle: new Image(),
        hurt: new Image(),
        berserker: new Image(),
        goodFoods: [new Image(), new Image()],
        special: new Image(),
        badFoods: []
    };
    
    imgs.idle.src = './wwwroot/images/emotes/alexpsPls.png';
    imgs.hurt.src = './wwwroot/images/emotes/alexpsSad.png';
    imgs.berserker.src = './wwwroot/images/emotes/alexpsIzipizi.png';
    
    imgs.goodFoods[0].src = './wwwroot/images/sub_badges/fresa_con_chocolate.png';
    imgs.goodFoods[1].src = './wwwroot/images/sub_badges/fresa_madura.png';
    imgs.special.src = './wwwroot/images/emotes/alexpsPopcorn.png';

    // Easter Egg: Emotes al azar como "comida mala" (Futura camioneta)
    const badEmotesList = ['alexpsAngry.png', 'alexpsQue.png', 'alexpsQuede.png', 'alexpsEeh.png'];
    badEmotesList.forEach(file => {
        const img = new Image();
        img.src = `./wwwroot/images/emotes/${file}`;
        imgs.badFoods.push(img);
    });

    // Objeto Jugador
    const player = { 
        x: canvas.width / 2 - 30, 
        y: canvas.height - 80, 
        width: sizeConfig.base, 
        height: sizeConfig.base,
        targetWidth: sizeConfig.base 
    };

    const buttons = {
        facil:   { x: 150, y: 190, w: 110, h: 40, label: '🌸 Fácil' },
        medio:   { x: 295, y: 190, w: 110, h: 40, label: '⚡ Medio' },
        dificil: { x: 440, y: 190, w: 110, h: 40, label: '🔥 Difícil' },
        play:    { x: 275, y: 250, w: 150, h: 50, label: '¡JUGAR!' }
    };

    // EVENTOS DE ENTRADA (Movimiento Horizontal)
    function handleKeyDown(e) {
        if (gameState === 'PLAYING') {
            if (e.code === 'ArrowLeft') keys.left = true;
            if (e.code === 'ArrowRight') keys.right = true;
        }
    }

    function handleKeyUp(e) {
        if (gameState === 'PLAYING') {
            if (e.code === 'ArrowLeft') keys.left = false;
            if (e.code === 'ArrowRight') keys.right = false;
        }
        if (gameState === 'GAME_OVER' && e.code === 'Space' && gameOverCooldown <= 0) {
            resetToStartScreen();
        }
    }

    function handlePointerDown(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const clickX = clientX - rect.left;
        const clickY = clientY - rect.top;

        if (gameState === 'START_SCREEN') {
            if (isInside(clickX, clickY, buttons.facil)) selectedDifficulty = 'facil';
            if (isInside(clickX, clickY, buttons.medio)) selectedDifficulty = 'medio';
            if (isInside(clickX, clickY, buttons.dificil)) selectedDifficulty = 'dificil';
            if (isInside(clickX, clickY, buttons.play)) startGame();
            renderStartScreen();
        } 
        else if (gameState === 'PLAYING') {
            targetTouchX = clickX; 
        } 
        else if (gameState === 'GAME_OVER' && gameOverCooldown <= 0) {
            resetToStartScreen();
        }
    }

    function handlePointerMove(e) {
        if (gameState === 'PLAYING' && targetTouchX !== null) {
            const rect = canvas.getBoundingClientRect();
            targetTouchX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.top;
        }
    }

    function handlePointerUp() {
        targetTouchX = null; 
    }

    function isInside(x, y, btn) {
        return x > btn.x && x < btn.x + btn.w && y > btn.y && y < btn.y + btn.h;
    }

    // CONTROL DE ESTADOS
    function startGame() {
        score = 0;
        lives = 3;
        clutchCounter = 0;
        items = [];
        playerVisualState = 'IDLE';
        berserkerTimer = 0;
        
        player.targetWidth = sizeConfig.base;
        player.width = sizeConfig.base;
        player.height = sizeConfig.base;
        player.x = canvas.width / 2 - (player.width / 2);
        
        keys.left = false;
        keys.right = false;
        targetTouchX = null;
        lastSpawnTime = Date.now();
        lastEatTime = Date.now();

        gameState = 'PLAYING';
        loop();
    }

    function resetToStartScreen() {
        gameState = 'START_SCREEN';
        renderStartScreen();
    }

    function startGameOverCooldown() {
        gameOverCooldown = 3;
        if (cooldownIntervalId) clearInterval(cooldownIntervalId);
        cooldownIntervalId = setInterval(() => {
            gameOverCooldown--;
            if (gameState === 'GAME_OVER') renderGameOverScreen();
            if (gameOverCooldown <= 0) clearInterval(cooldownIntervalId);
        }, 1000);
    }

    // LÓGICA DE ITEMS Y COLISIONES
    function spawnItem(config) {
        const xPos = Math.random() * (canvas.width - 40);
        const speed = config.fallSpeedMin + Math.random() * (config.fallSpeedMax - config.fallSpeedMin);
        
        let type = 'GOOD';
        let img = imgs.goodFoods[Math.floor(Math.random() * imgs.goodFoods.length)];
        
        // Determinar tipo de item basado en probabilidades
        if (berserkerTimer > 0) {
            // En Berserker solo caen fresas maduras rápido
            type = 'GOOD';
            img = imgs.goodFoods[1];
        } else {
            const roll = Math.random();
            if (roll < config.specialChance) {
                type = 'SPECIAL';
                img = imgs.special;
            } else if (roll < config.badFoodChance + config.specialChance) {
                type = 'BAD';
                img = imgs.badFoods[Math.floor(Math.random() * imgs.badFoods.length)];
            }
        }

        items.push({ x: xPos, y: -50, width: 40, height: 40, vy: speed, type: type, img: img });
    }

    function triggerBerserker() {
        berserkerTimer = 300; // 5 segundos aprox a 60fps
        playerVisualState = 'BERSERKER';
        // Limpiar todas las comidas malas de la pantalla
        items = items.filter(item => item.type !== 'BAD');
    }

    // INTERFACES VISUALES
    function renderStartScreen() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff5c8a';
        ctx.font = 'bold 28px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText('Fresa Diet Simulator', canvas.width / 2, 80);

        ctx.fillStyle = '#666';
        ctx.font = '16px Fredoka';
        ctx.fillText('Atrapa fresas, esquiva los traumas.', canvas.width / 2, 130);

        ['facil', 'medio', 'dificil'].forEach(diff => {
            const btn = buttons[diff];
            const isSelected = selectedDifficulty === diff;
            
            ctx.fillStyle = isSelected ? '#ff5c8a' : 'transparent';
            ctx.strokeStyle = '#ff8fab';
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isSelected ? '#ffffff' : '#ff5c8a';
            ctx.font = 'bold 15px Fredoka';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
        });

        const playBtn = buttons.play;
        ctx.fillStyle = '#70d6ff';
        ctx.strokeStyle = '#00b4d8';
        ctx.beginPath();
        ctx.roundRect(playBtn.x, playBtn.y, playBtn.w, playBtn.h, 15);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Fredoka';
        ctx.fillText(playBtn.label, playBtn.x + playBtn.w / 2, playBtn.y + playBtn.h / 2 + 7);

        ctx.drawImage(imgs.idle, canvas.width / 2 - 30, 320, 60, 60);
        ctx.textAlign = 'left';
    }

    function renderGameOverScreen() {
        ctx.fillStyle = 'rgba(255, 240, 243, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff5c8a';
        ctx.font = 'bold 30px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText('¡Dieta arruinada!', canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '16px Fredoka';
        ctx.fillStyle = '#70d6ff';
        ctx.fillText(`Puntuación final: ${score}`, canvas.width / 2, canvas.height / 2 + 15);

        if (gameOverCooldown > 0) {
            ctx.fillStyle = '#ffb3c6';
            ctx.font = 'bold 18px Fredoka';
            ctx.fillText(`Espera... ${gameOverCooldown}s`, canvas.width / 2, canvas.height / 2 + 55);
        } else {
            ctx.fillStyle = '#ff5c8a';
            ctx.font = 'bold 16px Fredoka';
            ctx.fillText('✨ Toca para jugar de nuevo ✨', canvas.width / 2, canvas.height / 2 + 55);
        }
        ctx.textAlign = 'left';
    }

    function drawUI() {
        // Puntuación
        ctx.fillStyle = '#ff5c8a';
        ctx.font = 'bold 20px Fredoka';
        ctx.fillText(`Puntos: ${score}`, 20, 35);

        // Vidas (Corazones)
        ctx.fillStyle = '#ff0054';
        ctx.font = '24px Arial';
        let hearts = '';
        for(let i=0; i<lives; i++) hearts += '❤ ';
        ctx.fillText(hearts, canvas.width - 100, 35);

        // Mecánica Clutch UI
        if (lives === 1) {
            ctx.fillStyle = '#70d6ff';
            ctx.font = '14px Fredoka';
            ctx.fillText(`Supervivencia: ${clutchCounter}/10 para curar`, canvas.width - 250, 60);
        }

        // Overlay Berserker
        if (berserkerTimer > 0) {
            ctx.fillStyle = 'rgba(255, 229, 236, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff5c8a';
            ctx.textAlign = 'center';
            ctx.fillText('¡MODO ATRACÓN X2!', canvas.width / 2, 40);
            ctx.textAlign = 'left';
        }
    }

    // 🔄 BUCLE PRINCIPAL
    function loop() {
        if (gameState !== 'PLAYING') return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const config = difficulties[selectedDifficulty];
        const now = Date.now();

        // 1. Lógica Berserker y Tamaño
        let currentSpeed = config.playerSpeed;
        if (berserkerTimer > 0) {
            berserkerTimer--;
            currentSpeed *= 1.8; // Más rápido
            if (berserkerTimer <= 0) playerVisualState = 'IDLE';
        } else {
            // Encogimiento gradual si pasa mucho tiempo sin comer
            if (now - lastEatTime > sizeConfig.shrinkDelay) {
                player.targetWidth = sizeConfig.base;
            }
        }

        // Lerp (Interpolación) suave para el tamaño
        player.width += (player.targetWidth - player.width) * 0.1;
        player.height = player.width; // Mantener proporción cuadrada
        // Ajustar 'y' para que crezca desde el suelo
        player.y = canvas.height - player.height - 20;

        // 2. Movimiento del Jugador (Suave)
        if (keys.left) player.x -= currentSpeed;
        if (keys.right) player.x += currentSpeed;
        
        if (targetTouchX !== null) {
            const playerCenter = player.x + player.width / 2;
            if (Math.abs(targetTouchX - playerCenter) > currentSpeed) {
                if (targetTouchX < playerCenter) player.x -= currentSpeed;
                if (targetTouchX > playerCenter) player.x += currentSpeed;
            }
        }

        // Limites de pantalla
        if (player.x < 0) player.x = 0;
        if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

        // 3. Spawn de Items
        let currentSpawnInterval = config.spawnInterval;
        if (berserkerTimer > 0) currentSpawnInterval *= 0.4; // Llueven más rápido

        if (now - lastSpawnTime > currentSpawnInterval) {
            spawnItem(config);
            lastSpawnTime = now;
        }

        // 4. Actualizar Items y Colisiones
        for (let i = items.length - 1; i >= 0; i--) {
            let item = items[i];
            
            // Gravedad/Velocidad aumentada en Berserker
            item.y += (berserkerTimer > 0) ? item.vy * 1.5 : item.vy;
            ctx.drawImage(item.img, item.x, item.y, item.width, item.height);

            // Colisión AABB
            const padding = 10;
            if (
                player.x + padding < item.x + item.width &&
                player.x + player.width - padding > item.x &&
                player.y + padding < item.y + item.height &&
                player.y + player.height > item.y + padding
            ) {
                // Evaluamos qué comió
                if (item.type === 'GOOD') {
                    score += (berserkerTimer > 0) ? 20 : 10;
                    lastEatTime = now;
                    // Aumentar tamaño
                    player.targetWidth = Math.min(sizeConfig.max, player.targetWidth + sizeConfig.increment);
                    
                    // Mecánica de Clutch
                    if (lives === 1 && berserkerTimer <= 0) {
                        clutchCounter++;
                        if (clutchCounter >= 10) {
                            lives++;
                            clutchCounter = 0;
                        }
                    }
                } 
                else if (item.type === 'BAD') {
                    lives--;
                    playerVisualState = 'HURT';
                    player.targetWidth = sizeConfig.base; // Pierde la ventaja de tamaño
                    clutchCounter = 0; // Reinicia el clutch
                    
                    setTimeout(() => { if (playerVisualState === 'HURT') playerVisualState = 'IDLE'; }, 1000);
                    
                    if (lives <= 0) {
                        gameState = 'GAME_OVER';
                        startGameOverCooldown();
                    }
                }
                else if (item.type === 'SPECIAL') {
                    triggerBerserker();
                }

                items.splice(i, 1);
                continue;
            }

            // Eliminar si cae al suelo
            if (item.y > canvas.height) {
                if (item.type === 'GOOD') {
                    // No quita vida, pero reinicia el clutch como castigo estratégico
                    clutchCounter = 0; 
                }
                items.splice(i, 1);
            }
        }

        // 5. Dibujar Jugador
        let imgToDraw = imgs.idle;
        if (playerVisualState === 'BERSERKER') imgToDraw = imgs.berserker;
        if (playerVisualState === 'HURT') imgToDraw = imgs.hurt;
        
        ctx.drawImage(imgToDraw, player.x, player.y, player.width, player.height);

        // 6. UI
        drawUI();

        if (gameState === 'PLAYING') {
            gameLoopId = requestAnimationFrame(loop);
        } else if (gameState === 'GAME_OVER') {
            renderGameOverScreen();
        }
    }

    // Registro de Eventos
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    canvas.addEventListener('touchstart', function(e) { e.preventDefault(); handlePointerDown(e); }, { passive: false });
    canvas.addEventListener('touchmove', function(e) { e.preventDefault(); handlePointerMove(e); }, { passive: false });
    canvas.addEventListener('touchend', handlePointerUp);

    renderStartScreen();

    // Destructor
    return function destroy() {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousedown', handlePointerDown);
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseup', handlePointerUp);
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        if (cooldownIntervalId) clearInterval(cooldownIntervalId);
    };
}