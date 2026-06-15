// Módulo del juego Gym Wars: Modo Fresa (Gym Dodge Aéreo - 2 Lanzadoras Dinámicas)
export function initGymGame() {
    const canvas = document.getElementById('canvas-gym');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Estados de juego
    let gameState = 'START_SCREEN'; 
    let gameLoopId = null;
    let score = 0;
    let patience = 100;
    
    let throwers = []; 
    let projectiles = []; 
    let playerVisualState = 'IDLE'; 
    let currentHurtImg = null;
    let hurtTimer = 0;

    let gameOverCooldown = 0;
    let cooldownIntervalId = null;

    const keys = { up: false, down: false };
    let targetTouchY = null;

    // ⚙️ CONFIGURACIÓN PARAMETRIZABLE
    const difficulties = {
        facil: { 
            throwerSpeed: 2.0,     // Velocidad a la que la fresa sube/baja
            playerSpeed: 4.5,      
            projectileSpeed: 3.5,  
            spawnInterval: 1800,   // Frecuencia base de lanzamiento
            damage: 25
        },
        medio: { 
            throwerSpeed: 4.0,     // Fresas más escurridizas
            playerSpeed: 6.5,      
            projectileSpeed: 5.5,
            spawnInterval: 1100, 
            damage: 34
        },
        dificil: { 
            throwerSpeed: 5.0,     // Fresas a toda velocidad
            playerSpeed: 7.0,      
            projectileSpeed: 6.5, 
            spawnInterval: 600, 
            damage: 50
        }
    };
    let selectedDifficulty = 'medio';

    // 🎨 CARGA DE RECURSOS (Imágenes)
    const imgs = {
        idle: new Image(),
        hurtAngry: new Image(),
        hurtQuede: new Image(),
        sad: new Image(),
        thrower: new Image(),
        badges: []
    };
    
    imgs.idle.src = './wwwroot/images/emotes/alexpsHi.png';
    imgs.hurtAngry.src = './wwwroot/images/emotes/alexpsAngry.png';
    imgs.hurtQuede.src = './wwwroot/images/emotes/alexpsQuede.png';
    imgs.sad.src = './wwwroot/images/emotes/alexpsSad.png';
    imgs.thrower.src = './wwwroot/images/sub_badges/fresa_verde.png'; 

    const badgeFiles = ['bebida_celeste.png', 'bebida_morada.png', 'bebida_naranja.png', 'bebida_rosa.png', 'bebida_verde.png'];
    badgeFiles.forEach(file => {
        const img = new Image();
        img.src = `./wwwroot/images/cheer_badges/${file}`;
        imgs.badges.push(img);
    });

    const player = { x: canvas.width / 2 - 30, y: canvas.height / 2 - 30, width: 60, height: 60 };

    const buttons = {
        facil:   { x: 150, y: 190, w: 110, h: 40, label: '🌸 Fácil' },
        medio:   { x: 295, y: 190, w: 110, h: 40, label: '⚡ Medio' },
        dificil: { x: 440, y: 190, w: 110, h: 40, label: '🔥 Difícil' },
        play:    { x: 275, y: 250, w: 150, h: 50, label: '¡JUGAR!' }
    };

    // 💥 LÓGICA DE DAÑO
    function takeDamage() {
        patience -= difficulties[selectedDifficulty].damage;
        playerVisualState = 'HURT';
        hurtTimer = 25; 
        currentHurtImg = Math.random() > 0.5 ? imgs.hurtAngry : imgs.hurtQuede;

        if (patience <= 0) {
            patience = 0;
            gameState = 'GAME_OVER';
            startGameOverCooldown();
        }
    }

    function handleKeyDown(e) {
        if (gameState === 'PLAYING') {
            if (e.code === 'ArrowUp') keys.up = true;
            if (e.code === 'ArrowDown') keys.down = true;
        }
    }

    function handleKeyUp(e) {
        if (gameState === 'PLAYING') {
            if (e.code === 'ArrowUp') keys.up = false;
            if (e.code === 'ArrowDown') keys.down = false;
        }
        if (gameState === 'GAME_OVER' && e.code === 'Space' && gameOverCooldown <= 0) {
            resetToStartScreen();
        }
    }

    function handlePointerDown(e) {
        const rect = canvas.getBoundingClientRect();
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
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
            targetTouchY = clickY; 
        } 
        else if (gameState === 'GAME_OVER' && gameOverCooldown <= 0) {
            resetToStartScreen();
        }
    }

    function handlePointerMove(e) {
        if (gameState === 'PLAYING' && targetTouchY !== null) {
            const rect = canvas.getBoundingClientRect();
            targetTouchY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        }
    }

    function handlePointerUp() {
        targetTouchY = null; 
    }

    function isInside(x, y, btn) {
        return x > btn.x && x < btn.x + btn.w && y > btn.y && y < btn.y + btn.h;
    }

    // CONTROL DE ESTADOS Y SPAWN
    function startGame() {
        score = 0;
        patience = 100;
        projectiles = [];
        playerVisualState = 'IDLE';
        player.y = canvas.height / 2 - 30;
        keys.up = false;
        keys.down = false;
        targetTouchY = null;

        const config = difficulties[selectedDifficulty];
        
        // Solo 2 señoras, posiciones y direcciones iniciales aleatorias para asincronía
        throwers = [
            { 
                side: 'left', 
                x: 10, 
                y: Math.random() * (canvas.height - 50), 
                vy: config.throwerSpeed * (Math.random() > 0.5 ? 1 : -1), // Sube o baja al azar inicialmente
                width: 50, 
                height: 50, 
                nextThrow: Date.now() + config.spawnInterval + Math.random() * 500
            },
            { 
                side: 'right', 
                x: canvas.width - 60, 
                y: Math.random() * (canvas.height - 50), 
                vy: config.throwerSpeed * (Math.random() > 0.5 ? 1 : -1), 
                width: 50, 
                height: 50, 
                nextThrow: Date.now() + config.spawnInterval + Math.random() * 500
            }
        ];

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

    // INTERFACES
    function renderStartScreen() {
        ctx.fillStyle = '#eef2ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#5271ff';
        ctx.font = 'bold 28px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText('Gym Wars: Modo Fresa', canvas.width / 2, 80);

        ctx.fillStyle = '#666';
        ctx.font = '16px Fredoka';
        ctx.fillText('¡Esquiva los termos que te lanzan las señoras para que desocupes!', canvas.width / 2, 130);

        ['facil', 'medio', 'dificil'].forEach(diff => {
            const btn = buttons[diff];
            const isSelected = selectedDifficulty === diff;
            
            ctx.fillStyle = isSelected ? '#5271ff' : '#eef2ff';
            ctx.strokeStyle = '#a3bdfd';
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isSelected ? '#ffffff' : '#5271ff';
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
        ctx.fillStyle = 'rgba(238, 242, 255, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#5271ff';
        ctx.font = 'bold 30px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText('¡Te quitaron la máquina!', canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '16px Fredoka';
        ctx.fillStyle = '#ff5c8a';
        ctx.fillText(`Sobreviviste con ${score} puntos (Modo ${selectedDifficulty})`, canvas.width / 2, canvas.height / 2 + 15);

        if (gameOverCooldown > 0) {
            ctx.fillStyle = '#a3bdfd';
            ctx.font = 'bold 18px Fredoka';
            ctx.fillText(`Calmando la paciencia... ${gameOverCooldown}s`, canvas.width / 2, canvas.height / 2 + 55);
        } else {
            ctx.fillStyle = '#5271ff';
            ctx.font = 'bold 16px Fredoka';
            ctx.fillText('✨ Toca la pantalla o presiona Espacio para intentar de nuevo ✨', canvas.width / 2, canvas.height / 2 + 55);
        }
        ctx.textAlign = 'left';
    }

    // 🔄 BUCLE PRINCIPAL (JUEGO)
    function loop() {
        if (gameState !== 'PLAYING') return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#eef2ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#cddafd'; 
        ctx.fillRect(canvas.width / 2 - 50, 0, 100, canvas.height);

        const config = difficulties[selectedDifficulty];

        // 1. Movimiento Suave del Jugador
        if (keys.up) player.y -= config.playerSpeed;
        if (keys.down) player.y += config.playerSpeed;
        
        if (targetTouchY !== null) {
            const playerCenter = player.y + player.height / 2;
            if (Math.abs(targetTouchY - playerCenter) > config.playerSpeed) {
                if (targetTouchY < playerCenter) player.y -= config.playerSpeed;
                if (targetTouchY > playerCenter) player.y += config.playerSpeed;
            }
        }

        // Limitar bordes del jugador
        if (player.y < 10) player.y = 10;
        if (player.y > canvas.height - player.height - 10) player.y = canvas.height - player.height - 10;

        // 2. Movimiento asíncrono de las Fresas y Lanzamiento de Bebidas
        const now = Date.now();
        throwers.forEach(t => {
            // Movimiento vertical constante
            t.y += t.vy;

            // Rebotar en los bordes del canvas
            if (t.y <= 0) {
                t.y = 0;
                t.vy *= -1;
            } else if (t.y >= canvas.height - t.height) {
                t.y = canvas.height - t.height;
                t.vy *= -1;
            }

            ctx.drawImage(imgs.thrower, t.x, t.y, t.width, t.height);

            // Disparo de proyectiles impredecible
            if (now > t.nextThrow) {
                const imgIdx = Math.floor(Math.random() * imgs.badges.length);
                projectiles.push({
                    x: t.side === 'left' ? t.x + 40 : t.x - 30,
                    y: t.y + 10,
                    width: 35,
                    height: 35,
                    vx: t.side === 'left' ? config.projectileSpeed : -config.projectileSpeed,
                    img: imgs.badges[imgIdx],
                    scored: false
                });
                
                // Variación random: Al tiempo base le sumamos/restamos hasta 300ms de fracción de segundo
                const randomVariance = (Math.random() * 600) - 300; 
                t.nextThrow = now + config.spawnInterval + randomVariance; 
            }
        });

        // 3. Control visual de AlexPst
        let imgToDraw = imgs.idle;
        if (playerVisualState === 'HURT') {
            hurtTimer--;
            imgToDraw = currentHurtImg;
            if (hurtTimer <= 0) playerVisualState = 'IDLE';
        }
        ctx.drawImage(imgToDraw, player.x, player.y, player.width, player.height);

        // 4. Mover Proyectiles, Colisiones y Puntuación
        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i];
            p.x += p.vx;
            ctx.drawImage(p.img, p.x, p.y, p.width, p.height);

            const padding = 8; // Hitbox ligeramente indulgente
            if (
                player.x + padding < p.x + p.width - padding &&
                player.x + player.width - padding > p.x + padding &&
                player.y + padding < p.y + p.height - padding &&
                player.y + player.height - padding > p.y + padding
            ) {
                takeDamage();
                projectiles.splice(i, 1);
                continue;
            }

            if (!p.scored && ((p.vx > 0 && p.x > player.x + player.width) || (p.vx < 0 && p.x + p.width < player.x))) {
                p.scored = true;
                score += 10;
            }

            if (p.x < -50 || p.x > canvas.width + 50) {
                projectiles.splice(i, 1);
            }
        }

        // 5. Interfaz de UI (Paciencia y Puntos)
        ctx.fillStyle = '#ffe5ec';
        ctx.fillRect(canvas.width / 2 - 100, 10, 200, 15);
        ctx.fillStyle = patience > 30 ? '#70d6ff' : '#ff5c8a';
        ctx.fillRect(canvas.width / 2 - 100, 10, Math.max(0, patience * 2), 15);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(canvas.width / 2 - 100, 10, 200, 15);
        
        ctx.fillStyle = '#5271ff';
        ctx.font = 'bold 18px Fredoka';
        ctx.fillText(`Puntos: ${score}`, 20, 25);

        if (gameState === 'PLAYING') {
            gameLoopId = requestAnimationFrame(loop);
        } else if (gameState === 'GAME_OVER') {
            ctx.drawImage(imgs.sad, player.x, player.y, player.width, player.height);
            renderGameOverScreen();
        }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    canvas.addEventListener('touchstart', function(e) { e.preventDefault(); handlePointerDown(e); }, { passive: false });
    canvas.addEventListener('touchmove', function(e) { e.preventDefault(); handlePointerMove(e); }, { passive: false });
    canvas.addEventListener('touchend', handlePointerUp);

    renderStartScreen();

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