import { SkewersGameTrainData } from "../Task/Skewers/SkewersGameData";

// 基础游戏数据类型
interface IBaseGameData<T extends IBaseGameChild> {

    refreshData(raw: any): void;
    runNext(): void;
    startGame(): void;
    quitGame(): void;
}


abstract class BaseGameData<T extends IBaseGameChild> implements IBaseGameData<T> {
    public sessionId?: string = "";
    public gameType?: string = "BASE";
    public progress?: number = 0;
    public children?: SkewersGameTrainData[] = [];
    public currentChild?: SkewersGameTrainData | null = null;

    // 必须实现得方法
    abstract refreshData(raw: any): void;
    abstract runNext(): void;

    abstract startGame(): void;
    abstract quitGame(): void;
}


// 基础子任务类型
interface IBaseGameChild {
    gameId: number;
    gameName: string;
    level: number;
    difficulty: number;
}

// 串烧游戏特性
interface ISkewersSpecific {
    children: SkewersGameTrainData[];
    currentChild: SkewersGameTrainData | null;

    gameType: string;
    progress: number;
    hasGuide: boolean;

    showGameAlert();
    exitCallBack();
    requestCompleteBrainsTrainings();
    completeCurrent(score: number): void;
}

// 游戏大厅特性
interface IGameCenterSpecific {
    sessionid: string;

    endGame();

    gameMatch();
    gamePassLevel();
}



