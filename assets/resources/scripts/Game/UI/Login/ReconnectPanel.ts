import { _decorator, Label } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
const { ccclass, property } = _decorator;

@ccclass('ReconnectPanel')
export class ReconnectPanel extends BasePanel {
    static NAME: string = "ReconnectPanel";

    @property(Label)
    label: Label;

    private count: number = 0;
    private en: string = '';

    start() {

    }

    restore(data: any): void {
        if (data && data.eventName) {
            this.en = data.eventName;
            EventManager.getInstance().on(this.en, this.updateLabel,this);
        }
    }

    onDisable(): void {
        EventManager.getInstance().off(this.en, this);
    }

    update(deltaTime: number) {

    }

    private updateLabel(): void {
        this.label.string = "正在尝试重连(" + this.count + ")";
        this.count++;
    }

    async showPanel(skipTween: boolean = false): Promise<void> {

    }

    async hidePanel(): Promise<void> {

    }
}


