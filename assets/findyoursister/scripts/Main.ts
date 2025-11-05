import { _decorator, Node, Label, Sprite, SpriteFrame, assetManager } from 'cc';
import { TimerCommonComponent } from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { SettlementPanel } from "db://assets/resources/scripts/Core/UI/SettlementPanel";
import { BundleName } from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { FindYourSisterModel } from './FindYourSisterModel';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends BaseScene<IBaseGameChild> {

    @property(Label)
    questionLabel: Label = null;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;

    @property(Node)
    cardPool: Node;

    private itemNodes: Node[] = [];

    private itemSpritesData: SpriteFrame[] = [];

    private model: FindYourSisterModel = null;

    protected bundleName: string = BundleName.FINDYOURSISTER;

    onLoad(): void {
        this.loadAudio().then(() => {
            // this.playBgmAudio("music/findSister_bgm", true);
        });

        this.model = FindYourSisterModel.getInstance();
        this.model.setHardIndex(0);

        // 注册结算面板
        UIManager.getInstance().registerPanel(SettlementPanel.NAME, BundleName.RESOURCES, "prefab/settlementPanel/settlementPanel", SettlementPanel);

    }


    start() {
        super.start();

        let itemLen = this.model.hards[this.model.hardIndex];
        for (let i = 1; i <= itemLen; i++) {
            const itemName = `item${i}`;
            const itemNode = this.cardPool.getChildByName(itemName);
            if (itemNode) {
                itemNode.active = false;
                this.itemNodes.push(itemNode);
            }
        }
        this.sceneInit();
    }

    sceneInit() {
        super.sceneInit();
        if(this.itemNodes.length > 0){
            for (let i = 0; i < this.itemNodes.length; i++) {
                const itemNode = this.itemNodes[i];
                itemNode.active = false;
            }
        }
        this.refreshView();

    }

    refreshView() {
        let imageDatas = this.model.getImageDatas();
        let len = imageDatas.length;
        for (let i = 0; i < len; i++) {
            const itemNode = this.itemNodes[i];
            itemNode.active = true;
            const itemSprite = itemNode.getComponent(Sprite);
            const imageData = this.model.getImageDatas()[i];
            let imagePath = imageData.path;
            // 这里加载图片
            const bundle = assetManager.getBundle(this.bundleName);
            bundle.load(imagePath + "/spriteFrame", SpriteFrame, (err, sp) => {
                if (err) {
                    DebugLog.instance.error(err);
                    return;
                }
                itemSprite.spriteFrame = sp;
            })
        }
    }

    itmeClick(event, data) {
        const index = Number(data);
        DebugLog.instance.log("itemClick", index);
    }

}


