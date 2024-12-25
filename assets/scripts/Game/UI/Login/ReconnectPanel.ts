import { _decorator, Label } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
const { ccclass, property } = _decorator;

@ccclass('ReconnectPanel')
export class ReconnectPanel extends BasePanel {
    static NAME: string = "ReconnectPanel";

    @property(Label)
    label: Label;

    private count: number = 0;
    private et: EventTarget = null;
    private en: string = '';

    start() {

    }

    restore(data: any): void {
        if (data && data.eventTarget && data.eventName) {
            this.et = data.eventTarget;
            this.en = data.eventName;
            this.et.addEventListener(this.en, this.updateLabel.bind(this));
        }
    }

    onDisable(): void {
        if (this.et) {
            this.et.removeEventListener(this.en, this.updateLabel.bind(this));
        }
    }

    update(deltaTime: number) {

    }

    private updateLabel(): void {
        this.label.string = "正在尝试重连(" + this.count + ")";
        this.count++;
    }

    async showPanel(): Promise<void> {

    }

    async hidePanel(): Promise<void> {

    }
}


