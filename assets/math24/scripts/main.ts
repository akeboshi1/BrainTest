import { _decorator, Button, Label, Node, Sprite, SpriteFrame, Texture2D,Vec3,tween, resources, assetManager, Color, game, Game, AudioClip } from 'cc';
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {TimerCommonComponent} from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import {BundleName} from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import {Math24CardData, SymbolsType} from "db://assets/math24/scripts/Math24CardData";
import {Math24Database} from "db://assets/math24/scripts/Math24Database";
import {Math24Question} from "db://assets/math24/scripts/Math24Generator";
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { SettlementPanel } from '../../resources/scripts/Core/UI/SettlementPanel';
import { AlertManager, AlertData } from '../../resources/scripts/Core/Manager/Alert/AlertManager';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends BaseScene<IBaseGameChild> {

    @property(Node)
    mainView: Node;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;
    // ============== mainView
    @property(Label)
    label:Label = null;

    @property([Node])
    cards: Node[] = [];

    @property(Button)
    nextQuestionBtn: Button = null;

    private hards: number[] = [1, 2, 3];

    private level:number = 0;
    private  hardIndex:number = 0;

    protected bundleName: string = BundleName.MATH24;

    private _blackCardRes:string="texture/spade/";
    private _clubCardRes:string="texture/club/";
    private _diamondCardRes:string="texture/diamond/";
    private _heartCardRes:string="texture/heart/";

    @property(SpriteFrame)
    frontFrame:SpriteFrame = null;
    @property(SpriteFrame)
    backFrame:SpriteFrame = null;

    private flipDuration = 0.25;
    private isFront = false;
    private time:number = 600;

    private cardValues: number[] = [1,1,3,8];
    private _curCardData:Math24CardData;

    // 当前题目
    private currentQuestion: Math24Question = null;


    
    // 题库管理器
    private math24Database: Math24Database = null;

    // 重构状态变量，简化训练逻辑
    private selectedCards: number[] = [];  // 存储已选择的卡片索引
    private selectedValues: number[] = []; // 存储已选择的卡片值
    private operators: string[] = [];      // 存储已选择的运算符
    private operatorTypes: number[] = [];  // 存储已选择的运算符类型
    private currentExpression: string = ''; // 当前表达式
    private currentResult: number = 0;     // 当前表达式计算结果
    
    // 简化括号管理
    private brackets: {start: number, end: number}[] = []; // 存储括号的开始和结束位置
    private bracketMode: number = 0;  // 括号模式：0表示无括号，1-n表示不同的括号组合
    private usedCardIndices: Set<number> = new Set(); // 已使用的卡牌索引
    private hasBrackets: boolean = false; // 是否已添加括号
    
    // 游戏结算状态
    private _isGameCompleted: boolean = false;

    protected audioUrls = ['music/24_bgm', "music/win","music/fail"];

    private bgmClip: AudioClip;

    onLoad(): void {
        this.loadAudio().then(()=>{
            this.playBgmAudio("music/24_bgm", true);
        });
        
        // 获取题库管理器实例
        this.math24Database = Math24Database.getInstance();
        
        // 注册结算面板
        UIManager.getInstance().registerPanel(SettlementPanel.NAME, BundleName.RESOURCES, "prefab/settlementPanel/settlementPanel", SettlementPanel);
    }

    start() {
        super.start();
        // this.dataInit();
        this.sceneInit();
        
        // 添加应用前后台切换监听
        this.addAppStateListener();
    }

    dataInit(){
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.hardIndex = (this.sceneModel as any).difficulty - 1;
            this.level = (this.sceneModel as any).level;
        }else{
            this.level = (this.sceneModel as any).level;
            this.hardIndex = 0;//((this.level % 3) == 0?3:(this.level % 3))-1;
        }
    }

    // ========== 开始倒计时 ==========
    public startTime(time: number) {
        if (this.timerComponent) this.timerComponent.startTimer(time);
    }

    sceneInit(){
        super.sceneInit();
        this.refreshView();
        
        // 加载新题目
        this.loadNewQuestion();
    }

    /**
     * 点击卡片的处理逻辑
     */
    clickCard(event: Event, customEventData: string) {
        this.playAudio("click");
        let index = Number(customEventData);
        
        // 判断卡片是否已经被选中
        const isCardSelected = this.selectedCards.includes(index);
        DebugLog.instance.log(`点击卡片，索引: ${index}, 已选中状态: ${isCardSelected}`);
        
        if (isCardSelected) {
            // 如果卡片已被选中，取消选中
            this.removeCardFromExpression(index);
        } else {
            // 如果卡片尚未被选中，且卡片数量未达上限，则选中它
            if (this.selectedCards.length >= 4) {
                DebugLog.instance.log('已选择4张卡片，不能再选择');
                return;
            }
            
            // 获取卡牌的值
            let cardValue = this.cardValues[index];
            
            // 添加卡片到表达式
            this.addCardToExpression(index, cardValue);
        }
        
        // 更新表达式
        this.updateExpression();
        
        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }
    
    /**
     * 从表达式中移除卡片
     */
    removeCardFromExpression(index: number) {
        // 查找卡片在选中列表中的位置
        const cardPosition = this.selectedCards.indexOf(index);
        if (cardPosition === -1) {
            DebugLog.instance.log(`卡片${index}不在选中列表中`);
            return;
        }
        
        DebugLog.instance.log(`取消选中卡片${index}，位置: ${cardPosition}`);
        
        // 如果要移除的卡片后面有运算符，需要一起移除
        if (cardPosition < this.operators.length) {
            // 移除对应位置的运算符
            this.operators.splice(cardPosition, 1);
            this.operatorTypes.splice(cardPosition, 1);
            DebugLog.instance.log(`同时移除位置${cardPosition}的运算符`);
        }
        
        // 如果不是最后一张卡片，且前面有运算符，也需要移除前面的运算符
        if (cardPosition > 0 && cardPosition === this.selectedCards.length - 1 && this.operators.length >= cardPosition) {
            // 移除前一个位置的运算符
            this.operators.splice(cardPosition - 1, 1);
            this.operatorTypes.splice(cardPosition - 1, 1);
            DebugLog.instance.log(`同时移除位置${cardPosition - 1}的运算符`);
        }
        
        // 从已选卡片和已选值列表中移除
        this.selectedCards.splice(cardPosition, 1);
        this.selectedValues.splice(cardPosition, 1);
        
        // 从已使用集合中移除
        this.usedCardIndices.delete(index);
        
        // 恢复卡片原始颜色和缩放
        this.restoreCard(index);
        
        // 如果取消选中后，需要调整括号
        if (this.brackets.length > 0) {
            // 重置括号状态，简单处理
            this.brackets = [];
            this.bracketMode = 0;
            DebugLog.instance.log('重置括号状态');
        }
        
        // 调试信息
        DebugLog.instance.log('当前选中卡片:', this.selectedCards);
        DebugLog.instance.log('当前选中值:', this.selectedValues);
    }
    
    /**
     * 恢复卡片到原始状态
     */
    restoreCard(index: number) {
        if (index >= 0 && index < this.cards.length) {
            // 获取卡片的sprite子节点
            const spriteNode = this.cards[index].getChildByName("sprite");
            
            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    // 恢复原始颜色
                    sprite.color = new Color(255, 255, 255, 255);
                    DebugLog.instance.log(`恢复卡片${index}为白色`);
                }
            }
            
            // 恢复原始缩放
            this.cards[index].setScale(new Vec3(1, 1, 1));
            
            // 添加恢复动画效果
            tween(this.cards[index])
                .to(0.1, { scale: new Vec3(1.05, 1.05, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }
    }

    // 修改四则运算符方法
    addFunc() {
        // 必须先选卡片再选运算符
        if (this.selectedValues.length === 0) {
            DebugLog.instance.log('请先选择卡片');
            return;
        }
        
        // 运算符不能比卡片数量多
        if (this.operators.length >= this.selectedValues.length) {
            DebugLog.instance.log('运算符数量已达上限');
            return;
        }
        
        // 添加运算符
        this.operators.push('+');
        this.operatorTypes.push(SymbolsType.ADD);
        
        // 更新表达式
        this.updateExpression();
        
        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }

    subtractFunc() {
        // 必须先选卡片再选运算符
        if (this.selectedValues.length === 0) {
            DebugLog.instance.log('请先选择卡片');
            return;
        }
        
        // 运算符不能比卡片数量多
        if (this.operators.length >= this.selectedValues.length) {
            DebugLog.instance.log('运算符数量已达上限');
            return;
        }
        
        // 添加运算符
        this.operators.push('-');
        this.operatorTypes.push(SymbolsType.SUBTRACT);
        
        // 更新表达式
        this.updateExpression();
        
        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }

    multiplyFunc() {
        // 必须先选卡片再选运算符
        if (this.selectedValues.length === 0) {
            DebugLog.instance.log('请先选择卡片');
            return;
        }
        
        // 运算符不能比卡片数量多
        if (this.operators.length >= this.selectedValues.length) {
            DebugLog.instance.log('运算符数量已达上限');
            return;
        }
        
        // 添加运算符
        this.operators.push('×');
        this.operatorTypes.push(SymbolsType.MULTIPLY);
        
        // 更新表达式
        this.updateExpression();
        
        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }

    divideFunc() {
        // 必须先选卡片再选运算符
        if (this.selectedValues.length === 0) {
            DebugLog.instance.log('请先选择卡片');
            return;
        }
        
        // 运算符不能比卡片数量多
        if (this.operators.length >= this.selectedValues.length) {
            DebugLog.instance.log('运算符数量已达上限');
            return;
        }
        
        // 添加运算符
        this.operators.push('÷');
        this.operatorTypes.push(SymbolsType.DIVIDE);
        
        // 更新表达式
        this.updateExpression();
        
        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }
    
    /**
     * 括号按钮处理
     */
    bracketsFunc() {
        // 根据当前选择的数字数量决定括号逻辑
        const numValues = this.selectedValues.length;
        const numOperators = this.operators.length;
        
        // 确保至少有两个数字和一个运算符才能添加括号
        if (numValues < 2 || numOperators < 1) {
            DebugLog.instance.log('至少需要2个数字和1个运算符才能添加括号');
            this.setLabel('需要2个数字和1个运算符');
            setTimeout(() => {
                this.updateExpression();
            }, 1000);
            return;
        }
        
        // 清空现有括号
        this.brackets = [];
        
        // 根据不同数量的数字设置括号模式总数
        let maxModes = 2; // 两个数字时有2种模式：有括号/无括号
        if (numValues === 3) maxModes = this.num3Values.length; 
        if (numValues === 4) maxModes = this.num4Values.length;
        
        // 切换到下一个括号模式
        this.bracketMode = (this.bracketMode + 1) % maxModes;
        
        // 更新hasBrackets状态
        this.hasBrackets = this.bracketMode !== 0;
        
        // 根据当前模式和数字数量设置括号，确保括号只出现在数字前后
        if (numValues === 2) {
            // 两个数字的情况：要么无括号，要么两个数字都在括号内
            if (this.bracketMode === 1) {
                this.brackets.push({start: 0, end: 1}); // (a op b)
            }
        } else if (numValues === 3) {
            // 三个数字的括号情况
            switch (this.bracketMode) {
                case 0: // 无括号
                    break;
                case 1: // (a op b) op c
                    this.brackets.push({start: 0, end: 1});
                    break;
                case 2: // a op (b op c)
                    this.brackets.push({start: 1, end: 2});
                    break;
                case 3: // ((a op b) op c)
                    this.brackets.push({start: 0, end: 1});
                    this.brackets.push({start: 0, end: 2});
                    break;
                case 4: // (a op (b op c))
                    this.brackets.push({start: 1, end: 2});
                    this.brackets.push({start: 0, end: 2});
                    break;
            }
        } else if (numValues === 4) {
            // 四个数字的括号情况
            switch (this.bracketMode) {
                case 0: // 无括号
                    break;
                case 1: // (a op b) op c op d
                    this.brackets.push({start: 0, end: 1});
                    break;
                case 2: // a op (b op c) op d
                    this.brackets.push({start: 1, end: 2});
                    break;
                case 3: // a op b op (c op d)
                    this.brackets.push({start: 2, end: 3});
                    break;
                case 4: // ((a op b) op c) op d
                    this.brackets.push({start: 0, end: 1});
                    this.brackets.push({start: 0, end: 2});
                    break;
                case 5: // (a op (b op c)) op d
                    this.brackets.push({start: 1, end: 2});
                    this.brackets.push({start: 0, end: 2});
                    break;
                case 6: // (a op ((b op c) op d))
                    this.brackets.push({start: 1, end: 2});
                    this.brackets.push({start: 1, end: 3});
                    this.brackets.push({start: 0, end: 3});
                    break;
                case 7: // (a op (b op (c op d)))
                    this.brackets.push({start: 2, end: 3});
                    this.brackets.push({start: 1, end: 3});
                    this.brackets.push({start: 0, end: 3});
                    break;
                case 8: // (a op b) op (c op d)
                    this.brackets.push({start: 0, end: 1});
                    this.brackets.push({start: 2, end: 3});
                    break;
            }
        }
        
        // 显示当前括号模式提示
        this.showBracketModeHint();
        
        // 更新表达式
        this.updateExpression();
        
        // 检查是否可以自动提交
        this.checkAutoSubmit();
    }

    private num3Values = [
        "无括号",
        "括号模式: (a op b) op c",
        "括号模式: a op (b op c)",
        "括号模式: ((a op b) op c)",
        "括号模式: (a op (b op c))"
    ];

    private num4Values = [
        "无括号",
        "括号模式: (a op b) op c op d",
        "括号模式: a op (b op c) op d",
        "括号模式: a op b op (c op d)",
        "括号模式: ((a op b) op c) op d",
        "括号模式: (a op (b op c)) op d",
        "括号模式: (a op ((b op c) op d))",
        "括号模式: (a op (b op (c op d)))",
        "括号模式: (a op b) op (c op d)",
    ];
    
    /**
     * 显示当前括号模式提示
     */
    showBracketModeHint() {
        const numValues = this.selectedValues.length;
        let hintText = "";
        
        if (this.bracketMode === 0) {
            hintText = "无括号";
        } else {
            if (numValues === 2) {
                hintText = "括号模式: (a op b)";
            } else if (numValues === 3) {
                this.num3Values
                hintText = this.num3Values[this.bracketMode];
            } else if (numValues === 4) {
                hintText = this.num4Values[this.bracketMode];
            }
        }
        
        // 在UI上显示提示，可以使用临时弹出提示或在某个文本区域显示
        DebugLog.instance.log(hintText);
        
        // 在屏幕上显示短暂提示
        this.setLabel(hintText);
        
        // 2秒后恢复原始表达式显示
        setTimeout(() => {
            this.updateExpression();
        }, 1000);
    }

    /**
     * 重置卡牌状态
     */
    resetCardStatus() {
        DebugLog.instance.log('重置所有卡牌状态');
        
        // 重置所有卡牌的状态
        for (let i = 0; i < this.cards.length; i++) {
            const spriteNode = this.cards[i].getChildByName("sprite");
            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    // 恢复原始颜色
                    sprite.color = new Color(255, 255, 255, 255);
                    DebugLog.instance.log(`重置卡片${i}颜色为白色`);
                }
            }
            
            // 恢复原始缩放
            this.cards[i].setScale(new Vec3(1, 1, 1));
        }
        
        // 清空所有状态
        this.selectedCards = [];
        this.selectedValues = [];
        this.operators = [];
        this.operatorTypes = [];
        this.currentExpression = '';
        this.currentResult = 0;
        this.usedCardIndices.clear(); // 确保清空已使用的卡片集合
        this.brackets = [];
        this.bracketMode = 0;
        
        // 恢复标签颜色
        this.label.color = new Color(0, 0, 0, 255);
        
        // 清空显示
        this.setLabel("");
        
        DebugLog.instance.log('卡牌状态已全部重置');
    }

    refreshView(){
        this.mainView.active = true;

        this.setLabel("");
        // this.label.string = "";
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.showStartAlert({ parentNode: this.mainView, start: this.startGameByAlert, context: this });
        } else {

        }
    }

    flipCard(){
        // 确保卡片值已更新
        DebugLog.instance.log('翻转卡牌，当前卡牌值:', this.cardValues);
        
        this.cards.forEach((card:Node, index:number)=>{
            let sprite = card.getChildByName("sprite").getComponent(Sprite);
            // 动画半程时长
            const halfDuration = this.flipDuration / 2;
            // 初始确保 scale 为 (1, 1, 1)
            card.setScale(new Vec3(1, 1, 1));
            let self = this;
            tween(card)
                // 第一阶段：X轴从 1 缩放到 0
                .to(halfDuration, { scale: new Vec3(0, 1, 1) })
                .call(() => {
                    // 如果当前是正面，切换到背面
                    if (self.isFront) {
                        sprite.spriteFrame = self.backFrame!;
                    } else {
                        // 随机选择一个花色
                        const flowerTypes = [
                            self._blackCardRes,  // 黑桃
                            self._clubCardRes,   // 梅花
                            self._diamondCardRes, // 方块
                            self._heartCardRes   // 红心
                        ];
                        const randomFlower = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
                        
                        // 获取当前卡片的数字值，确保在有效范围内
                        if (index < self.cardValues.length) {
                            const cardNumber = self.cardValues[index] - 1;
                            DebugLog.instance.log(`加载卡片${index}图片，值=${self.cardValues[index]}, 图片索引=${cardNumber}`);
                            let cardDisplayValue:string = cardNumber.toString(); // 数字转字符串
                            
                            // 清除可能的缓存
                            sprite.spriteFrame = null;
                            
                            // 构建完整的图片路径
                            const imagePath = randomFlower + cardDisplayValue;
                            
                            const bundle = assetManager.getBundle(self.bundleName);
                            if (sprite.spriteFrame && sprite.spriteFrame.texture) {
                                sprite.spriteFrame.texture.destroy();
                            }
                            
                            bundle.load(imagePath+"/spriteFrame",SpriteFrame,(err,sp)=>{
                                if(err){
                                    DebugLog.instance.error('加载卡片图片失败:', imagePath, err);
                                    sprite.spriteFrame = self.frontFrame!;
                                    return;
                                }
                                sprite.spriteFrame = sp;
                            });
                        } else {
                            DebugLog.instance.error('卡片索引超出范围:', index, '当前卡片值数组:', self.cardValues);
                            sprite.spriteFrame = self.frontFrame!;
                        }
                    }
                })
                // 第二阶段：X轴从 0 缩放回 1
                .to(halfDuration, { scale: new Vec3(1, 1, 1) })
                .call(() => {
                    // 更新状态
                    self.isFront = !self.isFront;
                    if(!self.timerComponent.isRun()){
                        self.startTime(self.time);
                        
                        // 显示当前难度级别
                        if (!self.isFront) { // 只在翻到正面时显示
                            const difficultyText = ['简单', '中等', '困难'][self.hardIndex];
                            self.setLabel(`难度：${difficultyText}`);
                            // self.label.string = `难度：${difficultyText}`;
                            
                            // 延迟一会后清空提示文字
                            setTimeout(() => {
                                self.setLabel("");
                                // self.label.string = "";
                            }, 1500);
                        }
                    }
                })
                .start();
        })
    }

    startGameByAlert(){
        // 串烧训练时间配置
        this.startTime(this.time);
    }

    startGameCenterGame(){
        this.flipCard();
    }

    startGameCenterNextGame(){

    }

    retryGameCenterGame(){

    }

    checkFunc(){
        if (this.label.string == "24"){
            this.onSuccess();
        } else {
            this.onFail();
        }
    }

    /**
     * 高亮显示卡牌
     */
    highlightCard(index: number) {
        if (index >= 0 && index < this.cards.length) {
            const spriteNode = this.cards[index].getChildByName("sprite");
            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    sprite.color = new Color(255, 255, 0, 255); // 黄色高亮
                    DebugLog.instance.log(`设置卡片${index}高亮为黄色`);
                }
            }
        }
    }
    
    /**
     * 清除所有高亮显示
     */
    clearHighlights() {
        for (const index of this.selectedCards) {
            if (index >= 0 && index < this.cards.length) {
                const spriteNode = this.cards[index].getChildByName("sprite");
                if (spriteNode) {
                    const sprite = spriteNode.getComponent(Sprite);
                    if (sprite) {
                        // 恢复卡片原始颜色
                        sprite.color = new Color(255, 255, 255, 255);
                        DebugLog.instance.log(`恢复卡片${index}的原始颜色`);
                    }
                }
                
                // 恢复原始缩放
                this.cards[index].setScale(new Vec3(1, 1, 1));
            }
        }
    }

    equalFunc(){
        // 如果没有完成表达式，不能计算
        if (this.selectedValues.length < 2 || this.operators.length < 1) {
            DebugLog.instance.log('表达式不完整');
            return;
        }
        
        // 计算当前表达式结果
        const result = this.calculateExpressionWithBrackets();
        
        // 显示结果
        this.setLabel(`${this.currentExpression} = ${result}`);
        // this.label.string = `${this.currentExpression} = ${result}`;
        
        // 检查结果是否为24
        setTimeout(() => {
            if (Math.abs(result - 24) < 0.000001) {
                this.onSuccess();
            } else {
                this.onFail();
            }
        }, 800);
    }

    refreshFunc(){
        DebugLog.instance.log('刷新训练状态...');
        
        // 重置训练状态，但保留当前题目
        this.resetCardStatus();
        this._isGameCompleted = false; // 重置游戏完成状态
        
        // 记录已刷新状态，防止重复操作
        DebugLog.instance.log('刷新前状态检查:');
        DebugLog.instance.log('- 选中卡片数量:', this.selectedCards.length);
        DebugLog.instance.log('- 已使用卡片:', Array.from(this.usedCardIndices));
        
        // 确保已使用的卡片集合被清空
        this.usedCardIndices.clear();
        
        this.setLabel("");
        
        // 刷新卡牌显示，确保翻转
        this.forceRefreshCardDisplay();
        
        DebugLog.instance.log('刷新后状态检查:');
        DebugLog.instance.log('- 选中卡片数量:', this.selectedCards.length);
        DebugLog.instance.log('- 已使用卡片:', Array.from(this.usedCardIndices));
    }

    quitGame(){
        this.pauseTime();
        SceneManager.getInstance().backToHall();
        //super.quitGame({parentNode:this.mainView,context:this})
    }

    onSuccess(){
        this._isGameCompleted = true; // 设置游戏完成状态
        this.mainView.active = true;
        this.playAudio("music/win");
        
        // 记录成功，可以在这里添加分数统计等逻辑
        DebugLog.instance.log('成功解决题目:', this.currentQuestion);
        
        // 使用游戏大厅的结算界面
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: true,
            nextHandler: () => {
                // 增加难度
                this.hardIndex = (this.hardIndex + 1) % 3; // 0->1->2->0 循环
                
                // 重置训练视图
                this.mainView.active = true;
                
                // 加载新题目
                this.loadNewQuestion();
                
                // 刷新卡牌显示
                this.forceRefreshCardDisplay();
                
                DebugLog.instance.log('切换到难度:', this.hardIndex + 1);
            },
            againHandler: () => {
                // 重新开始当前难度
                this.mainView.active = true;
                
                // 加载新题目
                this.loadNewQuestion();
                
                // 刷新卡牌显示
                this.forceRefreshCardDisplay();
                
                DebugLog.instance.log('重新开始当前难度:', this.hardIndex + 1);
            }
        });
    }

    onFail(){
        this._isGameCompleted = true; // 设置游戏完成状态
        this.playAudio("music/fail");
        
        // 可以在这里显示正确解法
        DebugLog.instance.log('题目解法:', this.currentQuestion?.solutions);
        
        // 显示正确解法
        let solutionText = "";
        if (this.currentQuestion && this.currentQuestion.solutions && this.currentQuestion.solutions.length > 0) {
            solutionText = `正确解法: ${this.currentQuestion.solutions[0]}`;
        }
        
        // 使用游戏大厅的结算界面
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: false,
            nextHandler: () => {
                // 重置训练视图
                this.mainView.active = true;
                
                // 加载新题目，保持当前难度不变
                this.loadNewQuestion();
                
                // 刷新卡牌显示
                this.forceRefreshCardDisplay();
            },
            againHandler: () => {
                // 重新开始当前难度
                this.mainView.active = true;

                // 加载新题目，保持当前难度不变
                this.loadNewQuestion();
                
                // 刷新卡牌显示
                this.forceRefreshCardDisplay();
                
                DebugLog.instance.log('重新开始当前难度:', this.hardIndex + 1);
            }
        });
    }

    onTimerEnd() {
        super.onTimerEnd();
        if (this.sceneModel.gameType == GameType.SKEWERS) {
                //上报数据
            this._requestSkewersGameComplete();
        } else {
            this._requestGameCenterComplete();
        }

    }

    private _requestSkewersGameComplete() {

    }

    private _requestGameCenterComplete() {

    }


    /**
     * 加载新题目
     */
    loadNewQuestion() {
        DebugLog.instance.log('加载新题目...');
        
        // 完全重置状态
        this.resetCardStatus();
        
        // 再次确保卡片使用状态被清空
        this.usedCardIndices.clear();
        this.selectedCards = [];
        this.selectedValues = [];
        
        // 根据当前难度选择题目
        const difficulty = this.hards[this.hardIndex];
        
        // 从题库获取题目
        this.currentQuestion = this.math24Database.getQuestion(difficulty);

        DebugLog.instance.log("加载新题目",this.currentQuestion);
        
        // 如果获取到题目，使用它的值
        if (this.currentQuestion) {
            this.cardValues = [...this.currentQuestion.numbers];
        } else {
            // 如果没有找到题目，使用默认值
            this.cardValues = [1, 3, 5, 7];
        }
        
        // 初始化卡片显示
        this.forceRefreshCardDisplay();
        
        DebugLog.instance.log('题目加载完成，状态检查:');
        DebugLog.instance.log('- 选中卡片:', this.selectedCards);
        DebugLog.instance.log('- 已使用卡片:', Array.from(this.usedCardIndices));
    }

    setLabel(str:string){
        this.label.string = str;
    }
    
    /**
     * 更新卡片显示
     */
    updateCardDisplay() {
        // 这里可以更新卡片的显示内容，例如显示卡片的数字等
        // 此处需要根据实际UI结构实现
        for (let i = 0; i < this.cards.length && i < this.cardValues.length; i++) {
            const cardLabel = this.cards[i].getComponentInChildren(Label);
            if (cardLabel) {
                cardLabel.string = this.cardValues[i].toString();
            }
        }
    }

    // 跳过当前题目，加载下一题
    skipQuestion() {
        this.loadNewQuestion();
        this.setLabel("");
        // this.label.string = "";
        this._curCardData = null;
    }

    /**
     * 清空当前操作，重新开始
     */
    clearFunc() {
        // 重置训练状态
        this.resetCardStatus();
        
        // 重新加载题目
        this.loadNewQuestion();
    }

    /**
     * 切换到下一题（增加难度）
     */
    // nextQuestion() {
    //     DebugLog.instance.log('切换到下一题...');
        
    //     // 重置训练状态
    //     this.resetCardStatus();
    //     this._isGameCompleted = false; // 重置游戏完成状态
        
    //     // 增加难度（循环切换）
    //     this.hardIndex = (this.hardIndex + 1) % 3; // 0->1->2->0 循环
        
    //     // 加载新题目
    //     this.loadNewQuestion();
        
    //     // 刷新卡牌显示
    //     this.forceRefreshCardDisplay();
        
    //     DebugLog.instance.log('切换到难度:', this.hardIndex + 1);
    // }

    /**
     * 切换到下一题（保持当前难度）
     */
    nextQuestionSameDifficulty() {
        DebugLog.instance.log('切换到下一题（保持当前难度）...');
        
        // 重置训练状态
        this.resetCardStatus();
        this._isGameCompleted = false; // 重置游戏完成状态
        
        // 保持当前难度不变
        // this.hardIndex 保持不变
        
        // 加载新题目
        this.loadNewQuestion();
        
        // 刷新卡牌显示
        this.forceRefreshCardDisplay();
        
        DebugLog.instance.log('保持难度:', this.hardIndex + 1);
    }

    /**
     * 显示答案
     */
    showAnswer() {
        DebugLog.instance.log('显示答案...');
        
        if (!this.currentQuestion || !this.currentQuestion.solutions || this.currentQuestion.solutions.length === 0) {
            DebugLog.instance.warn('当前没有题目或没有解法');
            return;
        }
        
        // 获取第一个解法作为答案
        const answer = this.currentQuestion.solutions[0];
        const cardNumbers = this.currentQuestion.numbers.join(', ');
        
        // 创建Alert数据
        const alertData = new AlertData();
        alertData.title = "题目答案";
        alertData.message = `题目数字：${cardNumbers}\n\n解法：${answer}`;
        alertData.cancelButtonVisible = false;
        alertData.confirmButtonText = "知道了";
        alertData.confirmCb = () => {
            DebugLog.instance.log('用户查看了答案');
        };
        
        // 显示Alert
        AlertManager.getInstance().showAlert(alertData);
    }

    /**
     * 下一题按钮点击事件
     */
    onClickNextQuestion() {
        DebugLog.instance.log('点击下一题按钮');
        this.nextQuestionSameDifficulty();
    }

    private _time = null;
    /**
     * 强制刷新所有卡牌的显示
     */
    forceRefreshCardDisplay() {
        // 先重置卡牌到背面
        this.cards.forEach((card:Node) => {
            let sprite = card.getChildByName("sprite").getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.backFrame!;
            }
        });
        
        this.isFront = false;

        if(this._time){
            clearTimeout(this._time);
            this._time = null;
        }
        
        // 执行翻转
        this._time = setTimeout(() => {
            this.flipCard();
        }, 300);
    }

    /**
     * 检查是否可以自动提交
     */
    checkAutoSubmit() {
        // 修改为不自动计算结果，让用户手动点击等号按钮
        // 原逻辑:
        // if (this.selectedCards.length === 4 && this.operators.length === 3) {
        //     setTimeout(() => {
        //         this.calculateFinalResult();
        //     }, 500);
        // }

        // 只高亮提示用户可以点击等号了
        if (this.selectedCards.length === 4 && this.operators.length === 3) {
            // 提示用户可以点击等号了
            DebugLog.instance.log('表达式已完成，请点击等号按钮计算结果');
            // 可以在这里添加等号按钮的高亮效果
        }
    }

    /**
     * 考虑括号计算表达式
     */
    calculateExpressionWithBrackets() {
        // 复制数组以免影响原始数据
        const values = [...this.selectedValues];
        const ops = [...this.operatorTypes];
        
        // 如果没有括号，直接计算
        if (this.brackets.length === 0) {
            return this.calculateWithPriority(values, ops);
        }
        
        // 复制一份括号，按嵌套深度排序（先处理最内层括号）
        const sortedBrackets = [...this.brackets].sort((a, b) => {
            // 计算括号范围大小
            const aSize = a.end - a.start;
            const bSize = b.end - b.start;
            return aSize - bSize; // 小的括号（内层括号）先处理
        });
        
        // 记录已处理的括号
        const processedBrackets = new Set<number>();
        
        // 处理每一对括号
        for (let i = 0; i < sortedBrackets.length; i++) {
            const bracket = sortedBrackets[i];
            
            // 如果这对括号已被处理（因为在计算过程中可能被删除），则跳过
            if (processedBrackets.has(i)) continue;
            
            // 计算括号范围内的值和运算符
            const bracketLength = bracket.end - bracket.start;
            if (bracketLength > 0) {
                // 获取括号范围内的值和运算符
                const bracketValues = values.slice(bracket.start, bracket.end + 1);
                const bracketOps = ops.slice(bracket.start, bracket.end);
                
                // 计算括号内结果
                const bracketResult = this.calculateWithPriority(bracketValues, bracketOps);
                
                // 用结果替换原数组中的值
                values.splice(bracket.start, bracketLength + 1, bracketResult);
                ops.splice(bracket.start, bracketLength);
                
                // 更新后续括号的位置（因为数组长度已变）
                for (let j = i + 1; j < sortedBrackets.length; j++) {
                    const nextBracket = sortedBrackets[j];
                    if (nextBracket.start > bracket.end) {
                        // 整个括号都在当前括号之后，需要调整位置
                        nextBracket.start -= bracketLength;
                        nextBracket.end -= bracketLength;
                    } else if (nextBracket.start >= bracket.start && nextBracket.end <= bracket.end) {
                        // 嵌套在当前括号内，已被处理
                        processedBrackets.add(j);
                    } else if (nextBracket.start < bracket.start && nextBracket.end > bracket.end) {
                        // 包含当前括号，需要调整结束位置
                        nextBracket.end -= bracketLength;
                    }
                }
            }
        }
        
        // 计算最终表达式
        return this.calculateWithPriority(values, ops);
    }
    
    /**
     * 按照运算符优先级计算结果
     */
    calculateWithPriority(values: number[], ops: number[]): number {
        if (values.length === 1) {
            return values[0];
        }
        
        // 复制数组以便操作
        const valCopy = [...values];
        const opsCopy = [...ops];
        
        // 第一轮：处理乘除法
        for (let i = 0; i < opsCopy.length; i++) {
            if (opsCopy[i] === SymbolsType.MULTIPLY || opsCopy[i] === SymbolsType.DIVIDE) {
                // 计算乘除法
                const result = this.calculateResult(valCopy[i], valCopy[i + 1], opsCopy[i]);
                
                // 替换计算结果
                valCopy.splice(i, 2, result);
                opsCopy.splice(i, 1);
                
                // 调整索引
                i--;
            }
        }
        
        // 第二轮：处理加减法
        while (opsCopy.length > 0) {
            const result = this.calculateResult(valCopy[0], valCopy[1], opsCopy[0]);
            valCopy.splice(0, 2, result);
            opsCopy.shift();
        }
        
        return valCopy[0];
    }
    
    /**
     * 计算最终结果（修改为使用新的计算方法）
     */
    calculateFinalResult() {
        if (this.selectedValues.length !== 4 || this.operators.length !== 3) {
            DebugLog.instance.log('表达式不完整');
            return;
        }
        
        // 使用考虑括号的计算方法
        const finalResult = this.calculateExpressionWithBrackets();
        
        // 显示最终结果
        setTimeout(() => {
            this.setLabel(`${this.currentExpression} = ${finalResult}`);
            // this.label.string = `${this.currentExpression} = ${finalResult}`;
            
            // 检查结果是否为24
            setTimeout(() => {
                if (Math.abs(finalResult - 24) < 0.000001) {
                    this.onSuccess();
                } else {
                    this.onFail();
                }
            }, 1000);
        }, 500);
    }
    
    /**
     * 计算两个数的四则运算结果
     */
    calculateResult(a: number, b: number, operator: number): number {
        switch (operator) {
            case SymbolsType.ADD:
                return a + b;
            case SymbolsType.SUBTRACT:
                return a - b;
            case SymbolsType.MULTIPLY:
                return a * b;
            case SymbolsType.DIVIDE:
                return a / b;
            default:
                return 0;
        }
    }
    
    /**
     * 禁用卡片（显示高亮效果表示已被选中）
     */
    disableCard(index: number) {
        if (index >= 0 && index < this.cards.length) {
            // 获取卡片的sprite子节点
            const spriteNode = this.cards[index].getChildByName("sprite");
            
            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    // 更改为明亮的高亮颜色，使用淡蓝色突出显示已选择的卡牌
                    sprite.color = new Color(100, 200, 255, 255); // 淡蓝色高亮效果
                    
                    // 为卡片添加轻微缩放效果，显示它已被选中
                    this.cards[index].setScale(new Vec3(0.95, 0.95, 1));
                    
                    // 播放选中声音（可选）
                    this.playAudio("click");
                    
                    // 可以在这里添加简单的动画效果
                    tween(this.cards[index])
                        .to(0.1, { scale: new Vec3(0.9, 0.9, 1) })
                        .to(0.1, { scale: new Vec3(0.95, 0.95, 1) })
                        .start();
                    
                    DebugLog.instance.log(`设置卡片${index}高亮颜色: 100,200,255,255`);
                }
            } else {
                DebugLog.instance.log(`卡片${index}没有找到sprite子节点`);
            }
        }
    }

    /**
     * 更新表达式显示
     */
    updateExpression() {
        DebugLog.instance.log("更新表达式显示:", this.selectedValues, this.operators);
        
        // 根据选择的卡片和运算符构建表达式
        let expressionParts = [];
        let values = this.selectedValues;
        let ops = this.operators;

        // 如果没有选择任何卡片，显示空
        if (values.length === 0) {
            this.setLabel("");
            // this.label.string = "";
            return;
        }

        // 构建基本表达式，插入数字和运算符
        for (let i = 0; i < values.length; i++) {
            expressionParts.push(values[i].toString());
            if (i < ops.length) {
                expressionParts.push(ops[i]);
            }
        }

        // 处理括号的情况
        let expression = expressionParts.join(' ');
        if (this.brackets.length > 0) {
            // 先转换成带括号的表达式
            expression = this.buildExpressionWithBrackets(expressionParts);
        }

        DebugLog.instance.log("最终表达式:", expression);
        
        // 保存当前表达式以便在其他地方使用
        this.currentExpression = expression;
        
        // 计算当前表达式的结果
        if (values.length > 1 && ops.length > 0) {
            try {
                this.currentResult = this.calculateExpressionWithBrackets();
                
                // 显示表达式和结果
                this.setLabel(`${expression} = ${this.currentResult}`);
                // this.label.string = `${expression} = ${this.currentResult}`;
                
                // 如果结果接近24，改变文本颜色以给予视觉反馈
                if (Math.abs(this.currentResult - 24) < 0.00001) {
                    this.label.color = new Color(0, 255, 0, 255); // 绿色，表示成功
                } else if (Math.abs(this.currentResult - 24) < 5) {
                    this.label.color = new Color(255, 255, 0, 255); // 黄色，表示接近
                } else {
                    this.label.color = new Color(0, 0, 0, 255); // 黑色，正常状态
                }
            } catch (e) {
                DebugLog.instance.error('计算表达式出错:', e);
                // 出错时只显示表达式
                this.setLabel(expression);
                // this.label.string = expression;
            }
        } else {
            // 只有一个数字或者没有运算符时，只显示表达式
            this.setLabel(expression);
            // this.label.string = expression;
        }
    }

    /**
     * 添加卡片到表达式
     */
    addCardToExpression(index: number, cardValue: number) {
        // 已选择了4张卡片，不再接受新的卡片
        if (this.selectedCards.length >= 4) {
            DebugLog.instance.log('已选择4张卡片');
            return;
        }
        
        // 添加到已选择的卡片
        this.selectedCards.push(index);
        this.selectedValues.push(cardValue);
        this.usedCardIndices.add(index);
        
        DebugLog.instance.log(`添加卡片${index}到表达式，值: ${cardValue}`);
        this.disableCard(index);
        
        // 调试信息
        DebugLog.instance.log('当前选中卡片:', this.selectedCards);
        DebugLog.instance.log('当前选中值:', this.selectedValues);
    }

    /**
     * 构建带括号的表达式
     */
    buildExpressionWithBrackets(expressionParts: string[]): string {
        // 首先构建基本表达式（不含括号）
        let baseExpression = '';
        for (let i = 0; i < expressionParts.length; i++) {
            if (i > 0) baseExpression += ' ';
            baseExpression += expressionParts[i];
        }
        
        // 如果没有括号，直接返回
        if (this.brackets.length === 0) {
            return baseExpression;
        }
        
        // 为了便于处理，先将表达式拆分为字符数组
        let chars = [];
        for (let i = 0; i < expressionParts.length; i++) {
            if (i > 0) chars.push(' ');
            
            // 将每个部分（数字或运算符）加入字符数组
            const part = expressionParts[i];
            for (let j = 0; j < part.length; j++) {
                chars.push(part[j]);
            }
            
            if (i < expressionParts.length - 1) chars.push(' ');
        }
        
        // 根据数字的位置计算括号的实际插入位置
        const positions = [];
        let numCount = 0;
        for (let i = 0; i < chars.length; i++) {
            // 检查是否是数字的起始位置
            const isDigitStart = i === 0 || (chars[i-1] === ' ' && /\d/.test(chars[i]));
            if (isDigitStart) {
                positions.push(i);
                numCount++;
            }
        }
        
        // 处理括号 - 从后向前添加，避免位置错误
        const insertPositions = [];
        for (const bracket of this.brackets) {
            // 确保位置有效
            if (bracket.start >= 0 && bracket.start < numCount && 
                bracket.end >= 0 && bracket.end < numCount && 
                bracket.start <= bracket.end) {
                
                // 计算实际插入位置
                const openPos = positions[bracket.start];
                
                // 找到结束数字的最后一位
                let endDigitPos = positions[bracket.end];
                while (endDigitPos < chars.length && /\d/.test(chars[endDigitPos])) {
                    endDigitPos++;
                }
                
                // 存储要插入的位置和括号
                insertPositions.push({pos: openPos, char: '('});
                insertPositions.push({pos: endDigitPos, char: ')'});
            }
        }
        
        // 按位置降序排序，以便从后向前插入
        insertPositions.sort((a, b) => b.pos - a.pos);
        
        // 插入括号
        for (const {pos, char} of insertPositions) {
            chars.splice(pos, 0, char);
        }
        
        // 将字符数组连接为字符串
        return chars.join('');
    }
    
    /**
     * 计算当前表达式的结果
     */
    calculateCurrentResult() {
        if (this.selectedValues.length > 1 && this.operators.length > 0) {
            try {
                this.currentResult = this.calculateExpressionWithBrackets();
            } catch (e) {
                DebugLog.instance.error('计算表达式出错:', e);
                this.currentResult = 0;
            }
        } else {
            this.currentResult = this.selectedValues.length > 0 ? this.selectedValues[0] : 0;
        }
    }

    protected onDestroy(): void {
        // 移除应用状态监听
        game.off(Game.EVENT_HIDE, this.onAppHide, this);
        game.off(Game.EVENT_SHOW, this.onAppShow, this);
        
        super.onDestroy();
    }

    /**
     * 添加应用前后台切换监听
     */
    private addAppStateListener() {
        // 监听应用进入后台
        game.on(Game.EVENT_HIDE, this.onAppHide, this);
        // 监听应用回到前台
        game.on(Game.EVENT_SHOW, this.onAppShow, this);
    }
    
    /**
     * 应用进入后台时的处理
     */
    private onAppHide() {
        DebugLog.instance.log("应用进入后台，暂停游戏并显示退出弹窗");
        
        // 暂停计时器
        if (this.timerComponent) {
            this.timerComponent.pauseTimer();
        }
        
        // 暂停游戏状态
        // this.isAbleClick = false;
        
        // 显示退出弹窗
        this.showPauseAlert();
    }
    
    /**
     * 应用回到前台时的处理
     */
    private onAppShow() {
        DebugLog.instance.log("应用回到前台，恢复游戏");
        
        // 如果游戏在结算阶段，不恢复倒计时
        if (this._isGameCompleted) {
            DebugLog.instance.log("游戏在结算阶段，不恢复倒计时");
            return;
        }
        
        // 恢复计时器
        if (this.timerComponent) {
            this.timerComponent.resumeTimer();
        }
        
        // 恢复游戏状态
        // this.isAbleClick = true;
    }

    /**
     * 显示暂停弹窗
     */
    private showPauseAlert() {
        // 使用现有的quitGame方法显示退出弹窗
        // this.quitGame({ parentNode: this.mainView, context: this });
    }
}