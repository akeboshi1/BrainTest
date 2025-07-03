import { EventManager } from "../../Core/Manager/Event/EventManager";
import { SocketManager } from "../../Core/Manager/Net/SocketManager";
import { SocketData } from "../../Core/Manager/Net/SocketData";
import { Global } from "../../Core/Manager/Config/Global";
import { DebugLog } from "../../Core/Util/DebugLog";
import { SceneManager } from "../../Core/Manager/Scene/SceneManager";
import { instantiate, Node, Prefab, resources } from "cc";
import { AlertType } from "db://assets/resources/scripts/Game/UI/Alert/GameAlert";
import { GuideManager } from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import { BundlePreloadEvent, BundlePreloadManager } from "../../Core/Manager/Load/BundlePreloadManager";
import { BundleName } from "../../Core/Manager/Load/BundleName";
import { GameDataFactory } from "db://assets/resources/scripts/Core/Scene/SceneModelFactory/GameDataFactory";
import { GameType } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { GameCenterSpecModel } from "db://assets/resources/scripts/Core/Scene/SceneModel/GameCenterSpecModel";
import { SettlementPanel } from "db://assets/resources/scripts/Core/UI/SettlementPanel";
import { UIManager } from "../../Core/Manager/UI/UIManager";

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

    private _difficultDic: Map<number, number> = new Map();
    constructor(data) {
        this.gameid = data.game_id;
        this.sessionid = data.session_id;
        this.levelMode = data.level_mode;
        this.result = data.data;
        let count = this.result.length;
        for (let i: number = 0; i < count; i++) {
            let obj = this.result[i];
            let level = Number(obj['level']) == 0 ? 1 : Number(obj['level']);
            let difficult = Number(obj['difficulty']);
            this._difficultDic.set(difficult, level);
            // 不管levelmode是否为1，默认所有游戏大厅游戏进度都是难度1,但是进入游戏后所有游戏的难度都可以自己选择
            if (i == 0) {
                this._level = level;
                this._difficulty = difficult;
            }
        }
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
        if (this.levelMode == 1) {
            return this._level;
        } else {
            return this.getLevelByDifficult(this.difficulty);
        }
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
        UIManager.getInstance().registerPanel(SettlementPanel.NAME,BundleName.RESOURCES,"prefab/settlementPanel/settlementPanel",SettlementPanel);
        GameCenterManager._settlementPanel = new SettlementPanel();
    }

    perload(url, sceneName) {
        DebugLog.instance.log(`${sceneName} gamemanager sceneName`);
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, sceneName), this, true);
        BundlePreloadManager.getInstance().preload(sceneName as BundleName);
    }

    private onPreloadFinish(url: string, sceneName: string, data: any) {
        DebugLog.instance.log(`${sceneName} 预加载完成`);
        SceneManager.getInstance().changeScene(url, sceneName).then((scene) => {
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


    private _selectDifficulty:number = 1;
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

    public settleMentPanelShow:boolean = false;

    showSuccessView(){
        let self= this;
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

    showFailView(){
        let self= this;
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
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
            return;
        }
        EventManager.getInstance().off(GameCenterManager.GAMESTART, context);
        this._curGame = new GameCenterData(data.data);
        let gsData = this._callbackDic.get(GameCenterManager.GAMESTART);
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
        let socketData = new SocketData({ "action": GameCenterManager.GAMEMATCHITEM, "data": { session_id: sessionid } });
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
        EventManager.getInstance().on(GameCenterManager.GAMEPASSLEVEL, this.gamePassLevelCallBack, this);
        SocketManager.getInstance().send(socketData);
    }

    private gamePassLevelCallBack(data, context) {
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
            return;
        }
        this._curGame.sessionid = data.data.session_id;
        let levelMode = data.data.level_mode;
        if (levelMode == 2) {
            this._curGame.setLevelByDifficult(data.data.difficulty, data.data.level);
        } else {
            this._curGame.level = Number(data.data.level);
            this._curGame.difficulty = data.data.difficulty;
        }

        // 通过事件机制通知子包更新进度，避免主包和子包的循环依赖
        EventManager.getInstance().emit("GAME_CENTER_LEVEL_UPDATE", {
            level: Number(data.data.level),
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

    /**
     * 中途退出游戏大厅游戏
     * @param parentNode
     * @param goon_callback
     * @param exit_callback
     * @param context
     */
    public quitGame(parentNode: Node, goon_callback: Function, exit_callback: Function, context) {
        resources.load("prefab/BrainTrainAlert", Prefab, (err, prefab) => {
            if (err) {
                DebugLog.instance.error(err);
                return;
            }
            let alertNode = instantiate(prefab);
            parentNode.addChild(alertNode);
            let alert = alertNode.getComponent("GameAlert");
            alertNode.setPosition(0, 0, 0);
            alert["showView"](AlertType.Game_Center);
            alert["setTitle"]("是否退出当前游戏？");
            alert["bindCallBack"](goon_callback, exit_callback, context);
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