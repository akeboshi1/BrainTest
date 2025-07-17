import { _decorator, Component, find, Node } from 'cc';
import { ScrollViewExt } from './ScrollViewExt';
const { ccclass, property } = _decorator;

@ccclass('Selector')
export class Selector extends Component {

    @property(ScrollViewExt)
    svExt: ScrollViewExt = null;
    @property(Node)
    cancelBtn:Node = null;
    @property(Node)
    confirmBtn:Node = null;

    // @property([String])
    // options: String[] = [];
    private options: string[] = [];

    callback: (data: string) => void;

    private _nodes: Nodes = null;

    private _selectedOptions: string;
    private _index: number;
    
    // 新增：记录初始值
    private _initSelectedOption: string;
    private _initIndex: number;

    onEnable(){
        if(this.cancelBtn){
            this.cancelBtn.on(Node.EventType.TOUCH_END, () => {
                this.onClose('cancel');
            })
        }
        if(this.confirmBtn){
            this.confirmBtn.on(Node.EventType.TOUCH_END, () => {
                this.onClose('confirm');
            })
        }
    }
    onDisable(){
        if(this.cancelBtn){
            this.cancelBtn.off(Node.EventType.TOUCH_END);
        }
        if(this.confirmBtn){
            this.confirmBtn.off(Node.EventType.TOUCH_END);
        }
    }
    setOptions(options: string[], initValue?: string) {
        this.options = options;
        // 记录初始值
        if (initValue && options.indexOf(initValue) !== -1) {
            this._initSelectedOption = initValue;
            this._initIndex = options.indexOf(initValue);
        } else {
            this._initSelectedOption = options[0];
            this._initIndex = 0;
        }
        this.startOptionsShow();
    }
    startOptionsShow(){
        
        try {
            this._nodes = new Nodes(this.node);

            if (this.svExt) {
                let strArr = [];
                for (const key in this.options) {
                    const element = this.options[key];
                    strArr.push(element.valueOf());
                }
                
                this.svExt.dataList = strArr;

                this.svExt.callback = (idx: number, data: Array<string>) => this.onSelectionChanged(idx, data);
            }
            this.initMember();

            if (this._nodes.nodeMask) {
                this._nodes.nodeMask.on(Node.EventType.TOUCH_END, () => {
                    this.onClose('cancel');
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

    onSelectionChanged(idx: number, data: Array<string>) {
        this._selectedOptions = data[idx];
        this._index = idx;
        if (this.callback) {
            this.callback(this._selectedOptions);
        }
    }

    private onClose(type: 'confirm' | 'cancel' = 'confirm') {
        if (type === 'cancel') {
            this.callback && this.callback(this._initSelectedOption);
        } else {
            this.callback && this.callback(this._selectedOptions);
        }
        this.node.active = false;
    }

    scrollToSelection(option:string){
        let optIndex = this.options.indexOf(option);
        this.svExt.scrollToSelection(optIndex);
    }
}

class Nodes {
    nodeMask: Node = null;

    constructor(node: Node) {
        this.nodeMask = find('mask', node);
    }
}
