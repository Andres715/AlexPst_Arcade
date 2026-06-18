// Módulo del juego Dino Run con Selector de Dificultad, Físicas Calibradas y Cooldown de Game Over
export function initDinoGame() {
    const canvas = document.getElementById('canvas-dino');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Estados posibles del juego: 'START_SCREEN', 'PLAYING', 'GAME_OVER'
    let gameState = 'START_SCREEN'; 
    let gameLoopId = null;
    let score = 0;
    
    // Variables para el Cooldown de reinicio al perder
    let gameOverCooldown = 0; // Guardará los segundos restantes (3, 2, 1, 0)
    let cooldownIntervalId = null;

    // Configuración de dificultades con calibración de físicas personalizadas
    const difficulties = {
        facil: { 
            initialSpeed: 3, 
            acceleration: 0.1,
            jumpForce: -10.5,  
            gravity: 0.3      
        },
        medio: { 
            initialSpeed: 4.5, 
            acceleration: 0.2,
            jumpForce: -11.5, 
            gravity: 0.42     
        },
        dificil: { 
            initialSpeed: 6, 
            acceleration: 0.3,
            jumpForce: -12,   
            gravity: 0.6      
        }
    };
    let selectedDifficulty = 'medio'; // Por defecto

    // Carga de imágenes
    const playerImg = new Image();
    playerImg.src = './wwwroot/images/emotes/alexpsHi.png';

    const obstacleImg = new Image();
    // obstacleImg.src = './wwwroot/images/sub_badges/fresa_con_chocolate.png';
    obstacleImg.src = './wwwroot/images/misc/camioneta_alex.png';

    // Personaje (AlexPst)
    const player = {
        x: 50,
        y: 280,
        width: 60,
        height: 60,
        vy: 0,
        gravity: 0.6,
        jumpForce: -12,
        isGrounded: true
    };

    // Obstáculo (Camioneta provisional)
    const obstacle = {
        x: canvas.width,
        y: 290,
        width: 87.1,
        height: 50,
        speed: 4.5
    };

    // Coordenadas de los botones interactivos del Canvas
    const buttons = {
        facil:   { x: 150, y: 220, w: 110, h: 40, label: '🌸 Fácil' },
        medio:   { x: 295, y: 220, w: 110, h: 40, label: '⚡ Medio' },
        dificil: { x: 440, y: 220, w: 110, h: 40, label: '🔥 Difícil' },
        play:    { x: 275, y: 300, w: 150, h: 50, label: '¡JUGAR!' }
    };

    // Lógica del Salto
    function jump() {
        if (player.isGrounded) {
            playSound('jump_alex_8_bit.mp3');
            player.vy = player.jumpForce;
            player.isGrounded = false;
        }
    }

    // Escuchador de Teclado
    function handleKeyDown(e) {
        if (gameState === 'PLAYING' && (e.code === 'Space' || e.code === 'ArrowUp')) {
            jump();
        }
        // Solo permite reiniciar si el cooldown llegó a 0
        if (gameState === 'GAME_OVER' && e.code === 'Space' && gameOverCooldown <= 0) {
            resetToStartScreen();
        }
    }

    // Escuchador de Clics / Toques
    function handleCanvasClick(e) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        if (gameState === 'START_SCREEN') {
            if (isInside(clickX, clickY, buttons.facil)) selectedDifficulty = 'facil';
            if (isInside(clickX, clickY, buttons.medio)) selectedDifficulty = 'medio';
            if (isInside(clickX, clickY, buttons.dificil)) selectedDifficulty = 'dificil';
            
            if (isInside(clickX, clickY, buttons.play)) {
                startGame();
            }
            renderStartScreen();
        } 
        else if (gameState === 'PLAYING') {
            jump();
        } 
        // Solo permite reiniciar si el cooldown llegó a 0
        else if (gameState === 'GAME_OVER' && gameOverCooldown <= 0) {
            resetToStartScreen();
        }
    }

    function isInside(x, y, btn) {
        return x > btn.x && x < btn.x + btn.w && y > btn.y && y < btn.y + btn.h;
    }

    function startGame() {
        playSound('start_alex.mp3');

        score = 0;
        player.y = 280;
        player.vy = 0;
        player.isGrounded = true;
        
        const config = difficulties[selectedDifficulty];
        obstacle.speed = config.initialSpeed;
        player.jumpForce = config.jumpForce;
        player.gravity = config.gravity;

        obstacle.x = canvas.width;
        playerImg.src = './wwwroot/images/emotes/alexpsHi.png';
        gameState = 'PLAYING';
        loop();
    }

    function resetToStartScreen() {
        gameState = 'START_SCREEN';
        renderStartScreen();
    }

    // Activa la cuenta regresiva al perder
    function startGameOverCooldown() {
        gameOverCooldown = 3; // 3 segundos de bloqueo
        
        // Limpiamos cualquier intervalo previo por seguridad
        if (cooldownIntervalId) clearInterval(cooldownIntervalId);

        cooldownIntervalId = setInterval(() => {
            gameOverCooldown--;
            
            // Si el juego sigue en GAME_OVER, redibujamos la pantalla para actualizar el timer
            if (gameState === 'GAME_OVER') {
                renderGameOverScreen();
            }

            if (gameOverCooldown <= 0) {
                clearInterval(cooldownIntervalId);
            }
        }, 1000);
    }

    // DIBUJAR PANTALLA DE INICIO
    function renderStartScreen() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff3f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffc2d1';
        ctx.fillRect(0, 340, canvas.width, 60);

        ctx.fillStyle = '#ff5c8a';
        ctx.font = 'bold 28px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText('¡Cuidado, Mamá al Volante!', canvas.width / 2, 90);

        ctx.fillStyle = '#666';
        ctx.font = '16px Fredoka';
        ctx.fillText('Selecciona tu dificultad antes de huir:', canvas.width / 2, 140);

        ['facil', 'medio', 'dificil'].forEach(diff => {
            const btn = buttons[diff];
            const isSelected = selectedDifficulty === diff;
            
            ctx.fillStyle = isSelected ? '#ff5c8a' : '#ffe5ec';
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

        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
        ctx.textAlign = 'left';
    }

    // DIBUJAR PANTALLA DE GAME OVER CON CONTADOR
    function renderGameOverScreen() {
        ctx.fillStyle = 'rgba(255, 214, 224, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff5c8a';
        ctx.font = 'bold 30px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText('¡F en el chat! Te atropellaron', canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '16px Fredoka';
        ctx.fillStyle = '#70d6ff';
        ctx.fillText(`Conseguiste ${score} puntos en modo ${selectedDifficulty}`, canvas.width / 2, canvas.height / 2 + 15);

        // Renderizado condicional del texto según el estado del timer
        if (gameOverCooldown > 0) {
            ctx.fillStyle = '#ffb3c6';
            ctx.font = 'bold 18px Fredoka';
            ctx.fillText(`Espera... ${gameOverCooldown}s`, canvas.width / 2, canvas.height / 2 + 55);
        } else {
            ctx.fillStyle = '#5271ff';
            ctx.font = 'bold 16px Fredoka';
            ctx.fillText('✨ Haz clic o presiona Espacio para volver a jugar ✨', canvas.width / 2, canvas.height / 2 + 55);
        }
        ctx.textAlign = 'left';
    }

    // BUCLE PRINCIPAL
    function loop() {
        if (gameState !== 'PLAYING') return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffc2d1';
        ctx.fillRect(0, 340, canvas.width, 60);

        player.vy += player.gravity;
        player.y += player.vy;

        if (player.y >= 280) {
            player.y = 280;
            player.vy = 0;
            player.isGrounded = true;
        }

        obstacle.x -= obstacle.speed;
        if (obstacle.x < -obstacle.width) {
            obstacle.x = canvas.width;
            score++;

            const maxSpeed = difficulties[selectedDifficulty].initialSpeed * 2.25;

            if (obstacle.speed < maxSpeed) {
                obstacle.speed += difficulties[selectedDifficulty].acceleration;
                
                if (obstacle.speed > maxSpeed) {
                    obstacle.speed = maxSpeed;
                }
            }
        }

        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
        ctx.drawImage(obstacleImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);

        ctx.fillStyle = '#ff5c8a';
        ctx.font = 'bold 18px Fredoka';
        ctx.fillText(`Puntos: ${score}`, 20, 40);
        
        ctx.fillStyle = '#a3bdfd';
        ctx.font = '14px Fredoka';
        const diffText = selectedDifficulty.toUpperCase();
        ctx.fillText(`Dificultad: ${diffText}`, 20, 65);

        // Colisiones
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y
        ) {
            gameState = 'GAME_OVER';
            playSound('fail_alex.mp3', 0.1);
            playerImg.src = './wwwroot/images/emotes/alexpsSad.png';
            
            // Activamos el bloqueo e imprimimos la pantalla de perder
            startGameOverCooldown();
            renderGameOverScreen();
        }

        if (gameState === 'PLAYING') {
            gameLoopId = requestAnimationFrame(loop);
        }
    }

    // Función auxiliar para registrar el touch correctamente
    function handleTouchStart(e) {
        e.preventDefault();
        handleCanvasClick(e.changedTouches[0]);
    }

    // Adjuntar Eventos Reales instantáneos
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('mousedown', handleCanvasClick);
    canvas.addEventListener('touchstart', handleTouchStart);

    // Reproducir audio de salto 
    function playSound(soundName, volume = 0.25) {
        const audio = new Audio(`./wwwroot/sounds/${soundName}`);
        audio.volume = volume;

        audio.play().catch(error => {
            console.error("Error al reproducir el audio:", error);
        });
    }

    renderStartScreen();

    // DESTRUCTOR CON RECOLECTOR DE BASURA CORREGIDO
    return function destroy() {
        window.removeEventListener('keydown', handleKeyDown);
        canvas.removeEventListener('mousedown', handleCanvasClick);
        canvas.removeEventListener('touchstart', handleTouchStart);
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        if (cooldownIntervalId) clearInterval(cooldownIntervalId);
    };
}