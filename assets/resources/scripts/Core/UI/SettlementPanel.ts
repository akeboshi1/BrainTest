import {Node,Label,_decorator,v3,Vec3,tween, UI, Button, AudioClip, resources} from 'cc';
import {BasePanel} from "db://assets/resources/scripts/Core/UI/BasePanel";
import { UIManager } from '../Manager/UI/UIManager';
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import {AudioManager} from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { TimeUtil } from "db://assets/resources/scripts/Core/Util/TimeUtil";
const { ccclass, property } = _decorator;

@ccclass('SettlementPanel')
export class SettlementPanel extends BasePanel{


    private result: boolean = null;

    private residueTime:number = 0;

    @property(Node)
    bg0 :Node = null;
    @property(Node)
    bg1 :Node = null;
    @property(Node)
    bg2 :Node = null;

    @property(Node)
    private btn1Node: Node = null;
    @property(Node)
    private btn2Node: Node = null;

    @property(Label)
    private btn1Label: Label = null; // 添加按钮1的文本标签
    @property(Label)
    private btn2Label: Label = null; // 添加按钮2的文本标签

    private getOver: boolean = false;

    @property(Node)
    private loseTitle: Node = null;

    @property(Node)
    private winTitle:Node = null;

    @property(Label)
    private titlelabel:Label = null;

    @property(Label)
    private progressLabel:Label = null;

    @property(Node)
    quitTitle:Node = null;

    public againHandler: Function = null;

    public nextHandler: Function = null;

    private audioUrls = ["music/rest"];
    private audioMap: Map<string, AudioClip> = new Map();

    // public title: string = ""; // 添加自定义标题支持

    /**
     * 按钮是否已被点击禁用
     * @private
     */
    private _isButtonDisabled: boolean = false;

    public static NAME: string = 'SettlementPanel';

    constructor(){
        super();
    }

    onEnable(){
        this.loadAudio();
    }

    private async loadAudio() {
        // 创建一个数组，存放每个异步加载的 Promise
        const loadPromises = this.audioUrls.map(audioUrl => {
            return new Promise((resolve, reject) => {
                let self = this;
                // 检查audioMap中是否已经加载过此音效
                if (self.audioMap.has(audioUrl)) {
                    // 如果已加载，直接返回缓存的音效资源
                    resolve(self.audioMap.get(audioUrl));
                    return;
                }
                resources.load(audioUrl, AudioClip,(err, audioRes) => {
                    if(err){
                        DebugLog.instance.error(err);
                        reject(err);
                        return;
                    }
                    self.audioMap.set(audioUrl, audioRes);
                    resolve(audioRes);
                });
            });
        });
        try {
            const assets = await Promise.all(loadPromises);
            DebugLog.instance.log('All gamealert audio loaded:', assets);
        } catch (error) {
            DebugLog.instance.error('Error loading gamealert audio:', error);
        }
    }

    restore(data){
        if(data !=null){
            this.result = data.result;
            this.againHandler = data.againHandler;
            this.nextHandler = data.nextHandler;
            // this.title = data.title || ""; // 获取自定义标题
        }
        
        // 重置按钮状态
        this.enableButtons();
    }

    start(){
       this.initEnd();
    }

    public initEnd() {
        if (this.result === null) {
            // 退出确认模式
            // this.bg0.active = true;
            // this.bg1.active = true;
            // this.bg2.active = true;
            this.btn1Node.active = true;
            this.loseTitle.active = false;
            this.winTitle.active = false;
            this.quitTitle.active = true;
            this.titlelabel.string = "是否退出当前训练？";
            this.titlelabel.node.setPosition(0, 0, 0);
            SettlementPanel.bezierTo(this.quitTitle, 0.5, v3(-200, 200, 0), v3(-100, 400, 0), v3(0, 200, 0), {}).start();
            SettlementPanel.bezierTo(this.titlelabel.node, 0.5, v3(-200, 0, 0), v3(-100, 200, 0), v3(0, 0, 0), {}).start();
            // 设置按钮文本
            if (this.btn1Label) {
                this.btn1Label.string = "继续训练";
            }
            if (this.btn2Label) {
                this.btn2Label.string = "退出训练";
            }
            AudioManager.getInstance().playRest();
        } else if (this.result) {
            // 成功模式
            // this.bg0.active = false;
            this.bg1.active = false;
            this.bg2.active = false;
            this.btn1Node.active = false;
            this.loseTitle.active = false;
            this.quitTitle.active = false;
            this.winTitle.active = true;
            this.winTitle.setPosition(-200, 0, 0);
            SettlementPanel.bezierTo(this.winTitle, 0.5, v3(-200, 200, 0), v3(-100, 400, 0), v3(0, 200, 0), {}).start();
            this.titlelabel.string = "恭喜通关";
            this.titlelabel.node.setPosition(-200, 0, 0);
            SettlementPanel.bezierTo(this.titlelabel.node, 0.5, v3(-200, 0, 0), v3(-100, 200, 0), v3(0, 0, 0), {}).start();
            
            // 设置按钮文本
            if (this.btn2Label) {
                this.btn2Label.string = "下一关";
            }

            // 下一关按钮增加3秒倒计时
            if (this.btn2Node) {
                const btn2 = this.btn2Node.getComponent(Button);
                if (btn2) {
                    TimeUtil.startButtonCountdown(btn2, 3, "下一关", this.btn2Label, () => {
                        this.onClickNext();
                    });
                }
            }
        } else {
            // 失败模式
            // this.bg0.active = false;
            this.bg1.active = false;
            this.bg2.active = false;
            this.btn1Node.active = true;
            this.loseTitle.active = true;
            this.quitTitle.active = false;
            this.winTitle.active = false;
            this.titlelabel.string = "请再接再厉";
            SettlementPanel.bezierTo(this.loseTitle, 0.5, v3(-200, 200, 0), v3(-100, 400, 0), v3(0, 200, 0), {}).start();
            SettlementPanel.bezierTo(this.titlelabel.node, 0.5, v3(-200, 0, 0), v3(-100, 200, 0), v3(0, 0, 0), {}).start();
            // 设置按钮文本
            if (this.btn1Label) {
                this.btn1Label.string = "重玩";
            }
            if (this.btn2Label) {
                this.btn2Label.string = "下一关";
            }

            // 下一关按钮增加3秒倒计时
            if (this.btn2Node) {
                const btn2 = this.btn2Node.getComponent(Button);
                if (btn2) {
                    TimeUtil.startButtonCountdown(btn2, 3, "下一关", this.btn2Label, () => {
                        this.onClickNext();
                    });
                }
            }

            AudioManager.getInstance().playRest();
        }
    }

    public onClickNext() {
        // 如果按钮已被禁用，忽略此次点击
        if (this._isButtonDisabled) {
            console.log("SettlementPanel: 按钮已被禁用，忽略此次点击");
            return;
        }
        
        // 禁用按钮
        this.disableButtons();
        
        if(this.nextHandler)this.nextHandler();
        this.closeEnd();
    }

    public onClickAgain() {
        // 如果按钮已被禁用，忽略此次点击
        if (this._isButtonDisabled) {
            console.log("SettlementPanel: 按钮已被禁用，忽略此次点击");
            return;
        }
        
        // 禁用按钮
        this.disableButtons();
        
        if(this.againHandler)this.againHandler();
        this.closeEnd();
    }

    public closeEnd() {
        UIManager.getInstance().hidePanel(SettlementPanel.NAME);
    }


    public static bezierTo(target:any,duration:number,c1:Vec3,c2:Vec3,to:Vec3,opts:any){
        opts = opts || Object.create(null);
        let twoBezier = (t:number,p1:Vec3,cp:Vec3,p2:Vec3)=>{
            let x=(1-t)*(1-t)*p1.x+2*t*(1-t)*cp.x+t*t* p2.x;
            let y=(1-t)*(1-t)*p1.y+2*t*(1-t)*cp.y+t*t* p2.y;
            let z=(1-t)*(1-t)*p1.z+2*t*(1-t)*cp.z+t*t*p2.z;
            return v3(x,y,z);
        }
        opts.onUpdate = (arg:Vec3,ratio:number)=>{
            target.position= twoBezier(ratio,c1,c2,to);
        };
        return tween(target).to(duration,{},opts);
    }


    public getCirclePoints(r: number, pos: Vec3, count: number, randomScope: number = 60): Vec3[] {
        let points = [];
        let radians = (Math.PI / 180) * Math.round(360 / count);
        for (let i = 0; i < count; i++) {
            let x = pos.x + r * Math.sin(radians * i);
            let y = pos.y + r * Math.cos(radians * i);
            points.unshift(v3(x + Math.random() * randomScope, y + Math.random() * randomScope, 0));
        }
        return points;
    }

    /**
     * 禁用所有按钮
     * @private
     */
    private disableButtons(): void {
        this._isButtonDisabled = true;
        
        // 禁用按钮1
        if (this.btn1Node) {
            const button1 = this.btn1Node.getComponent(Button);
            if (button1) {
                button1.interactable = false;
            }
        }
        
        // 禁用按钮2
        if (this.btn2Node) {
            const button2 = this.btn2Node.getComponent(Button);
            if (button2) {
                button2.interactable = false;
            }
        }
        
        console.log("SettlementPanel: 按钮已禁用");
    }

    /**
     * 启用所有按钮
     * @private
     */
    private enableButtons(): void {
        this._isButtonDisabled = false;
        
        // 启用按钮1
        if (this.btn1Node) {
            const button1 = this.btn1Node.getComponent(Button);
            if (button1) {
                button1.interactable = true;
            }
        }
        
        // 启用按钮2
        if (this.btn2Node) {
            const button2 = this.btn2Node.getComponent(Button);
            if (button2) {
                button2.interactable = true;
            }
        }
        
        console.log("SettlementPanel: 按钮已启用");
    }
}