import { _decorator, Component, instantiate, Node, Prefab, RichText } from 'cc';
import { BasePanel } from '../../scripts/Core/UI/BasePanel';
import { UIManager } from '../../scripts/Core/Manager/UI/UIManager';
import { SmalltheaterModel } from './SmalltheaterModel';
import { StageLine } from './PlotsConfig';
const { ccclass, property } = _decorator;

@ccclass('StageLinesPanel')
export class StageLinesPanel extends BasePanel {
    static NAME: string = "StageLinesPanel";

    @property(Prefab)
    startLine: Prefab = null;

    @property(Prefab)
    endline: Prefab = null;

    @property(Prefab)
    stageline: Prefab = null;

    @property(Node)
    content: Node = null;

    onhideCallback:()=>{} = null;

    start() {

    }

    restore(data: { model: SmalltheaterModel ,onhideCallback:()=>{}}): void {
        let model = data.model;
        this.onhideCallback = data.onhideCallback;
        let stagelines = model.currentPlot.stagelines;
        let cr = model.currentPlot.character;
        this.content.addChild(instantiate(this.startLine));
        for (let i = 0; i < stagelines.length; i++) {
            let inst = instantiate(this.stageline);
            let sl: StageLine = stagelines[i];
            let str = cr[sl.character].name;
            if (sl.character == model.selectedCharacterIndex) {
                str += "（你）：\n" + sl.richTextLine;
            } else {
                str += "：\n" + sl.line;
            }
            inst.getComponent(RichText).string = str;
            this.content.addChild(inst);
        }
        this.content.addChild(instantiate(this.endline));
    }

    onClickBack() {
        UIManager.getInstance().hidePanel(StageLinesPanel.NAME);
    }

    async hidePanel(): Promise<void> {
        await super.hidePanel();
        if(this.onhideCallback){
            this.onhideCallback();
        }
    }
}


