import { _decorator, Component, Node, Label } from 'cc';
import { Global } from '../Core/Manager/Config/Global';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { SceneManager } from '../Core/Manager/Scene/SceneManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DebugLog } from '../Core/Util/DebugLog';
import { GameCenterManager } from '../Game/GameCenter/GameCenterManager';
import { BundlePreloadEvent } from '../Core/Manager/Load/BundlePreloadManager';
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { GuidePanel } from "db://assets/resources/scripts/Game/UI/Alert/GuidePanel";
const { ccclass, property } = _decorator;

@ccclass('GameCenterPageView')
export class GameCenterPageView extends Component {

    // ====================== 游戏大厅
    public static NAME: string = "GameCenter";

    @property({ type: [Node] })
    gameList: Node[] = [];

    private tmpGameNames: string[] = ["找茬", '翻牌', '拼图', '捕鱼', '猜谜', '麻将组句'];


    onLoad(){
        UIManager.getInstance().registerPanel(GuidePanel.NAME, BundleName.RESOURCES, "prefab/GuidePanel/GuidePanel", GuidePanel);
    }


    start() {
        this.gameCenterInit();
    }

    gameCenterInit() {
        let len = this.gameList.length;
        for (let i = 0; i < len; i++) {
            let gameItem = this.gameList[i];
            if (this.tmpGameNames[i] == null) {
                gameItem.active = false;
                continue;
            }
            gameItem.active = true;
        }
        this.node.active = true;

    }
    private _clickBoo = false;
    gameItemClick(event, data) {
        // 防止点击两次
        if (this._clickBoo) {
            return;
        }
        this._clickBoo = true;
        let index = Number(data);
        if(index== 6){
            let url = Global.RES_Root + BundleName.FINGERGAME;
            DebugLog.instance.log(`${BundleName.FINGERGAME} click perload`);
            EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
            GameCenterManager.getInstance().perload(url,BundleName.FINGERGAME);
            return;
        }
        GameCenterManager.getInstance().startGame(index + 1, (data) => {
            if (data.status == 0) {
                this._clickBoo = false;
                DebugLog.instance.error(data.message);
                return;
            }
            GameCenterManager.getInstance().enterGameCenter();
            DebugLog.instance.log(data);
            let gameid = data.data.game_id;
            let sceneName = "";
            switch (gameid) {
                case 1:
                    sceneName = BundleName.FINGING;
                    break;
                case 2:
                    sceneName = BundleName.FANPAI;
                    break;
                case 3:
                    sceneName = BundleName.PUZZLE;
                    break;
                case 4:
                    sceneName = BundleName.CATCHFISH;
                    break;
                case 5:
                    sceneName = BundleName.GUESSINGGAME;
                    break;
                case 6:
                    sceneName = BundleName.SENTENCEMAKING;
                    break;
                case 7:
                    sceneName = BundleName.SMALLTHEATER;
                    break;
                case 8:
                    sceneName = BundleName.MATH24;
                    break;
            }
            let url = Global.RES_Root + sceneName;
            let self = this;
            UIManager.getInstance().showPanel(GuidePanel.NAME, {
                name: sceneName, callback: () => {
                    DebugLog.instance.log(`${sceneName} click perload`);
                    EventManager.getInstance().on(SceneManager.SCENE_ENTER, self.onSceneEnter.bind(self), self, true);
                    GameCenterManager.getInstance().perload(url, sceneName);
                },exitCallback:()=>{
                    self._clickBoo = false;
                }
            });

            // BundlePreloadManager.getInstance().preload(sceneName as BundleName);

        })
    }


    private onSceneEnter() {
        DebugLog.instance.log(`onSceneEnter`);
        this._clickBoo = false;
    }



    backToCenteter() {
        SceneManager.getInstance().backToHall();
    }
    onDisable(): void {
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
    }

    update(deltaTime: number) {

    }
}


