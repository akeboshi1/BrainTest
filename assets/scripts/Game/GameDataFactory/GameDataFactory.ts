import { BaseGameData } from "./BaseGameData";
import { GameCenterSpecData } from "./GameCenterSpecData";
import { SkewersSpecGameData } from "./SkewersSpecGameData";
export class GameDataFactory {
    private static readonly gameMap: Map<string, new () => BaseGameData<any>> = new Map<string, new () => BaseGameData<any>>([
        ["SKEWERS", SkewersSpecGameData],
        ["GAME_CENTER", GameCenterSpecData]
    ]);

    static create<T extends BaseGameData<any>>(gameType: string): T {
        const GameClass = this.gameMap.get(gameType);
        if (!GameClass) {
            throw new Error(`Unsupported game type: ${gameType}`);
        }
        let gameData = new GameClass() as T;
        gameData.gameType = gameType;
        return gameData;
    }

    // 新增注册新游戏类型的方法
    static registerGameType(gameType: string, gameClass: new () => BaseGameData<any>): void {
        this.gameMap.set(gameType, gameClass);
    }
}