import {  _decorator,Button,Node,Color,Label,Sprite } from "cc";
import {BasePanel} from "db://assets/resources/scripts/Core/UI/BasePanel";
import {UIManager} from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import {GameCenterManager} from "db://assets/resources/scripts/Game/GameCenter/GameCenterManager";
import {BundleName} from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
const { ccclass, property } = _decorator;

enum OptionButtonColor {
    SELECT = 0,
    NORMAL = 1
}

// 将枚举转换为Color类型
const OptionButtonColorMap = {//rgb(209, 95, 128)
    [OptionButtonColor.SELECT]: new Color(55, 194, 109, 255), //rgb(55, 194, 96)
    [OptionButtonColor.NORMAL]: new Color(61, 21, 127, 255)   //rgb(61, 21, 127)
}

/**
 * 玩法介绍界面
 */
@ccclass('GuidePanel')
export class GuidePanel extends BasePanel {

    
    @property(Button)
    btn:Button = null;

    @property(Node)
    btnNode:Node = null;

    @property(Node)
    btnNode2:Node = null;

    @property(Node)
    btnNode3:Node = null;

    @property(Label)
    descLabel:Label = null;

    
    public static NAME: string = 'GuidePanel';




    private gameName:BundleName= undefined;

    private callback:Function = undefined;

    private exitcallback:Function = undefined;
    
    restore(data){
        if(data !=null){
            this.gameName = data.name
            this.callback = data.callback;
            this.exitcallback = data.exitCallback;
            let descStr = "";
            switch(this.gameName){
                case BundleName.FINGING:
                    descStr = "找茬游戏:对比两幅高度相似的图片，找出细微差异（如颜色、形状、数量），锻炼细节观察力与专注度"
                    break;
                case BundleName.FANPAI:
                    descStr = "翻牌游戏:玩家通过记忆卡牌位置寻找相同图案或数字的配对牌，考验短期记忆力与空间定位能力"
                    break;
                case BundleName.PUZZLE:
                    descStr = "拼图游戏:将碎片拼接为完整图案，训练空间想象力与耐心，锻炼人的执行力"
                    break;
                case BundleName.CATCHFISH:
                    descStr = "捕鱼游戏:将数学运算（加减法）融入捕鱼情境，玩家通过计算捕获目标鱼群，兼具趣味性与知识性，锻炼人的计算能力"
                    break;
                case BundleName.GUESSINGGAME:
                    descStr = "猜谜游戏:通过线索推断答案，涵盖文字谜、动作谜、逻辑谜等多种形式，锻炼人的推理能力"
                    break;
                case BundleName.SENTENCEMAKING:
                    descStr = "组词造句:以麻将牌形式的文字游戏，牌面上是单个汉字或词语，玩家通过组合这些牌来形成词语或句子，锻炼人的语言能力"
                    break;
                case BundleName.SMALLTHEATER:
                    descStr = "小剧场"
                    break;

            }
            this.descLabel.string = descStr;
            this.btnNode2.active= this.btnNode3.active = this.gameName != BundleName.GUESSINGGAME;
            this.selectHard(null,"0");
        }
    }

    selectHard(event,data){
        let btnSprite1:Sprite = this.btnNode.getComponent(Sprite);
        let btnSprite2:Sprite = this.btnNode2.getComponent(Sprite);
        let btnSprite3:Sprite = this.btnNode3.getComponent(Sprite);
         switch(data){
             case "0":
                 btnSprite1.color = OptionButtonColorMap[OptionButtonColor.SELECT];
                 btnSprite2.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                 btnSprite3.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                 break;
             case "1":
                 btnSprite2.color = OptionButtonColorMap[OptionButtonColor.SELECT];
                 btnSprite1.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                 btnSprite3.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                 break;
             case "2":
                 btnSprite3.color = OptionButtonColorMap[OptionButtonColor.SELECT];
                 btnSprite2.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                 btnSprite1.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                 break;
         }
         GameCenterManager.getInstance().setDifficulty(Number(data)+1);
    }

    startGame(){
        if(this.callback != undefined){
            this.callback();
        }
        this._closePanel();
    }


    closePanel(){
        if(this.exitcallback != undefined){
            this.exitcallback();
        }
       this._closePanel();
    }

    _closePanel(){
        this.callback = undefined;
        this.gameName = undefined;
        this.exitcallback = undefined;
        UIManager.getInstance().hidePanel(GuidePanel.NAME);
    }
}