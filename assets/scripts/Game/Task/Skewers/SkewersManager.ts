import {SkewersGameData} from "./SkewersGameData";
import {DebugLog} from "../../../Core/Util/DebugLog";
import {SceneManager} from "../../../Core/Manager/Scene/SceneManager";
import {Global} from "../../../Core/Manager/Config/Global";
import { SkewersGameStatus} from "../../../Core/Data/GameState";
import {SocketManager} from "../../../Core/Manager/Net/SocketManager";
import {SocketData} from "../../../Core/Manager/Net/SocketData";
import {EventManager} from "../../../Core/Manager/Event/EventManager";

/**
 * 脑力串烧管理器
 */
export class SkewersManager{

    private static _instance: SkewersManager;

    public static getInstance(): SkewersManager {
        if(SkewersManager._instance ==null){
            SkewersManager._instance = new SkewersManager();
        }
        return SkewersManager._instance;
    }

    private _gameDatas:SkewersGameData[];

    /**
     * 当前游戏索引
     * @private
     */
    private _curIndex:number =-1;



    //===== 脑力保健
    /**
     * 获取脑力保健任务 旧
     * @private
     */
    private task_get_brain_trainings:string = "task.get_brain_trainings";

    /**
     * 获取脑力保健任务队列 新
     * @private
     */
    private task_get_grouped_brain_trainings:string = "task.get_grouped_brain_trainings";

    /**
     * 完成脑力保健任务
     * @private
     */
    private task_complete_brain_training:string = "task.complete_brain_training";


    public static TASK_GET_BRAIN_TRAININGS:string = "TASK_GET_BRAIN_TRAININGS";


     public init(){
           this._gameDatas = [];

     }

     start(){
         Global.isSkewersGame =true;
         this.startGame();
     }


    /**
     * 请求脑力保健任务列表 新
     * @param taskID
     */
     public requestBranisTraining_list(taskID:number){
         EventManager.getInstance().on(this.task_get_grouped_brain_trainings,this.requestBranisTraining_listCallBack,this);
         let requestBranisTrainingsSocket = new SocketData({action:this.task_get_grouped_brain_trainings,data:{task_id:taskID}});
         SocketManager.getInstance().send(requestBranisTrainingsSocket);
     }

     private requestBranisTraining_listCallBack(data:any,context:any){
         EventManager.getInstance().off(this.task_get_grouped_brain_trainings,this);
         this._gameDatas = [];
         let status = data.status;
         if(status == 0){
             DebugLog.instance.error(data.message);
         }else {
             let result = data.data['result'];
             let len = result.length;
             for(let i=0; i<len; i++){
                 let tmpData:any = result[i]; // skewersGameData_data
                 let skewersGameData:SkewersGameData = new SkewersGameData();
                 skewersGameData.refreshData(tmpData);
                 this._gameDatas.push(skewersGameData);
             }
             Global.userData.skewerGameDatas = this._gameDatas;
         }
         EventManager.getInstance().emit(SkewersManager.TASK_GET_BRAIN_TRAININGS,this._gameDatas);
     }

    // /**
    //  * 请求脑力保健任务列表 旧
    //  * @param taskID
    //  */
    //  public requestBranisTrainings(taskID:number){
    //     EventManager.getInstance().on(this.task_get_brain_trainings,this.requestBranisTrainingsCallback,this);
    //     let requestBranisTrainingsSocket = new SocketData({action:this.task_get_brain_trainings,data:{task_id:taskID}});
    //     SocketManager.getInstance().send(requestBranisTrainingsSocket);
    //  }
    //
    //  private requestBranisTrainingsCallback(data:any,context:any){
    //      context._gameDatas = [];
    //      EventManager.getInstance().off(context.task_get_brain_trainings,context);
    //      let status = data.status;
    //      if(status == 0){
    //          DebugLog.instance.error(data.message);
    //          return;
    //      }
    //      const result = data.data.result;
    //      const len = result.length;
    //      for(let i:number =0;i<len;i++){
    //           let tmpData:any = result[i];
    //           let data:SkewersGameData = new SkewersGameData();
    //           data.refreshData(tmpData);
    //           if(data.gameCode != "finding") context._gameDatas.push(data);
    //      }
    //      Global.userData.skewerGameDatas = context._gameDatas;
    //      context.startGame();
    //  }

     public getGameCount():number{
         let curgameData = this.getUnCompleteGameData();
         if(curgameData == null)return 0 ;
         return curgameData.trains.length;
     }

     public getCurGameIndex():number{
         let curgameData = this.getUnCompleteGameData();
         if(curgameData == null) return 0 ;
         let trainData = curgameData.getCurTrainData();
         if(trainData == null) return 0;
         return trainData.seq;
     }


     private _curRequestCompleteData:SocketData = null;

    /**
     * 请求完成脑力保健小关
     * @param data
     */
     public requestCompleteBrainsTrainings(data:any){
         EventManager.getInstance().on(this.task_complete_brain_training,this.requestCompleteBrainsTrainingsCallback,this);
         this._curRequestCompleteData = new SocketData(data);
         SocketManager.getInstance().send(this._curRequestCompleteData);
     }

     private requestCompleteBrainsTrainingsCallback(data:any,context:any){
         EventManager.getInstance().off(context.task_complete_brain_training,context);
         let status = data.status;
         if(status == 0){
             DebugLog.instance.error(data.message);
             SceneManager.getInstance().backToHall();
         }else{
             if(!this._gameDatas||this._gameDatas.length <=0){
                 DebugLog.instance.log("当前串烧游戏已经全部完成");
                 Global.isSkewersGame = false;
                 this._curIndex = -1;
                 // back to hall test
                 SceneManager.getInstance().backToHall();
                 return;
             }
             let curGame = this.getUnCompleteGameData();
             if(!curGame){
                 DebugLog.instance.log("当前串烧游戏已经全部完成");
                 Global.isSkewersGame = false;
                 this._curIndex = -1;
                 SceneManager.getInstance().backToHall();
                 return;
             }
             curGame.updateData(data.data["brain_training_id"], this._curRequestCompleteData);
             // 可能换到了下一个类型游戏
             curGame = this.getUnCompleteGameData();
             const sceneName = curGame.gameCode;
             let url = Global.RES_Root+sceneName;
             SceneManager.getInstance().changeScene(url,sceneName).then(()=>{
                 DebugLog.instance.log(`串烧游戏 ${sceneName} 切换成功`);
                 Global.userData.curSkewerGameData = curGame;
             });
         }
     }

     public startGame(){
          if(!this._gameDatas||this._gameDatas.length <=0){
              this._curIndex = -1;
              DebugLog.instance.error("当前没有游戏可以运行");
              return;
          }
          let game = this.getUnCompleteGameData();
          if(!game){
              this._curIndex = -1;
              DebugLog.instance.error("当前脑力训练已经全部完成！");
              SceneManager.getInstance().backToHall();
              return;
          }
          const sceneName = game.gameCode;
          let url = Global.RES_Root+sceneName;
          SceneManager.getInstance().changeScene(url,sceneName).then((scene)=>{
              DebugLog.instance.log(`串烧游戏 ${sceneName} 开始`);
              Global.userData.curSkewerGameData = game;
          });

     }

    /**
     * 跳出串烧游戏，记录当前游戏index进度
     */
    public pauseGame(){
         SceneManager.getInstance().backToHall().then(()=>{
             DebugLog.instance.log('退出串烧游戏');
         });
    }

    /**
     * 返回串烧游戏
     */
    public resumeGame(){
        this.runGame(this._curIndex);
    }

    /**
     * 指定 某index/某一类型 的串烧游戏
     * @param index
     */
     public runGame(index:number=0){
         if(!this._gameDatas||this._gameDatas.length <=0){
             this._curIndex = -1;
             DebugLog.instance.error("当前没有游戏可以运行");
             return;
         }
         const game = this.getUnCompleteGameData();
         if(!game){
             this._curIndex = -1;
             DebugLog.instance.error("当前脑力训练已经全部完成！");
             SceneManager.getInstance().backToHall();
             return;
         }
         this._curIndex = index;
         const sceneName = game.gameCode;
         let url = Global.RES_Root+sceneName;
         SceneManager.getInstance().changeScene(url,sceneName).then(()=>{
             DebugLog.instance.log(`串烧游戏 ${sceneName} 切换成功`);
             Global.userData.curSkewerGameData = game;
         });
     }

    /**
     * 运行下一个游戏
     */
    public runNextGame(complete:number = 1,duration:number = 40){
         // 上报游戏完成数据
         this.requestGameComplete(complete,duration);
     }

    /**
     * 外部请求游戏过关
     */
    public requestGameComplete(complete:number,duration:number){
         let curGame = this.getUnCompleteGameData();
         if(!curGame){
             DebugLog.instance.error("当前串烧游戏已经全部完成");
             return;
         }
         let curTrainData = curGame.getCurTrainData();
         let socketData = {action:this.task_complete_brain_training,data:{
                 "brain_training_id": curTrainData.brain_training_id, // 脑力训练（游戏小关）id （必填）
                 "complete": complete, // 完成度
                 "duration": duration, // 用时（秒）
                 "status": 1
             }
         };
         this.requestCompleteBrainsTrainings(socketData);
     }


    /**
     * 是否全部通关
     */
    public isRunOver():boolean{
        return this.getUnCompleteGameData() == null;
     }

    /**
     * 游戏列表中是否还有未完成得游戏
     * @private
     */
     public getUnCompleteGameData():SkewersGameData{

         let len = this._gameDatas.length;
         for(let i:number = 0;i<len;i++){
             let gameData = this._gameDatas[i];
             if(!gameData)continue;
             if(gameData.status == SkewersGameStatus.unCompleted){
                 this._curIndex = i;
                 return gameData;
             }
         }
         return null;
     }

     private getNextGameData(){
         if(!this._gameDatas)return null;
         let len = this._gameDatas.length;
         if(this._curIndex + 1 > len - 1){
             return null;
         }
         let nextGame = this._gameDatas[this._curIndex+1];
         if(!nextGame||nextGame.status == SkewersGameStatus.Completed){
             return null;
         }
         return nextGame;
     }





}
