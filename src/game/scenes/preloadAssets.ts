// CLASS TO PRELOAD ASSETS

// PreloadAssets class extends Phaser.Scene class
export class PreloadAssets extends Phaser.Scene {
  
    // constructor    
    constructor() {
        super({
            key : 'PreloadAssets'
        });
    }

    // array to store enemy sprite keys
    enemySprites : string[] = ['eyebot-monster', 'eyelander-monster', 'fire-monster', 'fish-monster', 'red-monster', 'minion-monster', 'grim-monster', 'mage-monster'];
  
    // method to be called during class preloading
    preload() : void {
 
        // load all enemy sprites
        this.enemySprites.forEach((enemyName : string) => {
            this.load.image(enemyName, `src/assets/enemies/${enemyName}.png`);
        });

        // load player sprite
        this.load.image('player', 'src/assets/player.png');

        this.load.image('bullet', 'src/assets/bullet.png');
    }
  
    // method to be executed when the scene is created
    create() : void {
        // Get bullets and damage from registry (set by Game component or gameEntry)
        const bullets = this.registry.get('initialBullets') || 0;
        const damage = this.registry.get('initialDamage') || 0;

        console.log('PreloadAssets passing to PlayGame - bullets:', bullets, 'damage:', damage);

        // pass enemy sprites array, bullets, and damage to PlayGame scene
        this.scene.start('PlayGame', { 
            enemySprites: this.enemySprites,
            initialBullets: bullets,
            initialDamage: damage
        });
    }
}

