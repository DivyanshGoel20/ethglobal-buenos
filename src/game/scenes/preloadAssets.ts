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
    enemySprites : string[] = ['aave', 'bnb', 'btc', 'doge', 'eth', 'sol', 'usdc', 'usdt', 'world', 'xrp'];
  
    // method to be called during class preloading
    preload() : void {
 
        // load all enemy sprites
        this.enemySprites.forEach((enemyName : string) => {
            this.load.image(enemyName, `assets/sprites/enemies/${enemyName}.png`);
        });

        // load player sprite
        this.load.image('player', 'assets/sprites/player.png');

        this.load.image('bullet', 'assets/sprites/bullet.png');
    }
  
    // method to be executed when the scene is created
    create() : void {

        // pass enemy sprites array to PlayGame scene
        this.scene.start('PlayGame', { enemySprites: this.enemySprites });
    }
}

