import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('mainScene')
export class mainScene extends Component {

    @property(Prefab)
    chatPanelPrefab: Prefab = null;

    @property(Node)
    parentNode: Node = null;

    private chatPanel:Node = null;

    start() {

    }

    update(deltaTime: number) {
        
    }

    openChatPanel() {
        if(this.chatPanel == null)
        {
            this.createChatPanel();
        }

        this.chatPanel.active = true;
    }

    createChatPanel() {
        if (this.chatPanelPrefab && this.parentNode) {
            this.chatPanel = instantiate(this.chatPanelPrefab);
            this.parentNode.addChild(this.chatPanel);
        } else {
            console.error("预制体或者父节点未正确绑定，请检查！");
        }
    }
}


