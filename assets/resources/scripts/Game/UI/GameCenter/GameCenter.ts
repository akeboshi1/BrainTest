import { _decorator, Component, Node, Label } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { GameCenterManager } from '../../GameCenter/GameCenterManager';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { Global } from '../../../Core/Manager/Config/Global';
import { BundlePreloadEvent, BundlePreloadManager } from '../../../Core/Manager/Load/BundlePreloadManager';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { SceneManager } from '../../../Core/Manager/Scene/SceneManager';
const { ccclass, property } = _decorator;

@ccclass('GameCenter')
export class GameCenter extends BasePanel {

    // ====================== 游戏大厅
    public static NAME: string = "GameCenter";

    @property({ type: [Node] })
    gameList: Node[] = [];

    private tmpGameNames: string[] = ["找茬", '翻牌', '拼图', '捕鱼', '猜谜', '麻将组句'];


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
            let url = Global.RES_Root + BundleName.MATH24;
            DebugLog.instance.log(`${BundleName.MATH24} click perload`);
            EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
            GameCenterManager.getInstance().perload(url,BundleName.MATH24);
            return;
        }
        GameCenterManager.getInstance().startGame(index + 1, (data) => {
            if (data.status == 0) {
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
            DebugLog.instance.log(`${sceneName} click perload`);
            EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
            GameCenterManager.getInstance().perload(url,sceneName);
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


