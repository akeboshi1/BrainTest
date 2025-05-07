import { Component, _decorator,Button,Node,resources,SpriteFrame,Sprite } from "cc";
import {SkewersGameType} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import {BasePanel} from "db://assets/resources/scripts/Core/UI/BasePanel";
import {UIManager} from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
const { ccclass, property } = _decorator;
/**
 * 引导图片界面
 */

@ccclass('GuidePanel')
export class GuidePanel extends BasePanel {
    
    @property(Node)
    backGround:Node = null;
    
    @property(Button)
    btn:Button = null;
    
    public static NAME: string = 'GuidePanel';

    
    restore(data){
        if(data !=null){
            this.setBG(data);
        }
    }
    
    async setBG(type:SkewersGameType):Promise<void>{
        return new Promise((resolve,reject)=>{ 
            let url = "";
            const bgSprite:Sprite = this.backGround.getComponent(Sprite); 
            switch(type){ 
                case SkewersGameType.Comprehension:
                    url = "texture/guide/fishguidebg/spriteFrame";
                    break;
                case SkewersGameType.Executionability:
                    url = "texture/guide/pinTu/spriteFrame";
                    break;
                case SkewersGameType.Language:
                    url = "texture/guide/majiangguidebg/spriteFrame";
                    break;
                case SkewersGameType.Calculator:
                    url = "texture/guide/fishguidebg/spriteFrame";
                    break;
                case SkewersGameType.Judgment:
                    url = "texture/guide/findingguidebg/spriteFrame";
                    break;
                case SkewersGameType.Memory:
                    url = "texture/guide/fanPai/spriteFrame";
                    break;
            }
            resources.load(url, SpriteFrame,(err,sp)=>{ 
                if(err){ 
                    DebugLog.instance.error(err); 
                    reject(err);
                    return;
                }
                bgSprite.spriteFrame = sp; 
                resolve();
            });
        });
    }

    closePanel(){
        UIManager.getInstance().hidePanel(GuidePanel.NAME);
    }
}