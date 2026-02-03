/**
 * StateModel.js
 */

export class GameState {
    constructor() {
        this.speed = 0;
        this.health = 100;
        this.score = 0;
    }

    getStatus() {
        return `Speed: ${this.speed}, Health: ${this.health}`;
    }
}

export const globalState = new GameState();
