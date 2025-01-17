import LayerPanel, {UrlInfo} from "../../Common/manage/Layer/LayerPanel";
import PanelMgr, {Layer} from "../../Common/manage/PanelMgr";
import CacheMgr from "../../Common/manage/CacheMgr";
import GameConfig from "../Game/GameConfig";
import LoadMgr from "../../Common/manage/LoadMgr";
import Tools from "../../Common/Tools";
import AudioMgr from "../../Common/manage/AudioMgr";
import HintPrefab from "../Game/HintPrefab";
import EndView from "./EndView";
import Constant from "../../Common/Constant";
import {
    _decorator,
    Color,
    instantiate,
    Label,
    Node,
    ParticleAsset,
    ParticleSystem2D,
    Prefab,
    Rect,
    Sprite,
    tween,
    UIOpacity,
    UITransform,
    Vec3
} from "cc";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {SkewersManager} from "db://assets/scripts/Game/Task/Skewers/SkewersManager";
import {GameCenterManager} from "db://assets/scripts/Game/GameCenter/GameCenterManager";
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
import {TimeUtil} from "db://assets/scripts/Core/Util/TimeUtil";
import {AlertType} from "db://assets/scripts/Game/UI/Alert/GameAlert";
import {ColorUtil} from "db://assets/scripts/Core/Util/ColorUtil";
import {GuideManager, GuideState} from "db://assets/scripts/Core/Manager/Guide/GuideManager";
import {FindingGuide} from "db://assets/scripts/Core/Manager/Guide/game/FindingGuide";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";
import {UIManager} from "db://assets/scripts/Core/Manager/UI/UIManager";
import {GenerateReport} from "db://assets/scripts/Game/UI/PersonalCenter/GenerateReport";
import FindingGlobal from "db://assets/finding/script/Common/FindingGlobal";
import HomeView from "db://assets/finding/script/Moudle/View/HomeView";
import {GameType} from "db://assets/scripts/Game/Task/Skewers/SkewersGameData";

const {ccclass,property} = _decorator;

@ccclass
export default class GameView extends LayerPanel {
    public static getUrl(): UrlInfo {
        return {
            bundle: "gameView",
            name: "View/gameView/prefab/gameView",
        }
    }

    private picture1: Node = null;

    private picture2: Node = null;

    private pictureList: Node[] = [];

    private frameList = [];

    private framePostions : Vec3[]=[];

    private errNode: Node = null;

    private resultList = [];

    private resultNode: Node = null;

    private countDownLabel: Node = null;

    private countDownTime: number = null;

    private countDown = null;

    private progress: Node = null;

    private progressSprite: Sprite = null;

    private hintData = null;

    private hintRoundNode1: Node = null;

    private hintRoundNode2: Node = null;

    private interval: number = 0;

    private hintIndex: number = 0;

    private isStartCount: boolean = false;

    private reminderNode: Node = null;

    private customsNode: Node = null;

    private victory: Node = null;

    @property(Node)
    private backNode: Node = null;

    private clockTime: number = null;

    private plistNode: Node = null;

    private tempList = [];

    private tempCountDown: number = null;

    private canAddTime: boolean = false;

    private gameOver: boolean = false;

    private pause: boolean = false;

    private _curHard:number = 0;

    private _curCount :number = 0;
    private _maxCount:number = 0;

    /**
     * 找茬个数
     * @private
     */
    private _counts = [3,4,5];

    private _checkPoint = 0;
     initUI():Promise<void> {
         return new Promise(async resolve => {
             this.framePostions = [];
             this._startTime = TimeUtil.getNow();
             this.canAddTime = true;
             this.picture1 = this.getNode("pictureBg/mask/picture");
             this.pictureList.push(this.picture1);
             this.picture2 = this.getNode("picture2Bg/mask/picture");
             this.pictureList.push(this.picture2);
             this.resultNode = this.getNode("resultList");
             this.countDownLabel = this.getNode("countDown/Label");
             this.countDown = this.countDownLabel.getComponent(Label);
             this.countDownTime = GameConfig.customTime;
             this.tempCountDown = GameConfig.allTime;
             this.progress = this.getNode("countDown/progress");
             this.progressSprite = this.progress.getComponent(Sprite);
             this.customsNode = this.getNode("customs/Label");
             this.victory = this.getNode("victory");
             this.victory.active = false;
             this.plistNode = this.getNode("caidai");
             this.plistNode.active = false;
             this._checkPoint = CacheMgr.checkpoint;
             let loopLevel = 0;
             if (Global.isSkewersGame) {
                 this._curHard = Global.userData.curSkewerGameData.difficulty;
                 // test code
                 loopLevel = FindingGlobal.curSkewersGameIndex;
                 this._checkPoint = loopLevel % GameConfig.allCheckPoint;
                 this.customsNode.getComponent(Label).string = "第" + Global.userData.curSkewerGameData.seq + "关";
                 this.tempCountDown = Global.userData.curSkewerGameData.timeLimit;
                 this.countDownTime = Global.userData.curSkewerGameData.timeLimit;
             } else {
                 let _level = CacheMgr.checkpoint;
                 this._checkPoint = CacheMgr.checkpoint = _level;
                 if (_level % 3 == 0) {
                     if (_level == 0) {
                         this._curHard = 1;
                     } else {
                         this._curHard = 3;
                     }
                 } else {
                     this._curHard = _level % 3;
                 }

                 loopLevel = this._checkPoint % GameConfig.allCheckPoint;
                 if (loopLevel == 0) loopLevel = GameConfig.allCheckPoint;
                 let customCount;
                 if (loopLevel == GameConfig.allCheckPoint) {
                     customCount = 1;
                 } else {
                     customCount = loopLevel;
                 }
                 this.customsNode.getComponent(Label).string = "第" + this._checkPoint + "关";
             }
             this._curCount = 0;
             this._maxCount = this._counts[this._curHard - 1];


             let _level = GameConfig.level_order[loopLevel - 1];
             let bundleName = "level"+_level;
             let imageName = GameConfig.image_name.get(_level);
             let pictureSprite1 = this.picture1.getComponent(Sprite);
             let pictureSprite2 = this.picture2.getComponent(Sprite);
             LoadMgr.loadSprite(pictureSprite1, bundleName + `/image/${imageName}_1_32`).then();
             LoadMgr.loadSprite(pictureSprite2, bundleName + `/image/${imageName}_2_32`).then();
             let tmpDatas = GameConfig.level_rect.get(`${imageName}`);
             let tmpDataList = tmpDatas.split("|");
             let len = tmpDataList.length;
             // let custData = GameConfig.level_data[loopLevel - 1];
             // let sizeData = GameConfig.level_data_size[loopLevel - 1];
             let uitransform = this.picture1.getComponent(UITransform)
             for (let i = 0; i < len; i++) {
                 let node: Node = new Node();
                 let nodeUITransform = node.addComponent(UITransform);
                 let tempData = tmpDataList[i].split(",");
                 // 左上角
                 nodeUITransform.width = Number(tempData[2]);
                 nodeUITransform.height = Number(tempData[3]);
                 node.setPosition(Number(tempData[0])*1.5, uitransform.height - Number(tempData[1])*1.5);
                 nodeUITransform.setAnchorPoint(0,1);

                 // nodeUITransform.width = sizeData[i].w;
                 // nodeUITransform.height = sizeData[i].h;
                 node.setScale(1.4,1.4);
                 // node.setPosition(custData[i].x * 1.5, custData[i].y * 1.5)


                 // let sprite = node.addComponent(Sprite);
                 // LoadMgr.loadSprite(sprite, bundleName + "/image/" + String(i)).then()
                 // sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                 // sprite.color = ColorUtil.hexToColor("rgba(230,237,7,0.8)");
                 nodeUITransform.convertToWorldSpaceAR(node.position);
                 this.framePostions.push(node.position);
                 this.picture1.addChild(node);
                 this.frameList.push(nodeUITransform.getBoundingBox());
                 this.frameList[i].id = i + 1;
             }
            if (this._checkPoint == 1) {
                 this.newHandHint();
            }

             for (let j = 0; j < this.resultNode.children.length; j++) {
                 let children = this.resultNode.children[j].getChildByName("right");
                 children.active = false;
                 if (j >= this._maxCount) {
                     this.resultNode.children[j].active = false;
                 }
             }
             resolve();
         })
    }

    private backHandler() {
        this.pause = true;
        FindingGlobal.reset();
        if(Global.isSkewersGame){
            let maxCount =  Global.userData.curSkewerGameData.length;
            let curCount = Global.userData.curSkewerGameData.seq - 1;
            SkewersManager.getInstance().quitGame(this.node,curCount,maxCount,this.goonCallBack,this.exitCallBack,this);
        }else{
            GameCenterManager.getInstance().quitGame(this.node,this.goonCallBack,this.exitCallBack,this);
        }
    }



    private goonCallBack(context){
        if(Global.isSkewersGame) {
            if(!SkewersManager.getInstance().isRunOver()){
                context.pause = false;
            }else{
                context.exitCallBack();
            }
        }else{
            context.pause = false;
        }
    }

    show(param: any): void {
         this.tempList = [];
        this.clockTime = GameConfig.clockTime;
        if(this._checkPoint !=1)this.monitorEvent();
    }

    public newHandHint() {
        console.log("进入新手提示");
        // this.monitorEvent();
        EventManager.getInstance().on(FindingGuide.GUIDE_FIND_EMIT,this.guideClick.bind(this),this);
        EventManager.getInstance().on(FindingGuide.GUIDE_FIND_END,this.guideEND.bind(this),this);
        GuideManager.getInstance().start(FindingGuide.NAME,{root:this.picture1,data:this.frameList,count:this._maxCount-1});
        // this.clickHint(false);
    }

    private guideClick(data){
         console.log(data);
         this.onTouchDown(data);
    }

    private guideEND(data){
        this.onTouchDown(data);
        this.monitorEvent();
    }

    update(dt) {
         if(this.pause)return;
        this.gameCountDown(dt);
        this.hintCountDown(dt);
        this.countDownClockTime(dt);
    }

    public countDownClockTime(dt) {
        if (this.clockTime == null) return;
        if (this.gameOver) return;
        if (Math.ceil(this.clockTime) <= 0) {
            this.clockTime = GameConfig.clockTime;
            AudioMgr.play("sub/audio/view/game/clock").then()
        }
        this.clockTime -= dt;
    }

    public gameCountDown(dt) {
        if (this.countDownTime == null) return;
        if (this.pause) return;
        if (this.gameOver) return;
        if (Math.ceil(this.countDownTime) <= 0) {
            this.countDown.string = "0";
            this.progressSprite.fillRange = 0;
            this.closeGame(false);
            this.gameOver = true;
            this.canAddTime = false;

            return;
        }
        this.countDownTime -= dt;
        this.countDown.string = Math.ceil(this.countDownTime) + "";
        let plan = this.countDownTime / this.tempCountDown;
        this.progressSprite.fillRange = plan;
    }

    hintCountDown(dt) {
         if (!this.isStartCount) return;
        if (!this.isStartCount) return;
        if (this.interval >= 10) {
            this.isStartCount = false;
            this.interval = 0;
            this.hintIndex = 0;
        }
        this.interval += dt;
    }

    public clickAddTime() {
        if (!this.canAddTime) return;
        this.pause = true;
        let addTimeCount = CacheMgr.addTime;
        if (addTimeCount <= 0) {
            Tools.handleVideo(Constant.VIDEO_TYPE.GET_PROPS).then((res) => {
                if (res) {
                    this.handler_addTime();
                    this.pause = false;
                }else {
                    this.pause = false;
                }
            })
        } else {
            CacheMgr.addTime = addTimeCount - 1;
            this.handler_addTime();
        }
    }

    public handler_addTime() {
        this.countDownTime += 60;
        this.tempCountDown += 60;
    }

    public clickHint(isCut) {
         return;
        // if (this.hintData != null) return;
        // this.pause = true;
        // let hint = CacheMgr.hint;
        // for (let i = 0; i < this.frameList.length; i++) {
        //     if (!this.frameList[i].dot) {
        //         if (isCut) {
        //             if (hint <= 0) {
        //                 Tools.handleVideo(Constant.VIDEO_TYPE.GET_PROPS).then((res) => {
        //                     if (res) {
        //                         this.pause = false;
        //                         this.handler_hint(i);
        //                     }else{
        //                         this.pause = false;
        //                     }
        //                 })
        //             } else {
        //                 CacheMgr.hint = hint - 1;
        //                 this.handler_hint(i)
        //             }
        //         } else {
        //             this.handler_hint(i)
        //         }
        //         break;
        //     }
        // }
    }

    public handler_hint(i) {
        let url = "sub/image/view/gameView/public/hint";
        this.hintData = this.frameList[i];
        for (let j = 0; j < this.pictureList.length; j++) {
            if (j == 0) {
                this.hintRoundNode1 = this.createRound(i, j, url, 120);
            } else {
                this.hintRoundNode2 = this.createRound(i, j, url, 120);
            }
        }
    }

    public monitorEvent() {
        if(this.picture1){
            this.picture1.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
            this.picture1.on(Node.EventType.TOUCH_START, this.onTouchDown, this);
        }
        if(this.picture2){
            this.picture2.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
            this.picture2.on(Node.EventType.TOUCH_START, this.onTouchDown, this);
        }
    }

    public removeMonitorEvent() {
        if(this.picture1){
            this.picture1.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
        }
        if(this.picture2){
            this.picture2.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
        }
    }

    public onDisable(){
        if(this.picture1)this.picture1.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
        if(this.picture2)this.picture2.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
        EventManager.getInstance().off(FindingGuide.GUIDE_FIND_EMIT,this);
        EventManager.getInstance().off(FindingGuide.GUIDE_FIND_END,this);
    }

    public onTouchDown(event) {
        if (this.gameOver||this.resultList.length == this._maxCount) return;
        let clickPos;
        let url = "sub/image/view/gameView/public/rightRound";
         if(!event.target && GuideManager.getInstance().curGuide && GuideManager.getInstance().curGuide instanceof FindingGuide == true && GuideManager.getInstance().curGuide.state ==  GuideState.processing){
             if(Global.isSkewersGame){
             }else{
                  GameCenterManager.getInstance().gameMatch(GameCenterManager.getInstance().currentGame.sessionid, () => { });
             }
             AudioMgr.play("sub/audio/view/game/right", 1, false).then()
             let destroyHint = () => {
                this.hintData = null;
                if (this.hintRoundNode1) {
                             this.hintRoundNode1.destroy();
                             this.hintRoundNode1 = null;
                }
                if (this.hintRoundNode2) {
                             this.hintRoundNode2.destroy();
                             this.hintRoundNode2 = null;
                }
              }
              let isDestroy = true;
              let i = event.i;
              if (this.tempList.length == 0) isDestroy = true;
              for (let j = 0; j < this.tempList.length; j++) {
                  if (this.frameList[i].id == this.tempList[j]) {
                      isDestroy = false;
                      break;
                  }
              }
              if (isDestroy) destroyHint();
              if (this.frameList[i].dot) return;
              this.frameList[i].dot = true;
              this.resultList.push(i);
              for (let j = 0; j < this.pictureList.length; j++) {
                  this.createRound(i, j, url, 70);
              }
              this.createHintPrefab();
              clickPos = event.pos;
              this.createParticle(clickPos);
              this.tempList.push(this.frameList[i].id);
              return;
         }

         if(!event.target){
             return;
         }


        clickPos =  event.getUILocation();
        let target: Node = event.target;

        let targetUITransform = target.getComponent(UITransform);
        if(!targetUITransform){
            targetUITransform = target.addComponent(UITransform);
        }
        let nodePos = targetUITransform.convertToNodeSpaceAR(new Vec3(clickPos.x,clickPos.y,0));
        let rect = new Rect(nodePos.x, nodePos.y, GameConfig.checkArea, GameConfig.checkArea);
        rect.x -= GameConfig.checkArea / 2;
        rect.y -= GameConfig.checkArea / 2;
        let isRight: boolean = false;
        for (let i = 0; i < this.frameList.length; i++) {
            let checkRect = this.frameList[i];
            let isClick = rect.intersects(checkRect);
            if (isClick) {
                if(Global.isSkewersGame){

                }else{
                    GameCenterManager.getInstance().gameMatch(GameCenterManager.getInstance().currentGame.sessionid, () => { });
                }
                isRight = true;
                AudioMgr.play("sub/audio/view/game/right", 1, false).then()
                let destroyHint = () => {
                    this.hintData = null;
                    if (this.hintRoundNode1) {
                        this.hintRoundNode1.destroy();
                        this.hintRoundNode1 = null;
                    }
                    if (this.hintRoundNode2) {
                        this.hintRoundNode2.destroy();
                        this.hintRoundNode2 = null;
                    }

                }
                let isDestroy = true;
                if (this.tempList.length == 0) isDestroy = true;
                for (let j = 0; j < this.tempList.length; j++) {
                    if (this.frameList[i].id == this.tempList[j]) {
                        isDestroy = false;
                        break;
                    }
                }
                if (isDestroy) destroyHint();
                if (this.frameList[i].dot) break;
                this.frameList[i].dot = true;
                this.resultList.push(i);
                for (let j = 0; j < this.pictureList.length; j++) {
                    this.createRound(i, j, url, 70);
                }
                this.createHintPrefab();
                this.createParticle(clickPos);
                this.tempList.push(this.frameList[i].id);
                break;
            }
        }
        if (!isRight) {
            if (this.errNode != null) {
                this.errNode.destroy();
                this.errNode = null;
                this.createErr(clickPos);
            } else {
                this.createErr(clickPos)
            }
        }
    }

    private _startTime:number=0
    private _endTime: number = 0;
    private requestGameResult(){
        // 上报数据
        let complete =this.resultList.length/this._maxCount;//this.resultNode.children.length;
        let duration= (this._endTime - this._startTime - this._pauseDurTime)/1000;
        SkewersManager.getInstance().requestGameComplete(complete,duration);
    }

    private WinRequestSkewerGameComplete(data){
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this);
        this.updateSkewersGameList();
        let trainid = data;
        let trainData = SkewersManager.getInstance().getTrainData(trainid);
        let maxCount = trainData.parentSkewersGameData.trains.length;
        let curCount = trainData.seq;

        // 游戏内界面提示
        if(maxCount != curCount){
            SkewersManager.getInstance().showGameAlert(this.node,AlertType.Normal,SkewersManager.getInstance().singleCompleteStr,"",curCount,maxCount,this.alertGoonHandler,this.exitCallBack,this);
        }else{
            if (!SkewersManager.getInstance().isRunOver()) {
                SkewersManager.getInstance().showGameAlert(this.node,AlertType.Sucess_Small, SkewersManager.getInstance().currentSkewersCompleteGameStr, SkewersManager.getInstance().singleCompleteStr,0,0,this.nextAlertHandler,this.exitCallBack,this);
            }else{
                SkewersManager.getInstance().showGameAlert(this.node,AlertType.Sucess_Big,SkewersManager.getInstance().totalCompleteStr,SkewersManager.getInstance().totalBrainScore,0,0,this.totalCompete,this.remoteClick,this);
            }
        }
    }

    private updateSkewersGameList(){
        //筛选出未处理过的图片
        FindingGlobal.skewersGameList = GameConfig.level_order.filter(num => num != FindingGlobal.curSkewersGameIndex);
    }

    private remoteClick(){
        this.exitCallBack(this);
        UIManager.getInstance().showPanel(GenerateReport.NAME);
    }

    private failRequestSkewersGameComplete(data){
        this.updateSkewersGameList();
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this)
        let trainData = SkewersManager.getInstance().getTrainData(data);//SkewersManager.getInstance().getUnCompleteGameData();
        let maxCount = trainData.length;
        let curCount = trainData.seq<0?0:trainData.seq;
        if(curCount == maxCount){
            SkewersManager.getInstance().showGameAlert(this.node,AlertType.Normal,SkewersManager.getInstance().failCompleteStr,"",curCount,maxCount,this.failCompleteHandler,this.exitCallBack,this);
        }else{
            SkewersManager.getInstance().showGameAlert(this.node,AlertType.Normal,SkewersManager.getInstance().failCompleteStr,"",curCount,maxCount,this.alertGoonHandler,this.exitCallBack,this);
        }
    }

    private failCompleteHandler(context){
        context.pause = true;
        context._pauseStartTime = TimeUtil.getNow();
        if (!SkewersManager.getInstance().isRunOver()) {
            SkewersManager.getInstance().showGameAlert(context.node,AlertType.Sucess_Small, SkewersManager.getInstance().currentSkewersCompleteGameStr, SkewersManager.getInstance().singleCompleteStr,0,0,context.nextAlertHandler,context.exitCallBack,context);
        }else{
            SkewersManager.getInstance().showGameAlert(context.node,AlertType.Sucess_Big,SkewersManager.getInstance().totalCompleteStr,SkewersManager.getInstance().totalBrainScore,0,0,context.totalCompete,context.remoteClick,context);
        }
    }

    private totalCompete(context){
        context.pause = false;
        context._pauseDurTime += context._pauseEndTime - TimeUtil.getNow();
        AudioMgr.audioSource.stop();
        SkewersManager.getInstance().exitCallBack();
    }

    private alertGoonHandler(context){
        context.pause = false;
        context._pauseDurTime += context._pauseEndTime - TimeUtil.getNow();
        AudioMgr.audioSource.stop();
        if (!SkewersManager.getInstance().isRunOver()) {
            SkewersManager.getInstance().runNextGame();
        }else{
            SkewersManager.getInstance().exitCallBack();
        }
    }

    private _pauseStartTime:number = 0;
    private _pauseDurTime:number = 0;
    private nextAlertHandler(context){
        context.pause = true;
        context._pauseStartTime = TimeUtil.getNow();
        SkewersManager.getInstance().showGameAlert(context.node,AlertType.Next,SkewersManager.getInstance().nextSkewersGameStr,'',0,0,context.alertGoonHandler,context.exitCallBack,context);
    }

    private exitCallBack(context){
        context.pause = false;
        AudioMgr.audioSource.stop();
        PanelMgr.INS.closePanel(GameView);
        FindingGlobal.reset();
        if(Global.isSkewersGame){
            SkewersManager.getInstance().exitCallBack();
        }else{
            GameCenterManager.getInstance().exitCallBack();
        }
    }


    public closeGame(isWin) {
        if (this.gameOver) return;
        this.removeMonitorEvent();
        if (isWin) {
            this.victory.active = true;
        }
        // 上报游戏数据
        this._endTime = TimeUtil.getNow();
        if(Global.isSkewersGame){
            EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,isWin?this.WinRequestSkewerGameComplete:this.failRequestSkewersGameComplete,this);
            this.requestGameResult();
        }else{
            const curGame = GameCenterManager.getInstance().currentGame;
            let duration= (this._endTime - this._startTime - this._pauseDurTime)/1000;
            GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, this.resultList.length, CacheMgr.checkpoint,
                this.resultList.length / this._maxCount, duration, GameConfig.customTime, this._curHard, () => { });

            setTimeout(() => {
                PanelMgr.INS.openPanel({
                    layer: Layer.gameLayer,
                    panel: EndView,
                    param: {
                        residue: 1,
                        isWin: isWin,
                        residueTime: this.countDownTime
                    }
                }).then(() => {
                    PanelMgr.INS.closePanel(GameView);
                })
            },1500);
        }
    }

    public createHintPrefab() {
        if (this.reminderNode) {
            this.reminderNode.destroy();
            this.reminderNode = null;
        }
        LoadMgr.loadPrefab(GameConfig.prefabData[this.hintIndex]).then((prefab: Prefab) => {
            let node = instantiate(prefab);
            this.node.addChild(node);
            let script = node.getComponent(HintPrefab);
            script.playSound(GameConfig.soundData[this.hintIndex]);
            this.hintIndex += 1;
            this.isStartCount = true;
            this.interval = 0;
            this.reminderNode = node;
        })
    }

    public createParticle(clickPos) {
        let result = this.resultList.length;
        if (this.resultList.length == this._maxCount) {
            this.plistNode.active = true;
            AudioMgr.play("sub/audio/view/game/sahua").then();
        }
        let resultNode = this.resultNode.children[result - 1];
        let resultParentNodeUITransform = resultNode.parent.getComponent(UITransform);
        if(!resultParentNodeUITransform){
            resultParentNodeUITransform = resultNode.parent.addComponent(UITransform);
        }
        let nodeUITransform = this.node.getComponent(UITransform);
        if(!nodeUITransform){
            nodeUITransform = this.node.addComponent(UITransform);
        }
        let resultPos = resultNode.getPosition();
        let resultWorldPos = resultParentNodeUITransform.convertToWorldSpaceAR(resultPos);
        let targetNodePos = nodeUITransform.convertToNodeSpaceAR(resultWorldPos);
        let pos = nodeUITransform.convertToNodeSpaceAR(new Vec3(clickPos.x, clickPos.y,0));
        let node = new Node();
        node.name = "particle";
        node.setPosition(pos);
        let particleComp: ParticleSystem2D = node.addComponent(ParticleSystem2D);
        let particleUrl = "sub/image/view/gameView/particle/win";
        LoadMgr.loadParticle(particleUrl).then((particle: ParticleAsset) => {
            particleComp.file = particle;
        })
        this.node.addChild(node);
        tween(node)
            .to(0.5, {position:new Vec3(targetNodePos.x,targetNodePos.y)})
            .call(() => {
                let children = resultNode.getChildByName("right")
                children.active = true;
                this.checkResult();
                let checkPoint = CacheMgr.checkpoint;
                if (checkPoint == 1) {
                    this.clickHint(false);
                }
                setTimeout(() => {
                    node.destroy();
                }, 200)
            })
            .start()
    }


    public createRound(index1, index2, url, dia) {
        let node: Node = new Node();
        let nodeUITransform = node.addComponent(UITransform);
        nodeUITransform.width = dia;
        nodeUITransform.height = dia;
        //矩形是从左下角为锚点
        let diffX = this.frameList[index1].width / 2;
        let diffY = this.frameList[index1].height / 2;
        node.setPosition(this.frameList[index1].x + diffX, this.frameList[index1].y + diffY)
        nodeUITransform.setAnchorPoint(0.5, 0.5)
        node.setScale(new Vec3(2,2,2));
        let sprite: Sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        LoadMgr.loadSprite(sprite, url).then();
        this.pictureList[index2].addChild(node);
        // 推送数据

        return node;
    }

    public createErr(clickPos) {
        this.isStartCount = false;
        this.interval = 0;
        this.hintIndex = 0;
        AudioMgr.play("sub/audio/view/game/err", 1, false).then();
        let node: Node = new Node();
        let nodeUITransform = node.addComponent(UITransform);
        nodeUITransform.width = 60;
        nodeUITransform.height = 60;
        let gameViewUITransform = this.node.getComponent(UITransform);
        if(!gameViewUITransform){
            gameViewUITransform = this.node.addComponent(UITransform);
        }
        let gameViewPos = gameViewUITransform.convertToNodeSpaceAR(new Vec3(clickPos.x, clickPos.y,0));
        node.setPosition(gameViewPos);
        nodeUITransform.setAnchorPoint(0.5, 0.5);
        let sprite: Sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        LoadMgr.loadSprite(sprite, "sub/image/view/gameView/public/err").then();
        node.setScale(1.6,1.6);
        this.node.addChild(node);
        this.errNode = node;
        let opacityComponent = node.getComponent(UIOpacity);
        if(!opacityComponent){
            opacityComponent = node.addComponent(UIOpacity);
        }
        tween(opacityComponent)
            .to(1.5, {opacity: 0})
            .call(() => {
                node.destroy();
            })
            .start()
        let count: Node = new Node();
        count.setPosition(gameViewPos);
        let countTransform = count.addComponent(UITransform);
        countTransform.setAnchorPoint(0.5, 0.5);
        let countSprite = count.addComponent(Sprite);
        countSprite.color = new Color(255, 0, 0, 255);
        let str = count.addComponent(Label);
        str.string = "-10";
        str.fontSize = 40;
        this.node.addChild(count);
        let countDownLabelUITransform = this.countDownLabel.getComponent(UITransform);
        if(!countDownLabelUITransform){
            countDownLabelUITransform = this.countDownLabel.addComponent(UITransform);
        }
        let resultPos = countDownLabelUITransform.convertToWorldSpaceAR(this.countDownLabel.getPosition());
        let countParentUITransform = count.parent.getComponent(UITransform);
        if(!countParentUITransform){
            countDownLabelUITransform = count.parent.addComponent(UITransform);
        }
        let nodePos = countParentUITransform.convertToNodeSpaceAR(resultPos);
        tween(count)
            .to(1, {position:new Vec3(nodePos.x,nodePos.y)})
            .call(() => {
                count.destroy();
                this.countDownTime -= 10;
            })
            .start()
    }

    public checkResult() {
        if (this.resultList.length == this._maxCount) {
            this.closeGame(true);
            this.gameOver = true;
        }
    }

    hide() {
    }
}

