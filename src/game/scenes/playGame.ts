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
    currentWave   : number = 1;                                         // current wave number
    enemyTimerEvent : Phaser.Time.TimerEvent | null = null;             // timer event for enemies
    bulletTimerEvent : Phaser.Time.TimerEvent | null = null;            // timer event for bullets

    // method to be called once the instance has been created
    create(data? : any) : void {

        // get enemy sprites array from scene data
        if (data && data.enemySprites) {
            this.enemySprites = data.enemySprites;
        }

        // initialize player health
        this.playerHealth = GameOptions.playerMaxHealth;
        this.isInvulnerable = false;

        // initialize timer and wave
        this.gameStartTime = this.time.now;
        this.currentWave = 1;

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

        // create boundary border
        this.createBoundaryBorder();

        this.enemyGroup = this.physics.add.group();
        this.bulletGroup = this.physics.add.group();

        // create health bar
        this.createHealthBar();

        // create timer display
        this.createTimerDisplay();

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
                this.enemyGroup.add(enemy); 
            },
        });

        // timer event to fire bullets
        this.bulletTimerEvent = this.time.addEvent({
            delay       : GameOptions.bulletRate,
            loop        : true,
            callback    : () => {
                if (!this.player || !this.enemyGroup || !this.bulletGroup) return;
                
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
                    
                    this.bulletGroup.add(bullet); 
                    this.physics.moveToObject(bullet, closestEnemy, GameOptions.bulletSpeed);
                }
            },
        });

        // bullet Vs enemy collision
        if (this.bulletGroup && this.enemyGroup) {
            this.physics.add.collider(this.bulletGroup, this.enemyGroup, (bullet : any, enemy : any) => {
                this.bulletGroup!.killAndHide(bullet);
                bullet.body.checkCollision.none = true;
                this.enemyGroup!.killAndHide(enemy);
                enemy.body.checkCollision.none = true;
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
        }
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

