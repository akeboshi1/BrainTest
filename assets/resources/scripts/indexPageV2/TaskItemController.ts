import { _decorator, Component, Label, Node, Sprite, SpriteFrame, resources, Color, UITransform, assetManager, ImageAsset, Texture2D } from 'cc';

import { DebugLog } from '../Core/Util/DebugLog';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { TaskAndNotificationPanelCtrl } from '../Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { ColorUtil } from '../Core/Util/ColorUtil';
import { ThemeConfig } from '../Config/ThemeConfig';
import { ScreenAdapter } from '../Adapter/ScreenAdapter';
const { ccclass, property } = _decorator;

@ccclass('TaskItemController')
export class TaskItemController extends Component {
    @property(Label)
    private taskTitle: Label = null;
    @property(Label)
    private taskContent: Label = null;
    @property(Sprite)
    private taskBg: Sprite = null;
    @property(Sprite)
    private taskIcon: Sprite = null;
    @property(Label)
    private buttonText: Label = null;
    @property(Node)
    private button: Node = null;
    private taskIndex: number = -1;

    @property(Sprite)
    private taskBG0:Sprite=null;
    @property(Sprite)
    private taskBG1:Sprite=null;

    @property(Sprite)
    private taskBG2:Sprite=null;


    @property(Label)
    private taskWord:Label=null;

    private _clickCallBack:()=>void = null;
    onEnable() {
        // 添加按钮点击事件监听
        if (this.button) {
            this.button.on(Node.EventType.TOUCH_END, this.onButtonClick, this);
        }
    }
    onDisable() {
        // 移除事件监听
        if (this.button) {
            this.button.off(Node.EventType.TOUCH_END, this.onButtonClick, this);
        }
    }

    private onButtonClick() {
        if(this._clickCallBack){
            this._clickCallBack();
        }
    }

    setClickCallback(clickCallBack:()=>void){
        this._clickCallBack = clickCallBack;
    }

    // 设置任务索引
    setTaskIndex(index: number) {
        this.taskIndex = index;
    }

    setTaskTitle(title: string) {
        this.taskTitle.string = title;
        if(ThemeConfig.getInstance().getThemeTitle() == "normal"){
            this.taskTitle.isBold = false;
        }else{
            this.taskTitle.isBold = false;
        }
    }

    setTaskContent(content: string) {
        this.taskContent.string = content;
    }

    async setTaskBg(spritePath, width?, height?) {
        let spriteFrame: SpriteFrame;
        
        // 判断是否为远程URL（以http开头）
        if (spritePath.startsWith('http')) {
            spriteFrame = await this.loadRemoteSprite(spritePath);
            this.taskBG2.node.active = false;
        } else {
            spriteFrame = await this.loadTaskSprite(spritePath);
            this.taskBG2.node.active = true;
        }
        
        this.taskBg.spriteFrame = spriteFrame;
        
        // 设置宽高，考虑适配缩放系数
        if (width !== undefined || height !== undefined) {
            const uiTransform = this.taskBg.node.getComponent(UITransform);
            if (uiTransform) {

                if (width !== undefined) {
                    // 将宽度乘以缩放系数进行适配
                    uiTransform.width = width;
                }
                if (height !== undefined) {
                    // 将高度乘以缩放系数进行适配
                    uiTransform.height = height;
                }
                
                // DebugLog.instance.log(`[TaskItemController] 任务背景尺寸适配: 原始尺寸(${width}, ${height}) -> 适配后尺寸(${uiTransform.width}, ${uiTransform.height}), 缩放系数: ${scaleFactor.toFixed(3)}`);
            }
        }
    }

    async setTaskWordColor(wordcolor:string) {
        this.taskWord.color = new Color(wordcolor);
        DebugLog.instance.log(`设置文本颜色: ${wordcolor}`);
        
        // 在normal主题下不使用outline效果
        if(ThemeConfig.getInstance().getThemeTitle() == "normal"){
            this.taskWord.isBold = false;
            DebugLog.instance.log("normal主题下仅设置文本颜色，不使用outline效果");
        }else{
            this.taskWord.isBold = true;
        }
    }

    /**
     * 设置文本外发光效果
     * @param outlineColor 外发光颜色
     */
    setTaskWordOutline(outlineColor: string) {
        // 在normal主题下不使用outline效果
        if(ThemeConfig.getInstance().getThemeTitle() == "normal"){
            DebugLog.instance.log("normal主题下不使用outline效果");
            this.taskWord.enableOutline = false;
            return;
        }
        
        if (outlineColor) {
            this.taskWord.enableOutline = true;
            this.taskWord.outlineColor = ColorUtil.hexToColor(outlineColor);
            this.taskWord.outlineWidth = 4; // 默认宽度
            DebugLog.instance.log(`设置文本外发光效果: ${outlineColor}`);
        }
    }

    async setbgColor(bg0_color:string,bg1_color:string,bg2_color:string,bg3_color:string) {
        // 自动检测颜色字符串格式并解析
        const color0 = this.parseColorString(bg0_color);
        const color1 = this.parseColorString(bg1_color);
        
        // 添加调试日志
        DebugLog.instance.log(`[TaskItemController] 设置背景颜色:`);
        DebugLog.instance.log(`bg0_color: ${bg0_color} -> R:${color0.r}, G:${color0.g}, B:${color0.b}, A:${color0.a}`);
        DebugLog.instance.log(`bg1_color: ${bg1_color} -> R:${color1.r}, G:${color1.g}, B:${color1.b}, A:${color1.a}`);
        

        this.taskTitle.color = color0;

        // 确保Sprite组件存在
        if (this.taskBG0) {
            this.taskBG0.color = color0;
            DebugLog.instance.log(`taskBG0 颜色已设置: ${this.taskBG0.color}`);
        } else {
            DebugLog.instance.warn("taskBG0 组件不存在");
        }
        
        if (this.taskBG1) {
            this.taskBG1.color = color1;
            DebugLog.instance.log(`taskBG1 颜色已设置: ${this.taskBG1.color}`);
        } else {
            DebugLog.instance.warn("taskBG1 组件不存在");
        }
        
        if(ThemeConfig.getInstance().getThemeTitle() == "normal"){
            const color2 = this.parseColorString(bg2_color);
            const color3 = this.parseColorString(bg3_color);
            
            DebugLog.instance.log(`bg2_color: ${bg2_color} -> R:${color2.r}, G:${color2.g}, B:${color2.b}, A:${color2.a}`);
            DebugLog.instance.log(`bg3_color: ${bg3_color} -> R:${color3.r}, G:${color3.g}, B:${color3.b}, A:${color3.a}`);
            
            if (this.taskBG2) {
                this.taskBG2.color = color2;
                DebugLog.instance.log(`taskBG2 颜色已设置: ${this.taskBG2.color}`);
            } else {
                DebugLog.instance.warn("taskBG2 组件不存在");
            }
            
            if (this.taskBg) {
                this.taskBg.color = color3;
                DebugLog.instance.log(`taskBg 颜色已设置: ${this.taskBg.color}`);
            } else {
                DebugLog.instance.warn("taskBg 组件不存在");
            }
        }
    }

    /**
     * 解析颜色字符串，自动检测是否包含alpha值
     * @param colorString 颜色字符串，支持格式：
     * - #RRGGBB (6位十六进制)
     * - RRGGBB (6位十六进制，无#)
     * - #RRGGBBAA (8位十六进制，包含alpha)
     * - RRGGBBAA (8位十六进制，包含alpha，无#)
     * @returns Color对象
     */
    private parseColorString(colorString: string): Color {
        if (!colorString) {
            return new Color(255, 255, 255, 255); // 默认白色
        }

        // 移除#号
        let hex = colorString.replace('#', '');
        
        // 检查字符串长度
        if (hex.length === 6) {
            // 6位十六进制，使用原有的hexToColor方法
            return ColorUtil.hexToColor(colorString);
        } else if (hex.length === 8) {
            // 8位十六进制，包含alpha值，使用新的解析方法
            return ColorUtil.hexWithAlphaToColor(colorString);
        } else {
            // 其他格式，尝试直接创建Color对象
            return new Color(colorString);
        }
    }

    async setTaskIcon(spritePath) {
        // let spriteFrame = await this.loadTaskSprite(spritePath);
        // this.taskIcon.spriteFrame = spriteFrame;
    }
    async loadTaskSprite(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    DebugLog.instance.error(`Failed to load sprite: ${path}`, err);
                    reject(err);
                    return;
                }

                if (!spriteFrame) {
                    DebugLog.instance.error(`Loaded sprite frame is null: ${path}`);
                    reject(new Error('Loaded sprite frame is null'));
                    return;
                }
                resolve(spriteFrame);
            });
        })
    }

    /**
     * 从远程URL加载图片并转换为SpriteFrame
     * @param url 远程图片URL
     * @returns Promise<SpriteFrame>
     */
    async loadRemoteSprite(url: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            this.wwwLoadSpriteFrame(url, (spriteFrame: SpriteFrame) => {
                if (spriteFrame) {
                    resolve(spriteFrame);
                } else {
                    reject(new Error(`远程图片加载失败: ${url}`));
                }
            });
        });
    }

    /**
     * 使用assetManager加载远程图片
     * @param path 远程图片路径
     * @param completeHD 完成回调函数
     */
    public wwwLoadSpriteFrame(path: string, completeHD: Function) {
        assetManager.loadRemote<ImageAsset>(path,
            {
                xhrResponseType: "blob",
                xhrHeader: { 'Content-Type': 'application/octet-stream' }
            },
            (err, imageAsset: ImageAsset) => {
                if (err) {
                    DebugLog.instance.error("load error  ");
                    DebugLog.instance.log(err);
                    completeHD(null);
                    return;
                }
                const spriteFrame = new SpriteFrame();
                const texture = new Texture2D();
                texture.image = imageAsset;
                spriteFrame.texture = texture;
                completeHD(spriteFrame);
            }
        );
    }

    setIsComplete(isComplete: boolean) {
        this.buttonText.string = isComplete ? "已完成" : "去完成";
    }

    update(deltaTime: number) {
        
    }
}


