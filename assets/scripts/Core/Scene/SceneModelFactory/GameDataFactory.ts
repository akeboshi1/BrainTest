import { BaseGameModel } from "db://assets/scripts/Core/Scene/SceneModel/BaseGameModel";
import { GameCenterSpecModel } from "db://assets/scripts/Core/Scene/SceneModel/GameCenterSpecModel";
import { SkewersSpecGameModel } from "db://assets/scripts/Core/Scene/SceneModel/SkewersSpecGameModel";
export class GameDataFactory {
    private static readonly gameMap: Map<string, new () => BaseGameModel<any>> = new Map<string, new () => BaseGameModel<any>>([
        ["SKEWERS", SkewersSpecGameModel],
        ["GAME_CENTER", GameCenterSpecModel]
    ]);

    static create<T extends BaseGameModel<any>>(gameType: string): T {
        const GameClass = this.gameMap.get(gameType);
        if (!GameClass) {
            throw new Error(`Unsupported game type: ${gameType}`);
        }
        let gameData = new GameClass() as T;
        gameData.gameType = gameType;
        return gameData;
    }

    // 新增注册新游戏类型的方法
    static registerGameType(gameType: string, gameClass: new () => BaseGameModel<any>): void {
        this.gameMap.set(gameType, gameClass);
    }
}