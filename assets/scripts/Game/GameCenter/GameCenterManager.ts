import {EventManager} from "../../Core/Manager/Event/EventManager";
import {SocketManager} from "../../Core/Manager/Net/SocketManager";
import {SocketData} from "../../Core/Manager/Net/SocketData";
import {Global} from "../../Core/Manager/Config/Global";
import {DebugLog} from "../../Core/Util/DebugLog";
import {SceneManager} from "../../Core/Manager/Scene/SceneManager";
import {LoaderManager} from "../../Core/Manager/Load/LoaderManager";
import {instantiate,Node} from "cc";
import {AlertType} from "db://assets/scripts/Game/UI/Alert/GameAlert";

/**
 * 游戏大厅通信数据
 */
export class GameSocketData{
    public callback:Function = null;
    public socketData:SocketData = null;
    constructor(socketData:SocketData,callback:Function = null) {
        this.socketData = socketData;
        this.callback = callback;
    }
}

/**
 * 游戏大厅数据
 */
export class GameCenterData{
    public gameid:number;
    public sessionid:string;
    public level:number = 0;
    public difficulty:number = 1;
    constructor(data){
        this.gameid = data.game_id;
        this.sessionid = data.session_id;
        this.level = data.level.length<1?1:Number(data.level);
    }
}

/**
 * 游戏大厅管理器
 */
export class GameCenterManager {
    private static _instance: GameCenterManager;
    public static getInstance() {
        if(!GameCenterManager._instance) {
            GameCenterManager._instance = new GameCenterManager();
        }
        return GameCenterManager._instance;
    }

    public static GAMESTART = "game.start_session";
    public static GAMEEND = "game.end_session";

    public static GAMEMATCHITEM = "game.match_item";
    public static GAMEPASSLEVEL = "game.pass_level";




    private _callbackDic:Map<string,GameSocketData> =new Map();

    private _curGame:GameCenterData;

    private _alertInstance:Node = null;

    public enterGameCenter(){
        Global.isSkewersGame = false;
    }

    public exitGameCenter(){
        Global.isSkewersGame = true;
    }

    public get currentGame():GameCenterData {
        return this._curGame;
    }



    /**
     * 开始某个游戏
     * @param gameID
     */
    public startGame(gameID:number,callback:Function = null):void {
        let socketData = new SocketData({"action": GameCenterManager.GAMESTART, "data": {game_id:gameID}});
        this._callbackDic.set(GameCenterManager.GAMESTART,new GameSocketData(socketData,callback));
        EventManager.getInstance().on(GameCenterManager.GAMESTART,this.startGameCallBack,this);
        SocketManager.getInstance().send(socketData);
    }


    private startGameCallBack(data,context){
        DebugLog.instance.log("startGameCallBack",data);
        let status = data.status;
        if(status == 0){
            DebugLog.instance.error(data.message);
            return;
        }
        EventManager.getInstance().off(GameCenterManager.GAMESTART,context);
        this._curGame = new GameCenterData(data.data);
        let gsData = this._callbackDic.get(GameCenterManager.GAMESTART);
        if(gsData && gsData.callback){
            gsData.socketData.data = data.data;
            gsData.callback(data);
        }
    }
  

    /**
     * 结束游戏
     * @param gameID
     */
    public endGame(gameID:number,callback:Function = null){
        let socketData = new SocketData({"action": GameCenterManager.GAMEEND,  "data": {game_id:gameID}});
        this._callbackDic.set(GameCenterManager.GAMEEND,new GameSocketData(socketData,callback));
        EventManager.getInstance().on(GameCenterManager.GAMEEND,this.endGameCallBack,this);
        SocketManager.getInstance().send(socketData);
    }

    private endGameCallBack(data,context){
        let status = data.status;
        if(status == 0){
            DebugLog.instance.error(data.message);
            return;
        }
        this._curGame = null;
        EventManager.getInstance().off(GameCenterManager.GAMEEND,context);
        let gsData = this._callbackDic.get(GameCenterManager.GAMEEND);
        if(gsData && gsData.callback){
            gsData.socketData.data = data.data
            gsData.callback(data);
        }
    }


    /**
     * 游戏匹配
     * @param sessionid
     */
    public gameMatch(sessionid:string,callback:Function = null){
        if(Global.isAgain){
            return;
        }
        let socketData = new SocketData({"action": GameCenterManager.GAMEMATCHITEM,  "data":{session_id:sessionid}});
        this._callbackDic.set(GameCenterManager.GAMEMATCHITEM,new GameSocketData(socketData,callback));
        EventManager.getInstance().on(GameCenterManager.GAMEMATCHITEM,this.gameMatchCallBack,this);
        SocketManager.getInstance().send(socketData);
    }

    private gameMatchCallBack(data,context){
        EventManager.getInstance().off(GameCenterManager.GAMEMATCHITEM,this);
        let gsData = this._callbackDic.get(GameCenterManager.GAMEMATCHITEM);
        if(gsData && gsData.callback){
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
    public gamePassLevel(sessionid:string,count:number,level:number,complete:number,duration:number,timelimit:number,difficulty:number,callback:Function = null){
        if(Global.isAgain){
            return;
        }
        let socketData = new SocketData({"action":GameCenterManager.GAMEPASSLEVEL,
            "data":{
                session_id:sessionid,
                match_count:count,
                level:level+"",
                complete:complete,
                duration:duration,
                time_limit:timelimit,
                difficulty:difficulty,
            }
        })
        this._callbackDic.set(GameCenterManager.GAMEPASSLEVEL,new GameSocketData(socketData,callback));
        EventManager.getInstance().on(GameCenterManager.GAMEPASSLEVEL,this.gamePassLevelCallBack,this)
        SocketManager.getInstance().send(socketData);
    }

    private gamePassLevelCallBack(data,context){
        let status = data.status;
        if(status == 0){
            DebugLog.instance.error(data.message);
            return;
        }
        this._curGame.sessionid = data.data.session_id;
        this._curGame.level = data.data.level;
        this._curGame.difficulty = data.data.difficulty;
        EventManager.getInstance().off(GameCenterManager.GAMEPASSLEVEL,context);
        let gsData = this._callbackDic.get(GameCenterManager.GAMEPASSLEVEL);
        DebugLog.instance.log("gamePassLevelData",data);
        if(gsData && gsData.callback){
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
    public quitGame(parentNode:Node,goon_callback:Function,exit_callback:Function,context){
        let alertNode = GameCenterManager.getInstance()._alertInstance;
        if(alertNode == null){
            LoaderManager.getInstance().resourcesLoadPrefab("prefab/BrainTrainAlert").then((resource)=>{
                alertNode = GameCenterManager.getInstance()._alertInstance = instantiate(resource);
                parentNode.addChild(alertNode);
                let alert = alertNode.getComponent("GameAlert");
                alertNode.setPosition(0,0,0);
                alert["showView"](AlertType.Game_Center);
                alert["setTitle"]("是否退出当前游戏？");
                alert["bindCallBack"](goon_callback,exit_callback,context);
            });
        }else{
            parentNode.addChild(alertNode);
            let alert = alertNode.getComponent("GameAlert");
            alertNode.setPosition(0,0,0);
            alert["showView"](AlertType.Game_Center);
            alert["setTitle"]("是否退出当前游戏？");
            alert["bindCallBack"](goon_callback,exit_callback,context);
        }
    }

    /**
     * 退出游戏大厅游戏
     */
    public exitCallBack(){
        SocketManager.getInstance().send(new SocketData({
            action: GameCenterManager.GAMEEND,
            data: {
                session_id: GameCenterManager.getInstance().currentGame.sessionid,
            }
        }));
        SceneManager.getInstance().backToGameCenter();
    }


}