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
import { AlertManager, AlertData } from "../../Core/Manager/Alert/AlertManager";
import { LoadPanel } from "../UI/Load/LoadPanel";

/**
 * 训练大厅通信数据
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
 * 训练大厅数据
 */
export class GameCenterData {
    public gameid: number;
    public sessionid: string;
    private result;
    public levelMode: number = 1;
    // 当前gameData的训练难度，关卡
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
     * 训练大厅选择的难度系数
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
 * 训练大厅管理器
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

    /**
     * 训练大厅加载错误事件
     */
    public static GAME_CENTER_LOAD_ERROR = "GAME_CENTER_LOAD_ERROR";




    private _callbackDic: Map<string, GameSocketData> = new Map();

    private _curGame: GameCenterData;

    private _curGameSpecData: GameCenterSpecModel;

    private static _settlementPanel: SettlementPanel = null;

    // 保存GuidePanel的显示数据，用于退出时返回到GuidePanel
    private _lastGuidePanelData: any = null;

    constructor() {
        GameDataFactory.registerGameType(GameType.GAME_CENTER, GameCenterSpecModel);
        UIManager.getInstance().registerPanel(SettlementPanel.NAME, BundleName.RESOURCES, "prefab/settlementPanel/settlementPanel", SettlementPanel);
        GameCenterManager._settlementPanel = new SettlementPanel();
    }

    perload(url, sceneName) {
        DebugLog.instance.log(`${sceneName} gamemanager sceneName`);
        
        // 设置训练大厅错误处理监听器（仅在需要时添加）
        this.setupGameCenterErrorHandling();
        
        // 设置预加载事件监听器
        this.setupPreloadEventListeners(sceneName);
        
        // 模拟预加载超时测试（仅用于测试，生产环境请注释掉）
        // this.simulatePreloadTimeout(sceneName);
        
        // 开始预加载
        BundlePreloadManager.getInstance().preload(sceneName as BundleName);
    }

    private onPreloadFinish(url: string, sceneName: string, data: any) {
        DebugLog.instance.log(`${sceneName} 预加载完成`);
        
        SceneManager.getInstance().changeScene(sceneName, "", {gametype: GameType.GAME_CENTER}).then((scene) => {
            EventManager.getInstance().emit(SceneManager.SCENE_ENTER);
            (scene as any).sceneModel = GameCenterManager.getInstance().gameSpecData;
            (scene as any).sceneModel.scene = scene as any;
            DebugLog.instance.log(`${sceneName} 场景切换成功`);
            
            // // 游戏场景加载成功，清理GuidePanel数据
            // this.clearGuidePanelData();
            
            // 清理事件监听器
            this.cleanupPreloadEventListeners();
        }).catch((error) => {
            DebugLog.instance.error(`训练大厅场景切换失败: ${sceneName}`, error);
            
            // 清理事件监听器
            this.cleanupPreloadEventListeners();

            
            // 触发训练大厅加载错误事件
            EventManager.getInstance().emit(GameCenterManager.GAME_CENTER_LOAD_ERROR, {
                sceneName,
                error: error,
                type: 'scene_change_failed'
            });
            
            // 显示错误提示
            this.showLoadErrorAlert(sceneName);
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

    /**
     * 保存GuidePanel的显示数据
     * @param guidePanelData GuidePanel的显示数据
     */
    public saveGuidePanelData(guidePanelData: any): void {
        this._lastGuidePanelData = guidePanelData;
        DebugLog.instance.log('保存GuidePanel数据:', guidePanelData);
    }

    /**
     * 清理GuidePanel的显示数据
     */
    public clearGuidePanelData(): void {
        this._lastGuidePanelData = null;
        DebugLog.instance.log('清理GuidePanel数据');
    }

    public get currentGame(): GameCenterData {
        if(this._curGame){
            this._curGame.difficulty = this._selectDifficulty;
            return this._curGame;
        }
        return null;
    }


    private _selectDifficulty: number = 1;
    /**
     * 设置当前训练难度
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
        // 防止重复弹出SettlementPanel
        if (this.settleMentPanelShow || UIManager.getInstance().isPanelActive(SettlementPanel.NAME)) {
            DebugLog.instance.warn('SettlementPanel is already showing, skip duplicate show');
            return;
        }

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
        // 防止重复弹出SettlementPanel
        if (this.settleMentPanelShow || UIManager.getInstance().isPanelActive(SettlementPanel.NAME)) {
            DebugLog.instance.warn('SettlementPanel is already showing, skip duplicate show');
            return;
        }

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
     * 开始某个训练
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
            
            // 触发训练大厅加载错误事件
            EventManager.getInstance().emit(GameCenterManager.GAME_CENTER_LOAD_ERROR, {
                sceneName: 'unknown',
                error: data.message,
                type: 'start_game_failed'
            });
            
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
     * 结束训练
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
     * 训练匹配
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
     * @param sessionid 训练会话id
     * @param count  匹配数量 （找茬，翻牌，捕鱼中找到的不同数量）（必填）整数， 如果没有则填0(部分训练机制不支持也填0)
     * @param level  整数或字符串 关卡编号
     * @param complete 0-1之间数字 完成度 1 表示通过关成功
     * @param duration  训练用时（秒）
     * @param timelimit 训练限时（秒）
     * @param difficulty 训练难度1，2，3
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
            
            // 触发训练大厅加载错误事件
            EventManager.getInstance().emit(GameCenterManager.GAME_CENTER_LOAD_ERROR, {
                sceneName: 'unknown',
                error: data.message,
                type: 'pass_level_failed'
            });
            
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
     * 中途退出训练大厅训练
     * @param parentNode
     * @param goon_callback
     * @param exit_callback
     * @param context
     */
    public quitGame(parentNode: Node, goon_callback: Function, exit_callback: Function, context) {
        // 防止重复弹出SettlementPanel
        if (this.settleMentPanelShow || UIManager.getInstance().isPanelActive(SettlementPanel.NAME)) {
            DebugLog.instance.warn('SettlementPanel is already showing, skip duplicate show');
            return;
        }

        this.settleMentPanelShow = true;
        // 使用SettlementPanel替代BrainTrainAlert
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: null, // 设置为null表示退出确认模式
            // title: "是否退出当前训练？",
            againHandler: () => {
                // 继续训练
                this.settleMentPanelShow = false;
                if (goon_callback) {
                    goon_callback(context);
                }
            },
            nextHandler: () => {
                // 退出训练
                this.settleMentPanelShow = false;
                if (exit_callback) {
                    exit_callback(context);
                }
            }
        });
    }

    /**
     * 退出训练大厅训练
     */
    public exitCallBack() {
        if (this._curGame) {
            SocketManager.getInstance().send(new SocketData({
                action: GameCenterManager.GAMEEND,
                data: {
                    session_id: GameCenterManager.getInstance().currentGame.sessionid,
                }
            }));
        }
        Global.isAgain = false;
        GuideManager.getInstance().quitGame();
        
        // 如果有保存的GuidePanel数据，返回到GuidePanel；否则回到游戏大厅
        if (this._lastGuidePanelData) {
            DebugLog.instance.log('返回到GuidePanel');
            // 先回到游戏大厅场景
            SceneManager.getInstance().backToGameCenter().then(() => {
                // 场景切换完成后显示GuidePanel
                setTimeout(() => {
                    UIManager.getInstance().showPanel("GuidePanel", this._lastGuidePanelData);
                }, 100); // 延迟100ms确保场景切换完成
            }).catch((error) => {
                DebugLog.instance.error('返回游戏大厅失败，直接显示GuidePanel:', error);
                UIManager.getInstance().showPanel("GuidePanel", this._lastGuidePanelData);
            });
        } else {
            DebugLog.instance.log('没有GuidePanel数据，直接回到游戏大厅');
            SceneManager.getInstance().backToGameCenter();
        }
    }

    public static get settlementPanel(): SettlementPanel {
        return this._settlementPanel;
    }

    /**
     * 设置预加载事件监听器
     * @param sceneName 场景名称
     */
    private setupPreloadEventListeners(sceneName: string) {
        // 清理之前的事件监听器
        this.cleanupPreloadEventListeners();
        
        // 监听预加载完成事件
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, "", sceneName), this, true);
        
        // 监听预加载失败事件
        EventManager.getInstance().on(BundlePreloadEvent.FAILED, this.onPreloadFailed.bind(this, sceneName), this, true);
        
        // 监听加载错误已处理事件
        EventManager.getInstance().on(BundlePreloadEvent.LOAD_ERROR_HANDLED, this.onLoadErrorHandled.bind(this, sceneName), this, true);
    }

    /**
     * 清理预加载事件监听器
     */
    private cleanupPreloadEventListeners() {
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
        EventManager.getInstance().off(BundlePreloadEvent.FAILED, this);
        EventManager.getInstance().off(BundlePreloadEvent.LOAD_ERROR_HANDLED, this);
    }

    /**
     * 清理训练大厅错误处理监听器
     */
    private cleanupGameCenterErrorHandling() {
        EventManager.getInstance().off(GameCenterManager.GAME_CENTER_LOAD_ERROR, this);
        EventManager.getInstance().off(BundlePreloadEvent.TIMEOUT, this);
        EventManager.getInstance().off(BundlePreloadEvent.FAILED, this);
    }

    /**
     * 预加载失败回调
     * @param sceneName 场景名称
     * @param data 失败数据
     */
    private onPreloadFailed(sceneName: string, data: any) {
        DebugLog.instance.error(`训练大厅预加载失败: ${sceneName}`, data);
        
        // 清理事件监听器
        this.cleanupPreloadEventListeners();
        
        // 触发训练大厅加载错误事件
        EventManager.getInstance().emit(GameCenterManager.GAME_CENTER_LOAD_ERROR, {
            sceneName,
            error: data,
            type: 'preload_failed'
        });
        
        // 显示错误提示
        this.showLoadErrorAlert(sceneName);
    }

    /**
     * 加载错误已处理回调
     * @param sceneName 场景名称
     * @param data 处理结果数据
     */
    private onLoadErrorHandled(sceneName: string, data: any) {
        DebugLog.instance.log(`训练大厅加载错误已处理: ${sceneName}`, data);
        
        // 清理事件监听器
        this.cleanupPreloadEventListeners();
        
        // 无论处理成功还是失败，都显示错误提示让用户选择
        DebugLog.instance.log(`训练大厅加载错误，显示用户选择界面: ${sceneName}`);
        this.showLoadErrorAlert(sceneName);
    }

    /**
     * 显示加载错误提示
     * @param sceneName 场景名称
     */
    private showLoadErrorAlert(sceneName: string, isTimeout: boolean = false, errorData: any = null) {
        DebugLog.instance.log(`GameCenterManager.showLoadErrorAlert 被调用: ${sceneName}, isTimeout: ${isTimeout}`, errorData);
        
        // 使用AlertManager显示错误提示弹窗，不关闭已打开的GuidePanel
        const alertData = new AlertData();
        
        if (isTimeout) {
            // 超时错误提示
            alertData.title = "加载超时";
            alertData.message = `训练 ${sceneName} 加载超时，请检查网络连接后重试`;
        } else {
            // 其他错误提示
            alertData.title = "加载失败";
            alertData.message = `训练 ${sceneName} 加载失败，请稍后重试`;
        }
        
        alertData.cancelButtonVisible = true;
        alertData.cancelButtonText = "返回大厅";
        alertData.confirmButtonText = "重试";
        alertData.cancelCb = () => {
            // 返回大厅回调
            DebugLog.instance.log(`用户选择返回大厅: ${sceneName}`);
            this.handleLoadErrorExit();
            // 不自动跳转，让用户自己处理返回逻辑
            DebugLog.instance.log("用户选择返回大厅，等待用户自己处理跳转逻辑");
        };
        alertData.confirmCb = () => {
            // 重试回调
            DebugLog.instance.log(`用户选择重试加载训练: ${sceneName}`);
            
            // 先关闭当前弹窗
            AlertManager.getInstance().closeCurrentAlert();
            
            // 然后重试加载训练
            this.retryLoadGame(sceneName);
        };
        
        // 显示AlertManager的alert，不关闭已打开的GuidePanel
        AlertManager.getInstance().showAlert(alertData);
    }

    /**
     * 重试加载训练
     * @param sceneName 场景名称
     */
    private retryLoadGame(sceneName: string) {
        DebugLog.instance.log(`重试加载训练: ${sceneName}`);
        
        // 延迟一段时间后重试，避免立即重试
        setTimeout(() => {
            // 重新开始训练加载
            this.perload("", sceneName);
        }, 1000);
    }

    /**
     * 处理加载错误退出
     */
    private async handleLoadErrorExit() {
        DebugLog.instance.log("处理训练大厅加载错误退出");
        
        // 重置训练大厅状态
        this.resetGameCenterState();
        
        // 关闭LoadPanel
        try {
            await UIManager.getInstance().hidePanel(LoadPanel.NAME);
            DebugLog.instance.log("LoadPanel已关闭");
        } catch (error) {
            DebugLog.instance.error("关闭LoadPanel失败:", error);
        }
        
        // 回到训练大厅
        try {
            await SceneManager.getInstance().backToGameCenter();
            DebugLog.instance.log("已回到训练大厅");
        } catch (error) {
            DebugLog.instance.error("回到训练大厅失败:", error);
        }
    }

    /**
     * 重置训练大厅状态
     */
    private resetGameCenterState() {
        DebugLog.instance.log("重置训练大厅状态");
        
        // 重置全局状态
        Global.isSkewersGame = false;
        Global.isAgain = false;
        
        // 清理事件监听器
        this.cleanupPreloadEventListeners();
        this.cleanupGameCenterErrorHandling();
        
        // 清理当前训练数据
        this._curGame = null;
    }

    /**
     * 模拟预加载超时（仅用于测试）
     * @param sceneName 场景名称
     */
    private simulatePreloadTimeout(sceneName: string) {
        // 模拟3秒后触发超时事件
        setTimeout(() => {
            DebugLog.instance.log(`模拟预加载超时: ${sceneName}`);
            
            // 直接调用训练大厅的超时处理方法，避免事件冲突
            this.showLoadErrorAlert(sceneName, true, {
                bundleName: sceneName,
                error: "模拟超时错误",
                timeout: 3000,
                currentSceneName: "gameCenter" // 明确标识这是训练大厅场景
            });
            
            // 同时触发超时事件（可选，用于日志记录）
            EventManager.getInstance().emit(BundlePreloadEvent.TIMEOUT, {
                bundleName: sceneName,
                error: "模拟超时错误",
                timeout: 3000,
                currentSceneName: "gameCenter"
            });
        }, 3000);
    }

    /**
     * 设置训练大厅错误处理
     */
    private setupGameCenterErrorHandling() {
        // 先清理可能存在的监听器，避免重复监听
        this.cleanupGameCenterErrorHandling();
        
        // 监听训练大厅加载错误事件
        EventManager.getInstance().on(GameCenterManager.GAME_CENTER_LOAD_ERROR, (data) => {
            DebugLog.instance.error(`训练大厅加载错误事件: ${data.sceneName}`, data);
            
            // 可以在这里添加全局的错误处理逻辑
            // 比如记录错误日志、上报错误等
            
            // 根据错误类型进行不同的处理
            switch (data.type) {
                case 'preload_failed':
                    DebugLog.instance.error(`训练大厅预加载失败: ${data.sceneName}`);
                    break;
                case 'scene_change_failed':
                    DebugLog.instance.error(`训练大厅场景切换失败: ${data.sceneName}`);
                    break;
                case 'start_game_failed':
                    DebugLog.instance.error(`训练大厅开始训练失败: ${data.error}`);
                    break;
                case 'pass_level_failed':
                    DebugLog.instance.error(`训练大厅通过关卡失败: ${data.error}`);
                    break;
                default:
                    DebugLog.instance.error(`训练大厅未知错误类型: ${data.type}`);
                    break;
            }
        }, this);

        // 监听BundlePreloadManager的超时和失败事件
        // 注意：这里监听的是全局的BundlePreloadEvent事件
        EventManager.getInstance().on(BundlePreloadEvent.TIMEOUT, (data) => {
            DebugLog.instance.error(`训练大厅资源加载超时: ${data.bundleName}`, data);
            
            // 检查是否为训练大厅相关的超时事件
            // 通过currentSceneName或bundleName来判断
            const isGameCenterRelated = data.currentSceneName === "gameCenter" || 
                                      data.currentSceneName === "mainV2" ||
                                      !data.currentSceneName; // 如果没有场景信息，默认处理
            
            if (isGameCenterRelated) {
                this.showLoadErrorAlert(data.bundleName, true, data);
            } else {
                DebugLog.instance.log(`训练大厅忽略非相关超时事件: ${data.bundleName} (场景: ${data.currentSceneName})`);
            }
        }, this);

        EventManager.getInstance().on(BundlePreloadEvent.FAILED, (data) => {
            DebugLog.instance.error(`训练大厅资源加载失败: ${data.bundleName}`, data);
            
            // 检查是否为训练大厅相关的失败事件
            const isGameCenterRelated = data.currentSceneName === "gameCenter" || 
                                      data.currentSceneName === "mainV2" ||
                                      !data.currentSceneName;
            
            if (isGameCenterRelated) {
                this.showLoadErrorAlert(data.bundleName, false, data);
            } else {
                DebugLog.instance.log(`训练大厅忽略非相关失败事件: ${data.bundleName} (场景: ${data.currentSceneName})`);
            }
        }, this);
    }
}