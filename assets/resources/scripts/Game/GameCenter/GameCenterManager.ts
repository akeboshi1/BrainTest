import { EventManager } from "../../Core/Manager/Event/EventManager";
import { SocketManager } from "../../Core/Manager/Net/SocketManager";
import { SocketData } from "../../Core/Manager/Net/SocketData";
import { Global } from "../../Core/Manager/Config/Global";
import { DebugLog } from "../../Core/Util/DebugLog";
import { SceneManager } from "../../Core/Manager/Scene/SceneManager";
import { Node } from "cc";
import { GuideManager } from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import { BundlePreloadEvent, BundlePreloadManager } from "../../Core/Manager/Load/BundlePreloadManager";
import { BundleName } from "../../Core/Manager/Load/BundleName";
import { GameDataFactory } from "db://assets/resources/scripts/Core/Scene/SceneModelFactory/GameDataFactory";
import { GameType } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { GameCenterSpecModel } from "db://assets/resources/scripts/Core/Scene/SceneModel/GameCenterSpecModel";
import { SettlementPanel } from "db://assets/resources/scripts/Core/UI/SettlementPanel";
import { UIManager } from "../../Core/Manager/UI/UIManager";
import { AlertManager } from "../../Core/Manager/Alert/AlertManager";

/**
 * 游戏大厅通信数据
 */
export class GameSocketData {
    public callback: Function = null;
    public socketData: SocketData = null;
    constructor(socketData: SocketData, callback: Function = null) {
        this.socketData = socketData;
        this.callback = callback;
    }
}

/**
 * 游戏大厅数据
 */
export class GameCenterData {
    public gameid: number;
    public sessionid: string;
    private result;
    public levelMode: number = 1;
    // 当前gameData的游戏难度，关卡
    private _level: number = 0;
    private _difficulty: number = 1;
    private _levels: number[];
    // 当前在levels数组中的索引位置
    private _levelIndex: number = 0;

    private _difficultDic: Map<number, number> = new Map();
    constructor(data) {
        this.gameid = data.game_id;
        this.sessionid = data.session_id;
        this.levelMode = data.level_mode;
        this.result = data.data;
        let count = this.result.length;
        for (let i: number = 0; i < count; i++) {
            let obj = this.result[i];
            this._levels = obj['levels'];
            let level = Number(obj['level']) == 0 ? 1 : Number(obj['level']);
            let difficult = Number(obj['difficulty']);
           
            if(this.levelMode == 2){
                this._difficultDic.set(difficult, level);
                // 对于levelMode=2，也需要设置初始难度
                if (i == 0) {
                    this._difficulty = difficult;
                }
            }else{
                if (i == 0) {
                    this._level = level;
                    this._difficulty = difficult;
                    // 根据当前level找到在levels数组中的索引
                    if (this._levels && this._levels.length > 0) {
                        this._levelIndex = this._levels.indexOf(level);
                        if (this._levelIndex === -1) {
                            this._levelIndex = 0; // 如果找不到，默认从0开始
                            this._level = this._levels[0];
                        }
                    }
                }
            }
        }
    }

    public get levels(): number[] {
        return this._levels;
    }

    public get levelIndex(): number {
        return this._levelIndex;
    }

    /**
     * 检查并获取下一关
     * 每通关一次levels中的索引就+1，然后从levels中获取对应的level值
     * 超过levels最大值，则重置到第0位
     */
    public get nextLevel(): number {
        if (!this._levels || this._levels.length === 0) {
            // 如果_levels为空，则正常返回level++
            this._level++;
            return this._level;
        }
        
        // 索引+1
        this._levelIndex++;
        
        // 如果超过levels最大值，则重置到第0位
        if (this._levelIndex >= this._levels.length) {
            this._levelIndex = 0;
        }
        
        // 从levels中获取对应的level值
        this._level = this._levels[this._levelIndex];
        
        return this._level;
    }

    /**
     * 获取指定难度的下一关（用于levelMode=2）
     * @param difficulty 难度等级
     * @returns 下一关的关卡号
     */
    public getNextLevelByDifficulty(difficulty: number): number {
        // 获取当前难度的关卡
        let currentLevel = this.getLevelByDifficult(difficulty);
        
        if (!this._levels || this._levels.length === 0) {
            // 如果_levels为空，则正常返回当前关卡+1
            return currentLevel + 1;
        }
        
        // 在levels数组中查找当前关卡的位置
        let index = this._levels.indexOf(currentLevel);
        if (index === -1) {
            // 如果找不到，返回第一个关卡
            return this._levels[0];
        }
        
        // 获取下一个关卡
        let nextIndex = index + 1;
        if (nextIndex >= this._levels.length) {
            // 如果超过范围，重置到第一个
            nextIndex = 0;
        }
        
        return this._levels[nextIndex];
    }


    /**
     * 游戏大厅选择的难度系数
     */
    public get difficulty(): number {
        return this._difficulty;
    }

    public set difficulty(value: number) {
        this._difficulty = value;
    }

    public get level() {
        let currentLevel: number;
        if (this.levelMode == 1) {
            currentLevel = this._level;
        } else {
            currentLevel = this.getLevelByDifficult(this.difficulty);
        }
        
        // 当level为0或undefined时，使用levels第1位数字为起始关卡
        if (currentLevel === 0 || currentLevel === undefined || currentLevel === null) {
            if (this._levels && this._levels.length > 0) {
                return this._levels[0];
            }
        }
        
        return currentLevel;
    }

    public set level(value: number) {
        this._level = value;
        if (this.levelMode != 1) {

            this._difficultDic.set(this.difficulty, this._level);
        }
    }

    public setLevelByDifficult(difficult: number, level: number) {
        this._difficultDic.set(Number(difficult), Number(level));
    }

    public getLevelByDifficult(difficulty: number) {
        return this._difficultDic.get(difficulty) || 0;
    }


}

/**
 * 游戏大厅管理器
 */
export class GameCenterManager {
    private static _instance: GameCenterManager;

    public static getInstance() {
        if (!GameCenterManager._instance) {
            GameCenterManager._instance = new GameCenterManager();
        }
        return GameCenterManager._instance;
    }

    public static GAMESTART = "game.start_session";
    public static GAMEEND = "game.end_session";

    public static GAMEMATCHITEM = "game.match_item";
    public static GAMEPASSLEVEL = "game.pass_level";




    private _callbackDic: Map<string, GameSocketData> = new Map();

    private _curGame: GameCenterData;

    private _curGameSpecData: GameCenterSpecModel;

    private static _settlementPanel: SettlementPanel = null;

    constructor() {
        GameDataFactory.registerGameType(GameType.GAME_CENTER, GameCenterSpecModel);
        UIManager.getInstance().registerPanel(SettlementPanel.NAME, BundleName.RESOURCES, "prefab/settlementPanel/settlementPanel", SettlementPanel);
        GameCenterManager._settlementPanel = new SettlementPanel();
    }

    perload(url, sceneName) {
        DebugLog.instance.log(`${sceneName} gamemanager sceneName`);
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, sceneName), this, true);
        BundlePreloadManager.getInstance().preload(sceneName as BundleName);
    }

    private onPreloadFinish(url: string, sceneName: string, data: any) {
        DebugLog.instance.log(`${sceneName} 预加载完成`);
        SceneManager.getInstance().changeScene(sceneName, "", {gametype: GameType.GAME_CENTER}).then((scene) => {
            EventManager.getInstance().emit(SceneManager.SCENE_ENTER);
            (scene as any).sceneModel = GameCenterManager.getInstance().gameSpecData;
            (scene as any).sceneModel.scene = scene as any;
            DebugLog.instance.log(`${sceneName} 场景切换成功`);
        });
    }

    public get gameSpecData(): GameCenterSpecModel {
        return GameDataFactory.create(GameType.GAME_CENTER);
    }

    public enterGameCenter() {
        Global.isSkewersGame = false;
    }

    public exitGameCenter() {
        Global.isSkewersGame = true;
    }

    public get currentGame(): GameCenterData {
        this._curGame.difficulty = this._selectDifficulty;
        return this._curGame;
    }


    private _selectDifficulty: number = 1;
    /**
     * 设置当前游戏难度
     * @param difficulty 难度等级 1-简单 2-中等 3-困难
     */
    public setDifficulty(difficulty: number): void {
        if (difficulty < 1 || difficulty > 3) {
            DebugLog.instance.warn("Invalid difficulty level. Must be between 1 and 3.");
            return;
        }

        if (this._curGame) {
            this._selectDifficulty = difficulty;
            this._curGame.difficulty = difficulty;
            DebugLog.instance.log(`Game difficulty set to: ${difficulty}`);
        } else {
            DebugLog.instance.warn("Cannot set difficulty: no current game");
        }
    }

    public settleMentPanelShow: boolean = false;

    showSuccessView() {
        let self = this;
        this.settleMentPanelShow = true;
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: true,
            nextHandler: () => {
                self.settleMentPanelShow = false;
                Global.isAgain = false;
                EventManager.getInstance().emit("GAME_SUCCESS_NEXT_LEVEL");
            }
        });
    }

    showFailView() {
        let self = this;
        this.settleMentPanelShow = true;
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: false,
            againHandler: () => {
                self.settleMentPanelShow = false;
                Global.isAgain = true;
                EventManager.getInstance().emit("GAME_AGAIN");
            },
            nextHandler: () => {
                self.settleMentPanelShow = false;
                Global.isAgain = false;
                EventManager.getInstance().emit("GAME_FAIL_NEXT_LEVEL");
            }
        });
    }



    /**
     * 开始某个游戏
     * @param gameID
     */
    public startGame(gameID: number, callback: Function = null): void {
        let socketData = new SocketData({ "action": GameCenterManager.GAMESTART, "data": { game_id: gameID } });
        this._callbackDic.set(GameCenterManager.GAMESTART, new GameSocketData(socketData, callback));
        EventManager.getInstance().on(GameCenterManager.GAMESTART, this.startGameCallBack, this);
        SocketManager.getInstance().send(socketData);
    }


    private startGameCallBack(data, context) {
        DebugLog.instance.log("startGameCallBack", data);
        let gsData = this._callbackDic.get(GameCenterManager.GAMESTART);
        let status = data.status;
        if (status == 0) {
            AlertManager.getInstance().showSocketAlert(data.message);
            DebugLog.instance.error(data.message);
            if (gsData && gsData.callback) {
                gsData.socketData.data = data.data;
                gsData.callback(data);
            }
            return;
        }
        EventManager.getInstance().off(GameCenterManager.GAMESTART, context);
        this._curGame = new GameCenterData(data.data);
        if (gsData && gsData.callback) {
            gsData.socketData.data = data.data;
            gsData.callback(data);
        }
    }


    /**
     * 结束游戏
     * @param gameID
     */
    // public endGame(gameID: number, callback: Function = null) {
    //     let socketData = new SocketData({ "action": GameCenterManager.GAMEEND, "data": { game_id: gameID } });
    //     this._callbackDic.set(GameCenterManager.GAMEEND, new GameSocketData(socketData, callback));
    //     EventManager.getInstance().on(GameCenterManager.GAMEEND, this.endGameCallBack, this);
    //     SocketManager.getInstance().send(socketData);
    // }

    // private endGameCallBack(data, context) {
    //     let status = data.status;
    //     if (status == 0) {
    //         DebugLog.instance.error(data.message);
    //         return;
    //     }
    //     this._curGame = null;
    //     EventManager.getInstance().off(GameCenterManager.GAMEEND, context);
    //     let gsData = this._callbackDic.get(GameCenterManager.GAMEEND);
    //     if (gsData && gsData.callback) {
    //         gsData.socketData.data = data.data
    //         gsData.callback(data);
    //     }
    // }


    /**
     * 游戏匹配
     * @param sessionid
     */
    public gameMatch(sessionid: string, callback: Function = null) {
        if (Global.isAgain) {
            return;
        }
        let socketData = new SocketData({ "action": GameCenterManager.GAMEMATCHITEM,skipDebounce:true, "data": { session_id: sessionid } });
        this._callbackDic.set(GameCenterManager.GAMEMATCHITEM, new GameSocketData(socketData, callback));
        EventManager.getInstance().on(GameCenterManager.GAMEMATCHITEM, this.gameMatchCallBack, this);
        SocketManager.getInstance().send(socketData);
    }

    private gameMatchCallBack(data, context) {
        EventManager.getInstance().off(GameCenterManager.GAMEMATCHITEM, this);
        let gsData = this._callbackDic.get(GameCenterManager.GAMEMATCHITEM);
        if (gsData && gsData.callback) {
            gsData.socketData.data = data.data
            gsData.callback(data);
        }
    }


    /**
     * 过一小关
     * @param sessionid 游戏会话id
     * @param count  匹配数量 （找茬，翻牌，捕鱼中找到的不同数量）（必填）整数， 如果没有则填0(部分游戏机制不支持也填0)
     * @param level  整数或字符串 关卡编号
     * @param complete 0-1之间数字 完成度 1 表示通过关成功
     * @param duration  游戏用时（秒）
     * @param timelimit 游戏限时（秒）
     * @param difficulty 游戏难度1，2，3
     */
    public gamePassLevel(sessionid: string, count: number, level: number, complete: number, duration: number, timelimit: number, difficulty: number, levelMode: number, callback: Function = null) {
        if (Global.isAgain) {
            return;
        }
        let socketData = new SocketData({
            "action": GameCenterManager.GAMEPASSLEVEL,
            "data": {
                session_id: sessionid,
                match_count: count,
                level: level + "",
                complete: complete,
                duration: duration,
                time_limit: timelimit,
                difficulty: difficulty,
                level_mode: levelMode
            }
        })
        this._callbackDic.set(GameCenterManager.GAMEPASSLEVEL, new GameSocketData(socketData, callback));
        EventManager.getInstance().on(GameCenterManager.GAMEPASSLEVEL, this.gamePassLevelCallBack, this,true);
        SocketManager.getInstance().send(socketData);
    }

    private gamePassLevelCallBack(data, context) {
        let status = data.status;
        if (status == 0) {
            AlertManager.getInstance().showSocketAlert(data.message);
            DebugLog.instance.error(data.message);
            return;
        }
        this._curGame.sessionid = data.data.session_id;
        let levelMode = data.data.level_mode;
        if (levelMode == 2) {
            // levelMode=2时，根据难度管理关卡
           
            // 更新当前难度
            this._curGame.difficulty = data.data.difficulty;
            
            // 获取该难度的下一关
            let nextLevel = this._curGame.getNextLevelByDifficulty(data.data.difficulty);
             // 设置当前难度的关卡
             this._curGame.setLevelByDifficult(data.data.difficulty, nextLevel);
            DebugLog.instance.log(`LevelMode=2: 当前难度${data.data.difficulty}，当前关卡${data.data.level}，下一关${nextLevel}`);
        } else {
            // 使用新的关卡逻辑
            this._curGame.nextLevel;
            this._curGame.difficulty = data.data.difficulty;
        }

        // 通过事件机制通知子包更新进度，避免主包和子包的循环依赖
        EventManager.getInstance().emit("GAME_CENTER_LEVEL_UPDATE", {
            level: this._curGame.level,
            difficulty: data.data.difficulty,
            levelMode: data.data.level_mode
        });

        EventManager.getInstance().off(GameCenterManager.GAMEPASSLEVEL, context);
        let gsData = this._callbackDic.get(GameCenterManager.GAMEPASSLEVEL);
        DebugLog.instance.log("gamePassLevelData", data);
        if (gsData && gsData.callback) {
            gsData.socketData.data = data.data
            gsData.callback(data);
        }
    }


    // 移除checkAlertScale方法，因为不再使用BrainTrainAlert


    /**
     * 中途退出游戏大厅游戏
     * @param parentNode
     * @param goon_callback
     * @param exit_callback
     * @param context
     */
    public quitGame(parentNode: Node, goon_callback: Function, exit_callback: Function, context) {
        // 使用SettlementPanel替代BrainTrainAlert
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: null, // 设置为null表示退出确认模式
            // title: "是否退出当前游戏？",
            againHandler: () => {
                // 继续游戏
                if (goon_callback) {
                    goon_callback(context);
                }
            },
            nextHandler: () => {
                // 退出游戏
                if (exit_callback) {
                    exit_callback(context);
                }
            }
        });
    }

    /**
     * 退出游戏大厅游戏
     */
    public exitCallBack() {
        SocketManager.getInstance().send(new SocketData({
            action: GameCenterManager.GAMEEND,
            data: {
                session_id: GameCenterManager.getInstance().currentGame.sessionid,
            }
        }));
        Global.isAgain = false;
        GuideManager.getInstance().quitGame();
        SceneManager.getInstance().backToGameCenter();
    }

    public static get settlementPanel(): SettlementPanel {
        return this._settlementPanel;
    }

}