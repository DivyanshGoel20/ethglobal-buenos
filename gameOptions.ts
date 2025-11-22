// CONFIGURABLE GAME OPTIONS
// changing these values will affect gameplay

export const GameOptions : any = {

    gameSize : {
        width               : 800,      // viewport width, in pixels
        height              : 800       // viewport height, in pixels
    },
    mapSize : {
        width               : 4000,     // map width, in pixels (much larger than viewport)
        height              : 4000      // map height, in pixels (much larger than viewport)
    },
    gameBackgroundColor     : 0x1a1a2e, // game background color (darker blue)
    boundaryColor           : 0xff0000, // boundary line color (red)
    boundaryWidth           : 4,        // boundary line width, in pixels

    playerSpeed             : 100,      // player speed, in pixels per second
    enemySpeed              : 50,       // enemy speed, in pixels per second
    bulletSpeed             : 200,      // bullet speed, in pixels per second
    bulletRate              : 1000,     // bullet rate, in milliseconds per bullet
    enemyRate               : 800,      // enemy rate, in milliseconds per enemy
    playerMaxHealth         : 5,        // maximum player health
    healthBarWidth          : 50,       // health bar width, in pixels
    healthBarHeight         : 6,        // health bar height, in pixels
    healthBarOffsetY        : 35        // health bar offset below player, in pixels
    
}