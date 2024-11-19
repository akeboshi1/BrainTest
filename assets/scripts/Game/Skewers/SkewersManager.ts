import {GameType, SkewersGameData} from "./SkewersGameData";
import {DebugLog} from "../../Core/Util/DebugLog";
import {SceneManager} from "../../Core/Manager/Scene/SceneManager";
import {Global} from "../../Core/Manager/Config/Global";
import {GameState} from "../../Core/Data/GameState";

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


     public init(){
           this._gameDatas = [];
           Global.isSkewersGame =true;
           this.refreshData([
               {hard:1,durTime:2,count:2,code:"puzzle",type:GameType.Judgment},
               {hard:1,durTime:2,count:1,code:"fanpai",type:GameType.Memory},
               {hard:1,durTime:2,count:1,code:"puzzle",type:GameType.Judgment}]);
     }

     public refreshData(datas:any){
          const len = datas.length;
          for(let i:number =0;i<len;i++){
              let tmpData:any = datas[i];

              let count = tmpData.count;
              for(let j:number =0;j<count;j++){
                  let data:SkewersGameData = new SkewersGameData();
                  data.refreshData(tmpData);
                  this._gameDatas.push(data);
              }
              // switch (tmpData.gameID){
              //     case GameSceneConst.Fanpai:
              //         data.sceneName = "fanpai";
              //         break;
              //     case GameSceneConst.Pintu:
              //         data.sceneName = "puzzle";
              //         break;
              //     case GameSceneConst.Finding:
              //         data.sceneName = "finding";
              //         break;
              // }
          }
          this.startGame();
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
          const sceneName = game.sceneName;
          let url = Global.RES_Root+sceneName;
          SceneManager.getInstance().changeScene(url,sceneName).then((scene)=>{
              DebugLog.instance.log(`串烧游戏 ${sceneName} 开始`);
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
         const sceneName = game.sceneName;
         let url = Global.RES_Root+sceneName;
         SceneManager.getInstance().changeScene(url,sceneName).then(()=>{
             DebugLog.instance.log(`串烧游戏 ${sceneName} 切换成功`)
         });
     }

     public runNextGame(){
         if(!this._gameDatas||this._gameDatas.length <=0){
             DebugLog.instance.error("当前没有游戏可以运行");
             return;
         }
         if(!this.checkGameIndex(this._curIndex+1))return;
         if(this._curIndex + 1 > this._gameDatas.length - 1){
             DebugLog.instance.log('当前串烧游戏已经全部完成')
             return;
         }
         this._curIndex +=1;
         const game:SkewersGameData = this._gameDatas[this._curIndex];
         const sceneName = game.sceneName;
         let url = Global.RES_Root+sceneName;
         SceneManager.getInstance().changeScene(url,sceneName).then(()=>{
             DebugLog.instance.log(`串烧游戏 ${sceneName} 切换成功`)
         });
     }


     private checkGameIndex(index:number = 0):boolean{
         let game:SkewersGameData = this._gameDatas[index];
         if(!game){
             DebugLog.instance.error(`索引为 ${index} 数据不存在`);
             return false;
         }
         if(game.gameState == GameState.over){
             DebugLog.instance.error(`索引为 ${index} 游戏已经运行完成`);
             return false;
         }
         return true;
     }





}
