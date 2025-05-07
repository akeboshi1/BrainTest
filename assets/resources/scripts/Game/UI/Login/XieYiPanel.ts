import { _decorator, Component, Node, WebView } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { update } from '../../../../../../extensions/build-plugin-bundle-versions/source/panel';
const { ccclass, property } = _decorator;

@ccclass('XieYiPanel')
export class XieYiPanel extends BasePanel {
    @property(WebView)
    webView: WebView;

    private url:string;

    restore(data: { url: string }): void {
        if (data) {
            this.url = data.url;
            console.log("XieYiPanel restore", data.url);
        }
    }

    start() {
        this.webView.url = this.url;
    }

    update(deltaTime: number) {
        
    }
    backToPrant(){
        UIManager.getInstance().hidePanel(XieYiPanel.NAME);
    }
}


