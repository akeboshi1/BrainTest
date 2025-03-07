import { _decorator, Button, Component, EventHandheld, EventHandler, Node, VideoPlayer } from 'cc';
import { VirtualLecturerModel } from './Model/VirtualLecturerModel';
const { ccclass, property } = _decorator;

@ccclass('VirturalLecturerView')
export class VirturalLecturerView extends Component {

    @property(VideoPlayer)
    private vp:VideoPlayer = null;

    @property(Button)
    private btn_v1:Button = null;

    @property(Button)
    private btn_v2:Button = null;

    @property(Button)
    private btn_back:Button = null;

    private model:VirtualLecturerModel = null;

    protected onLoad(): void {
        this.model = new VirtualLecturerModel();
    }

    protected onDestroy(): void {
        this.model.dispose();
        this.model = null;
    }

    start() {
        const clickEventHandler1 = new EventHandler();
        clickEventHandler1.target = this.node; // 这个 node 节点是你的事件处理代码组件所属的节点
        clickEventHandler1.component = 'VirturalLecturerView';// 这个是脚本类名
        clickEventHandler1.handler = 'onPlayVideo';
        clickEventHandler1.customEventData = "https://kele.paipai.xinjiaxianglao.com/videos/baduanjin1.mp4";

        const clickEventHandler2 = new EventHandler();
        clickEventHandler2.target = this.node; // 这个 node 节点是你的事件处理代码组件所属的节点
        clickEventHandler2.component = 'VirturalLecturerView';// 这个是脚本类名
        clickEventHandler2.handler = 'onPlayVideo';
        clickEventHandler2.customEventData = "https://kele.paipai.xinjiaxianglao.com/videos/baduanjin2.mp4";

        this.btn_v1.clickEvents.push(clickEventHandler1);
        this.btn_v2.clickEvents.push(clickEventHandler2);

        const clickEventHandler3 = new EventHandler();
        clickEventHandler3.target = this.node; // 这个 node 节点是你的事件处理代码组件所属的节点
        clickEventHandler3.component = 'VirturalLecturerView';// 这个是脚本类名
        clickEventHandler3.handler = 'onClickBack';
        this.btn_back.clickEvents.push(clickEventHandler3);

        this.vp.node.active = false;
    }

    onPlayVideo (event: Event, customEventData: string) {
        this.vp.node.active = true;
        this.vp.remoteURL = customEventData;
        this.vp.play();

        this.btn_v1.node.active = false;
        this.btn_v2.node.active = false;
    }

    onClickBack() {
        if(this.vp.node.active){
            this.vp.node.active = false;
            this.vp.stop();
            this.btn_v1.node.active = true;
            this.btn_v2.node.active = true;
        }else{
            this.node.active = false;
        }
    }

    update(deltaTime: number) {
        
    }
}


