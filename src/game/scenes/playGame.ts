// THE GAME ITSELF

// modules to import
import { GameOptions } from '../gameOptions';   // game options   

// PlayGame class extends Phaser.Scene class
export class PlayGame extends Phaser.Scene {

    constructor() {
        super({
            key : 'PlayGame'
        });
    }

    controlKeys : any;                                                  // keys used to move the player
    player      : Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;    // the player
    enemyGroup  : Phaser.Physics.Arcade.Group | null = null;                          // group with all enemies
    bulletGroup : Phaser.Physics.Arcade.Group | null = null;            // group with all bullets
    enemySprites: string[] = [];                                        // array of available enemy sprite keys
    playerHealth: number = GameOptions.playerMaxHealth;                 // current player health
    healthBarBg : Phaser.GameObjects.Rectangle | null = null;           // health bar background
    healthBarFg  : Phaser.GameObjects.Rectangle | null = null;           // health bar foreground (actual health)
    isInvulnerable : boolean = false;                                    // invulnerability flag to prevent multiple hits
    gameStartTime : number = 0;                                          // game start time in milliseconds
    timerText     : Phaser.GameObjects.Text | null = null;              // timer display text
    waveText      : Phaser.GameObjects.Text | null = null;              // wave announcement text
    bulletsText   : Phaser.GameObjects.Text | null = null;              // bullets count display text
    currentWave   : number = 1;                                         // current wave number
    enemyTimerEvent : Phaser.Time.TimerEvent | null = null;             // timer event for enemies
    bulletTimerEvent : Phaser.Time.TimerEvent | null = null;            // timer event for bullets
    bulletsRemaining : number = 0;                                       // remaining bullets count
    bulletDamage : number = 1;                                           // damage per bullet (from contract)
    enemyHealthMap : Map<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, number> = new Map(); // map enemies to their health
    activeBullets : Set<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody> = new Set(); // track bullets in flight
    backgroundStars : any = null; // background stars particle system
    backgroundGraphics : Phaser.GameObjects.Graphics | null = null; // background graphics

    // method to be called once the instance has been created
    create(data? : any) : void {

        // get enemy sprites array from scene data
        if (data && data.enemySprites) {
            this.enemySprites = data.enemySprites;
        }

        // get initial bullets and damage from scene data
        this.bulletsRemaining = (data && data.initialBullets) ? data.initialBullets : 0;
        this.bulletDamage = (data && data.initialDamage) ? data.initialDamage : 1;
        console.log('Game started with bullets:', this.bulletsRemaining, 'and damage per bullet:', this.bulletDamage);
        
        // If damage is 0 or very small, default to 1 to ensure enemies can be killed
        if (this.bulletDamage <= 0) {
            console.warn('Invalid damage value from contract, defaulting to 1');
            this.bulletDamage = 1;
        }

        // initialize player health
        this.playerHealth = GameOptions.playerMaxHealth;
        this.isInvulnerable = false;

        // initialize timer and wave
        this.gameStartTime = this.time.now;
        this.currentWave = 1;
        
        // initialize enemy health map
        this.enemyHealthMap.clear();

        // set world bounds to map size (this defines the playable area)
        this.physics.world.setBounds(0, 0, GameOptions.mapSize.width, GameOptions.mapSize.height);

        // set camera bounds to match world bounds
        this.cameras.main.setBounds(0, 0, GameOptions.mapSize.width, GameOptions.mapSize.height);

        // add player at center of map (not viewport)
        this.player = this.physics.add.sprite(GameOptions.mapSize.width / 2, GameOptions.mapSize.height / 2, 'player');
        this.player.setCollideWorldBounds(true); // prevent player from going outside map
        // set player size to be smaller
        this.player.setDisplaySize(90, 90);

        // make camera follow player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // smooth camera follow

        // create cool background
        this.createBackground();
        
        // create boundary border
        this.createBoundaryBorder();

        this.enemyGroup = this.physics.add.group();
        this.bulletGroup = this.physics.add.group();

        // create health bar
        this.createHealthBar();

        // create timer display
        this.createTimerDisplay();

        // create bullets display
        this.createBulletsDisplay();

        // show initial wave announcement
        this.showWaveAnnouncement(1);

        // set keyboard controls
        const keyboard : Phaser.Input.Keyboard.KeyboardPlugin = this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin; 
        this.controlKeys = keyboard.addKeys({
            'up'    : Phaser.Input.Keyboard.KeyCodes.W,
            'left'  : Phaser.Input.Keyboard.KeyCodes.A,
            'down'  : Phaser.Input.Keyboard.KeyCodes.S,
            'right' : Phaser.Input.Keyboard.KeyCodes.D
        });
        
        // timer event to add enemies
        this.enemyTimerEvent = this.time.addEvent({
            delay       : GameOptions.enemyRate,
            loop        : true,
            callback    : () => {
                if (!this.player || !this.enemyGroup) return;
                
                // spawn enemies at a good distance from player (not too close, not too far)
                const minDistance : number = 300;  // minimum distance from player
                const maxDistance : number = 500;  // maximum distance from player
                const angle : number = Math.random() * Math.PI * 2; // random angle around player
                const distance : number = minDistance + Math.random() * (maxDistance - minDistance); // random distance in range
                
                // calculate spawn position relative to player
                const spawnX : number = this.player.x + Math.cos(angle) * distance;
                const spawnY : number = this.player.y + Math.sin(angle) * distance;
                
                // clamp to map bounds
                const margin : number = 50; // keep enemies away from map edges
                const clampedX : number = Phaser.Math.Clamp(spawnX, margin, GameOptions.mapSize.width - margin);
                const clampedY : number = Phaser.Math.Clamp(spawnY, margin, GameOptions.mapSize.height - margin);
                
                // randomly select an enemy sprite from available options
                const randomEnemyKey : string = this.enemySprites[Math.floor(Math.random() * this.enemySprites.length)];
                const enemy : Phaser.Types.Physics.Arcade.SpriteWithDynamicBody = this.physics.add.sprite(clampedX, clampedY, randomEnemyKey);
                // set consistent size for all enemy tokens (increased from 60x60 to 80x80)
                enemy.setDisplaySize(80, 80);
                
                // assign random health (0-50)
                const enemyHealth : number = Math.floor(Math.random() * 51); // 0 to 50 inclusive
                this.enemyHealthMap.set(enemy, enemyHealth);
                
                this.enemyGroup.add(enemy); 
            },
        });

        // timer event to fire bullets
        this.bulletTimerEvent = this.time.addEvent({
            delay       : GameOptions.bulletRate,
            loop        : true,
            callback    : () => {
                if (!this.player || !this.enemyGroup || !this.bulletGroup) return;
                
                // Check if we have bullets remaining
                if (this.bulletsRemaining <= 0) {
                    // No bullets left, end game
                    this.endGame();
                    return;
                }
                
                const closestEnemy : any = this.physics.closest(this.player, this.enemyGroup.getMatching('visible', true));
                if (closestEnemy != null) {
                    const bullet : Phaser.Types.Physics.Arcade.SpriteWithDynamicBody = this.physics.add.sprite(this.player.x, this.player.y, 'bullet');
                    
                    // set bullet display size (increased from 20x20)
                    bullet.setDisplaySize(40, 40);
                    
                    // calculate angle from player to enemy and rotate bullet to face that direction
                    const angle : number = Phaser.Math.Angle.Between(this.player.x, this.player.y, closestEnemy.x, closestEnemy.y);
                    bullet.setRotation(angle);
                    
                    // set collision body size (proportionally increased)
                    bullet.body.setSize(35, 35);
                    
                    // Store reference to target enemy on bullet for damage calculation
                    (bullet as any).targetEnemy = closestEnemy;
                    (bullet as any).hasHitEnemy = false; // Track if bullet has hit an enemy
                    
                    // Add bullet to active bullets set (to track misses)
                    this.activeBullets.add(bullet);
                    
                    this.bulletGroup.add(bullet); 
                    this.physics.moveToObject(bullet, closestEnemy, GameOptions.bulletSpeed);
                    
                    // Set up timeout to detect if bullet misses (goes off-screen or times out)
                    // Bullet will be removed after 5 seconds if it hasn't hit anything
                    this.time.delayedCall(5000, () => {
                        // Check if bullet is still active and hasn't hit anything
                        if (this.activeBullets.has(bullet) && !(bullet as any).hasHitEnemy) {
                            // Bullet missed - count it and remove
                            this.handleBulletMiss(bullet);
                        }
                    });
                }
            },
        });

        // bullet Vs enemy collision
        if (this.bulletGroup && this.enemyGroup) {
            this.physics.add.collider(this.bulletGroup, this.enemyGroup, (bullet : any, enemy : any) => {
                // Mark bullet as having hit an enemy (so it won't be counted as a miss)
                bullet.hasHitEnemy = true;
                
                // Remove bullet from active bullets set (hit bullets don't count)
                this.activeBullets.delete(bullet);
                
                // Remove bullet
                this.bulletGroup!.killAndHide(bullet);
                bullet.body.checkCollision.none = true;
                
                // Deal damage to enemy using the damage value from the contract
                const currentHealth = this.enemyHealthMap.get(enemy) ?? 0;
                // Use bulletDamage from contract, but ensure it's at least 1
                const damageToDeal = Math.max(1, Math.floor(this.bulletDamage));
                const newHealth = Math.max(0, currentHealth - damageToDeal);
                
                console.log(`Enemy hit! Health: ${currentHealth} -> ${newHealth} (damage: ${damageToDeal}) - Bullet NOT counted`);
                
                if (newHealth <= 0) {
                    // Enemy is dead, remove it
                    this.enemyHealthMap.delete(enemy);
                    this.enemyGroup!.killAndHide(enemy);
                    enemy.body.checkCollision.none = true;
                } else {
                    // Enemy still alive, update health
                    this.enemyHealthMap.set(enemy, newHealth);
                }
            });
        }

        // player Vs enemy collision (using overlap so player can pass through enemies)
        if (this.player && this.enemyGroup) {
            this.physics.add.overlap(this.player, this.enemyGroup, () => {
                this.takeDamage();
            });
        }  
    }

    // Cleanup method called when scene is shutdown
    shutdown() : void {
        // Stop all timers
        if (this.enemyTimerEvent) {
            this.enemyTimerEvent.remove();
            this.enemyTimerEvent = null;
        }
        if (this.bulletTimerEvent) {
            this.bulletTimerEvent.remove();
            this.bulletTimerEvent = null;
        }

        // Stop all tweens
        this.tweens.killAll();

        // Clear all timers
        this.time.removeAllEvents();

        // Clear groups
        if (this.enemyGroup) {
            this.enemyGroup.clear(true, true);
        }
        if (this.bulletGroup) {
            this.bulletGroup.clear(true, true);
        }
    }

    // method to create cool background design
    createBackground() : void {
        // Create gradient background using graphics
        this.backgroundGraphics = this.add.graphics();
        
        // Draw a radial gradient effect (dark center to slightly lighter edges)
        const centerX = GameOptions.mapSize.width / 2;
        const centerY = GameOptions.mapSize.height / 2;
        const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
        
        // Draw multiple circles with decreasing opacity for gradient effect
        for (let i = 0; i < 20; i++) {
            const radius = (maxRadius / 20) * (i + 1);
            const alpha = 0.1 - (i * 0.004); // Fade out
            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(0x0a0a1a), // Dark blue-purple
                Phaser.Display.Color.ValueToColor(0x1a1a2e), // Slightly lighter
                i,
                20
            );
            
            this.backgroundGraphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), alpha);
            this.backgroundGraphics.fillCircle(centerX, centerY, radius);
        }
        
        this.backgroundGraphics.setDepth(0); // Behind everything
        
        // Create animated stars particle system
        // Create a simple star texture
        const starTexture = this.add.graphics();
        starTexture.fillStyle(0xffffff, 1);
        starTexture.fillCircle(0, 0, 1);
        starTexture.generateTexture('star', 2, 2);
        starTexture.destroy();
        
        // Create particle emitter for stars
        const stars = this.add.particles(0, 0, 'star', {
            x: { min: 0, max: GameOptions.mapSize.width },
            y: { min: 0, max: GameOptions.mapSize.height },
            speed: { min: 5, max: 15 },
            scale: { start: 0.3, end: 0.1 },
            alpha: { start: 0.8, end: 0.2 },
            lifespan: 3000,
            frequency: 100,
            tint: [0xffffff, 0xaaaaff, 0x8888ff], // White to light blue stars
        });
        
        stars.setDepth(1); // Above background but below game objects
        this.backgroundStars = stars;
        
        // Create subtle grid pattern
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1, 0x2a2a4a, 0.3); // Subtle grid lines
        
        const gridSize = 100;
        // Vertical lines
        for (let x = 0; x <= GameOptions.mapSize.width; x += gridSize) {
            gridGraphics.moveTo(x, 0);
            gridGraphics.lineTo(x, GameOptions.mapSize.height);
        }
        // Horizontal lines
        for (let y = 0; y <= GameOptions.mapSize.height; y += gridSize) {
            gridGraphics.moveTo(0, y);
            gridGraphics.lineTo(GameOptions.mapSize.width, y);
        }
        
        gridGraphics.strokePath();
        gridGraphics.setDepth(2); // Above stars but below game objects
        
        // Add some animated glowing orbs in the background
        const orbCount = 8;
        for (let i = 0; i < orbCount; i++) {
            const orbX = Math.random() * GameOptions.mapSize.width;
            const orbY = Math.random() * GameOptions.mapSize.height;
            const orbSize = 30 + Math.random() * 40;
            const orbColor = Phaser.Display.Color.HSLToColor(
                Math.random() * 0.2 + 0.6, // Hue between 0.6-0.8 (blue-purple range)
                0.7, // Saturation
                0.3 + Math.random() * 0.2 // Lightness
            );
            
            const orb = this.add.circle(orbX, orbY, orbSize, orbColor.color, 0.15);
            orb.setDepth(1);
            
            // Animate orbs with pulsing effect
            this.tweens.add({
                targets: orb,
                alpha: { from: 0.1, to: 0.25 },
                scale: { from: 0.8, to: 1.2 },
                duration: 2000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    // method to create boundary border
    createBoundaryBorder() : void {
        const boundaryGraphics : Phaser.GameObjects.Graphics = this.add.graphics();
        boundaryGraphics.lineStyle(GameOptions.boundaryWidth, GameOptions.boundaryColor, 1);
        // draw rectangle border around the map
        boundaryGraphics.strokeRect(0, 0, GameOptions.mapSize.width, GameOptions.mapSize.height);
        boundaryGraphics.setDepth(500); // put it above background but below game objects
    }

    // method to create health bar UI
    createHealthBar() : void {
        if (!this.player) return;
        
        // health bar background (red/dark)
        this.healthBarBg = this.add.rectangle(
            this.player.x,
            this.player.y + GameOptions.healthBarOffsetY,
            GameOptions.healthBarWidth,
            GameOptions.healthBarHeight,
            0x000000
        );
        this.healthBarBg.setDepth(1000); // make sure it's visible

        // health bar foreground (green/red based on health)
        this.healthBarFg = this.add.rectangle(
            this.player.x - (GameOptions.healthBarWidth / 2) + (GameOptions.healthBarWidth / 2),
            this.player.y + GameOptions.healthBarOffsetY,
            GameOptions.healthBarWidth,
            GameOptions.healthBarHeight,
            0x00ff00
        );
        this.healthBarFg.setOrigin(0, 0.5); // set origin to left center for easy scaling
        this.healthBarFg.setDepth(1001); // above background
    }

    // method to update health bar position and visual
    updateHealthBar() : void {
        if (!this.healthBarBg || !this.healthBarFg || !this.player) return;
        
        // update position to follow player
        this.healthBarBg.setPosition(this.player.x, this.player.y + GameOptions.healthBarOffsetY);
        this.healthBarFg.setPosition(
            this.player.x - (GameOptions.healthBarWidth / 2),
            this.player.y + GameOptions.healthBarOffsetY
        );

        // update health bar width based on current health
        const healthPercentage : number = this.playerHealth / GameOptions.playerMaxHealth;
        this.healthBarFg.setSize(GameOptions.healthBarWidth * healthPercentage, GameOptions.healthBarHeight);

        // change color based on health (green -> yellow -> red)
        if (healthPercentage > 0.6) {
            this.healthBarFg.setFillStyle(0x00ff00); // green
        } else if (healthPercentage > 0.3) {
            this.healthBarFg.setFillStyle(0xffff00); // yellow
        } else {
            this.healthBarFg.setFillStyle(0xff0000); // red
        }
    }

    // method to handle player taking damage
    takeDamage() : void {
        // prevent multiple hits from same collision
        if (this.isInvulnerable) {
            return;
        }

        // decrease health
        this.playerHealth--;
        this.updateHealthBar();

        // make player invulnerable for a short time to prevent multiple hits
        this.isInvulnerable = true;
        this.time.delayedCall(1000, () => { // 1 second invulnerability
            this.isInvulnerable = false;
        });

        // end game if health reaches 0
        if (this.playerHealth <= 0) {
            this.endGame();
        }
    }

    // method to properly end the game
    endGame() : void {
        // Stop all timers
        if (this.enemyTimerEvent) {
            this.enemyTimerEvent.remove();
            this.enemyTimerEvent = null;
        }
        if (this.bulletTimerEvent) {
            this.bulletTimerEvent.remove();
            this.bulletTimerEvent = null;
        }

        // Stop all tweens
        this.tweens.killAll();

        // Stop the scene
        this.scene.pause();
        
        // Clear all physics bodies
        if (this.player) {
            this.physics.world.disable(this.player);
        }
        if (this.enemyGroup) {
            this.enemyGroup.clear(true, true);
        }
        
        // Dispatch custom event to notify React component
        window.dispatchEvent(new CustomEvent('gameOver'));
    }

    // metod to be called at each frame
    update() {   
        
        // set movement direction according to keys pressed
        let movementDirection : Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);  
        if (this.controlKeys.right.isDown) {
            movementDirection.x ++;  
        }
        if (this.controlKeys.left.isDown) {
            movementDirection.x --;
        }
        if (this.controlKeys.up.isDown) {
            movementDirection.y --;    
        }
        if (this.controlKeys.down.isDown) {
            movementDirection.y ++;    
        }
        
        if (!this.player) return;
        
        // flip player sprite based on horizontal movement direction
        if (movementDirection.x < 0) {
            // moving left - flip sprite
            this.player.setFlipX(true);
        } else if (movementDirection.x > 0) {
            // moving right - unflip sprite
            this.player.setFlipX(false);
        }
        
        // set player velocity according to movement direction
        this.player.setVelocity(0, 0);
        if (movementDirection.x == 0 || movementDirection.y == 0) {
            this.player.setVelocity(movementDirection.x * GameOptions.playerSpeed, movementDirection.y * GameOptions.playerSpeed);
        }
        else {
            this.player.setVelocity(movementDirection.x * GameOptions.playerSpeed / Math.sqrt(2), movementDirection.y * GameOptions.playerSpeed / Math.sqrt(2));    
        } 

        // move enemies towards player
        if (this.enemyGroup && this.player) {
            this.enemyGroup.getMatching('visible', true).forEach((enemy : any) => {
                this.physics.moveToObject(enemy, this.player!, GameOptions.enemySpeed);
            });
        }

        // update health bar position to follow player
        this.updateHealthBar();

        // update timer
        this.updateTimer();

        // check for wave changes
        this.checkWaveChange();
        
        // Check for bullets that go off-screen (misses)
        if (this.bulletGroup && this.activeBullets.size > 0) {
            this.bulletGroup.getMatching('visible', true).forEach((bullet : any) => {
                // Check if bullet is outside map bounds (missed)
                if (this.activeBullets.has(bullet) && !bullet.hasHitEnemy) {
                    const bulletX = bullet.x;
                    const bulletY = bullet.y;
                    const margin = 100; // margin outside map bounds
                    
                    if (bulletX < -margin || bulletX > GameOptions.mapSize.width + margin ||
                        bulletY < -margin || bulletY > GameOptions.mapSize.height + margin) {
                        // Bullet went off-screen - it's a miss
                        this.handleBulletMiss(bullet);
                    }
                }
            });
        }
        
        // Check if bullets reached 0 during gameplay
        if (this.bulletsRemaining <= 0 && !this.scene.isPaused()) {
            this.endGame();
        }
    }

    // method to handle bullet miss (bullet didn't hit anything)
    handleBulletMiss(bullet : Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) : void {
        // Only count if bullet hasn't hit an enemy
        if ((bullet as any).hasHitEnemy) {
            return;
        }
        
        // Remove from active bullets
        this.activeBullets.delete(bullet);
        
        // Decrease bullets by 1 (missed shot counts)
        this.bulletsRemaining--;
        this.updateBulletsDisplay();
        
        console.log(`Bullet missed! Remaining bullets: ${this.bulletsRemaining}`);
        
        // Remove the bullet
        if (this.bulletGroup) {
            this.bulletGroup.killAndHide(bullet);
            bullet.body.checkCollision.none = true;
        }
        
        // Check if bullets reached 0
        if (this.bulletsRemaining <= 0) {
            // End game when bullets reach 0
            this.time.delayedCall(100, () => {
                this.endGame();
            });
        }
    }

    // method to create timer display
    createTimerDisplay() : void {
        this.timerText = this.add.text(
            GameOptions.gameSize.width / 2, 
            60, // positioned a little down from top
            '00:00', 
            {
                fontSize: '40px',
                color: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        this.timerText.setOrigin(0.5, 0.5); // center the text
        this.timerText.setDepth(2000); // make sure it's on top
        this.timerText.setScrollFactor(0); // fixed to camera
    }

    // method to create bullets display
    createBulletsDisplay() : void {
        this.bulletsText = this.add.text(
            GameOptions.gameSize.width - 20, 
            60, // positioned at top right
            `Bullets: ${this.bulletsRemaining}`, 
            {
                fontSize: '32px',
                color: '#ffff00', // yellow color for bullets
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        this.bulletsText.setOrigin(1, 0.5); // right-aligned
        this.bulletsText.setDepth(2000); // make sure it's on top
        this.bulletsText.setScrollFactor(0); // fixed to camera
    }

    // method to update bullets display
    updateBulletsDisplay() : void {
        if (this.bulletsText) {
            this.bulletsText.setText(`Bullets: ${this.bulletsRemaining}`);
            
            // Change color based on remaining bullets
            if (this.bulletsRemaining <= 5) {
                this.bulletsText.setColor('#ff0000'); // red when low
            } else if (this.bulletsRemaining <= 20) {
                this.bulletsText.setColor('#ffaa00'); // orange when medium
            } else {
                this.bulletsText.setColor('#ffff00'); // yellow when plenty
            }
        }
    }

    // method to update timer display
    updateTimer() : void {
        if (this.timerText) {
            const elapsedTime : number = this.time.now - this.gameStartTime;
            const totalSeconds : number = Math.floor(elapsedTime / 1000);
            const minutes : number = Math.floor(totalSeconds / 60);
            const seconds : number = totalSeconds % 60;
            
            // format as MM:SS
            const minutesStr : string = minutes.toString().padStart(2, '0');
            const secondsStr : string = seconds.toString().padStart(2, '0');
            this.timerText.setText(`${minutesStr}:${secondsStr}`);
        }
    }

    // method to check for wave changes
    checkWaveChange() : void {
        const elapsedTime : number = this.time.now - this.gameStartTime;
        const elapsedMinutes : number = Math.floor(elapsedTime / (1000 * 60 * GameOptions.waveMinutesPerWave));
        const newWave : number = elapsedMinutes + 1; // Wave 1 starts at 0 minutes

        if (newWave > this.currentWave) {
            this.currentWave = newWave;
            this.showWaveAnnouncement(newWave);
            // Trigger wave special effect
            this.triggerWaveEffect(newWave);
        }
    }

    // method to trigger cool wave effects
    triggerWaveEffect(waveNumber : number) : void {
        if (!this.player || !this.enemyGroup) return;
        
        console.log(`Wave ${waveNumber} effect triggered!`);
        
        // Spawn many enemies at once in a circle around the player
        const enemyCount : number = 15 + (waveNumber * 5); // More enemies each wave
        const spawnRadius : number = 400; // Distance from player
        
        for (let i = 0; i < enemyCount; i++) {
            // Calculate angle for circular spawn
            const angle : number = (i / enemyCount) * Math.PI * 2;
            const spawnX : number = this.player.x + Math.cos(angle) * spawnRadius;
            const spawnY : number = this.player.y + Math.sin(angle) * spawnRadius;
            
            // Clamp to map bounds
            const margin : number = 50;
            const clampedX : number = Phaser.Math.Clamp(spawnX, margin, GameOptions.mapSize.width - margin);
            const clampedY : number = Phaser.Math.Clamp(spawnY, margin, GameOptions.mapSize.height - margin);
            
            // Randomly select an enemy sprite
            const randomEnemyKey : string = this.enemySprites[Math.floor(Math.random() * this.enemySprites.length)];
            const enemy : Phaser.Types.Physics.Arcade.SpriteWithDynamicBody = this.physics.add.sprite(clampedX, clampedY, randomEnemyKey);
            enemy.setDisplaySize(80, 80);
            
            // Assign random health (0-50)
            const enemyHealth : number = Math.floor(Math.random() * 51);
            this.enemyHealthMap.set(enemy, enemyHealth);
            
            this.enemyGroup.add(enemy);
            
            // Add a slight delay between spawns for visual effect
            this.time.delayedCall(i * 50, () => {
                // Enemy is already added, just make it visible
            });
        }
        
        // Visual effect: screen shake
        this.cameras.main.shake(500, 0.01);
        
        // Visual effect: flash
        this.cameras.main.flash(300, 255, 255, 0); // Yellow flash
    }

    // method to show wave announcement
    showWaveAnnouncement(waveNumber : number) : void {
        // remove previous wave text if it exists
        if (this.waveText) {
            this.waveText.destroy();
        }

        // create wave announcement text
        this.waveText = this.add.text(
            GameOptions.gameSize.width / 2,
            GameOptions.gameSize.height / 2,
            `WAVE ${waveNumber}`,
            {
                fontSize: '72px',
                color: '#ffd700', // gold color
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 6,
                shadow: {
                    offsetX: 4,
                    offsetY: 4,
                    color: '#000000',
                    blur: 8,
                    stroke: true,
                    fill: true
                }
            }
        );
        this.waveText.setOrigin(0.5, 0.5); // center the text
        this.waveText.setDepth(3000); // make sure it's on top
        this.waveText.setScrollFactor(0); // fixed to camera

        // fade out animation
        this.tweens.add({
            targets: this.waveText,
            alpha: 0,
            duration: GameOptions.waveAnnounceDuration,
            ease: 'Power2',
            onComplete: () => {
                if (this.waveText) {
                    this.waveText.destroy();
                    this.waveText = null;
                }
            }
        });
    }
}

