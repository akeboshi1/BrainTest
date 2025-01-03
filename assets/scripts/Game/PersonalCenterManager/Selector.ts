import { _decorator, Component, find, Node } from 'cc';
import { ScrollViewExt } from './ScrollViewExt';
const { ccclass, property } = _decorator;

const dataArr = ["男", "女"];

@ccclass('Selector')
export class Selector extends Component {

    @property(ScrollViewExt)
    svExt: ScrollViewExt = null;

    @property([String])
    options: String[] = dataArr;

    callback: (sex: string) => void;

    private _nodes: Nodes = null;

    private _selectedOptions: string;
    private _index: number;

    onLoad(): void {
        try {
            this._nodes = new Nodes(this.node);

            if (this.svExt) {
                let strArr = [];
                for (const key in this.options) {
                    const element = this.options[key];
                    strArr.push(element.valueOf());
                }
                
                this.svExt.dataList = strArr;

                this.svExt.callback = (idx: number, data: Array<string>) => this.onSexChanged(idx, data);
            }
            this.initMember();

            if (this._nodes.nodeMask) {
                this._nodes.nodeMask.on(Node.EventType.TOUCH_END, () => {
                    this.onClose();
                })
            }
        } catch (error) {
            
            console.error(error);

        }

    }

    private initMember() {
        this._selectedOptions = this.svExt.dataList[0];
        this._index = 0;
    }

    onSexChanged(idx: number, data: Array<string>) {
        this._selectedOptions = data[idx];
        this._index = idx;
        if (this.callback) {
            this.callback(this._selectedOptions);
        }
    }

    private onClose() {
        this.callback(this._selectedOptions);
        this.node.active = false;
    }
}

class Nodes {
    nodeMask: Node = null;

    constructor(node: Node) {
        this.nodeMask = find('mask', node);
    }
}
