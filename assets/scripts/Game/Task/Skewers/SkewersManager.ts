import {GameType, SkewersGameData} from "./SkewersGameData";
import {DebugLog} from "../../../Core/Util/DebugLog";
import {SceneManager} from "../../../Core/Manager/Scene/SceneManager";
import {Global} from "../../../Core/Manager/Config/Global";
import {GameState, SkewersGameStatus} from "../../../Core/Data/GameState";
import {SocketManager} from "../../../Core/Manager/Net/SocketManager";
import {SocketData} from "../../../Core/Manager/Net/SocketData";
import {EventManager} from "../../../Core/Manager/Event/EventManager";
import {director} from "cc";

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
     * 获取脑力保健任务
     * @private
     */
    private task_get_brain_trainings:string = "task.get_brain_trainings";

    /**
     * 完成脑力保健任务
     * @private
     */
    private task_complete_brain_training:string = "task.complete_brain_training";


     public init(){
           this._gameDatas = [];

     }

     start(id:number){
         Global.isSkewersGame =true;
         this.requestBranisTrainings(id);
         // this.refreshBrainsTrainings([
         //     {id:0,game_id:0,difficulty:0,seq:0,status:0,time_limit:2,game_code:"fanpai",cog_ability:GameType.Memory},
         //     {id:1,game_id:1,difficulty:0,seq:1,status:0,time_limit:2,game_code:"puzzle",cog_ability:GameType.Judgment}],this);
     }



    /**
     * 请求脑力保健任务列表
     * @param taskID
     */
     public requestBranisTrainings(taskID:number){
        EventManager.getInstance().on(this.task_get_brain_trainings,this.refreshBrainsTrainings,this);
        let requestBranisTrainingsSocket = new SocketData({action:this.task_get_brain_trainings,data:{task_id:taskID}});
        SocketManager.getInstance().send(requestBranisTrainingsSocket);
     }

     public refreshBrainsTrainings(datas:any,context:any){
         EventManager.getInstance().off(this.task_get_brain_trainings,this.refreshBrainsTrainings);
         const result = datas;
         const len = result.length;
         for(let i:number =0;i<len;i++){
              let tmpData:any = result[i];
              let data:SkewersGameData = new SkewersGameData();
              data.refreshData(tmpData);
             context._gameDatas.push(data);
         }
         Global.userData.skewerGameDatas = this._gameDatas;
         context.startGame();
     }

     public startGame(){
          if(!this._gameDatas||this._gameDatas.length <=0){
              DebugLog.instance.error("当前没有游戏可以运行");
              return;
          }
          let index = 0;
          if(!this.checkGameIndex(index))return;
          const game = this._gameDatas[index];
          this._curIndex = 0;
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
     * 指定 某index 的串烧游戏
     * @param index
     */
     public runGame(index:number=0){
         if(!this._gameDatas||this._gameDatas.length <=0){
             DebugLog.instance.error("当前没有游戏可以运行");
             return;
         }
         if(!this.checkGameIndex(index))return;
         const game:SkewersGameData = this._gameDatas[index];
         this._curIndex = index;
         const sceneName = game.gameCode;
         let url = Global.RES_Root+sceneName;
         SceneManager.getInstance().changeScene(url,sceneName).then(()=>{
             DebugLog.instance.log(`串烧游戏 ${sceneName} 切换成功`);
             Global.userData.curSkewerGameData = game;
         });
     }

     public runNextGame(){
         if(!this._gameDatas||this._gameDatas.length <=0){
             DebugLog.instance.error("当前没有游戏可以运行");
             return;
         }
         if(!this.checkGameIndex(this._curIndex+1)
             ||this._curIndex + 1 > this._gameDatas.length - 1){
             // back to hall test
             director.loadScene("start");
             DebugLog.instance.log("当前串烧游戏已经全部完成");
             Global.isSkewersGame = false;
             return;
         }

         this._curIndex +=1;
         const game:SkewersGameData = this._gameDatas[this._curIndex];
         const sceneName = game.gameCode;
         let url = Global.RES_Root+sceneName;
         SceneManager.getInstance().changeScene(url,sceneName).then(()=>{
             DebugLog.instance.log(`串烧游戏 ${sceneName} 切换成功`);
             Global.userData.curSkewerGameData = game;
         });
     }


     private checkGameIndex(index:number = 0):boolean{
         let game:SkewersGameData = this._gameDatas[index];
         if(!game){
             DebugLog.instance.error(`索引为 ${index} 数据不存在`);
             return false;
         }
         if(game.status == SkewersGameStatus.Completed){
             DebugLog.instance.error(`索引为 ${index} 游戏已经运行完成`);
             return false;
         }
         return true;
     }





}
