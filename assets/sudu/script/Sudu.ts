import { _decorator, resources, Label, Node, Sprite, SpriteFrame, ProgressBar, VideoPlayer, VideoClip, assetManager, game, Game, ParticleAsset, AudioClip, AudioSource, Color, UITransform, Vec3, RichText, tween, screen, Widget } from 'cc';
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { AudioManager } from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { SkewersManager } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import { SkewersGameStatus } from "db://assets/resources/scripts/Core/Data/GameState";
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { SettlementPanel } from '../../resources/scripts/Core/UI/SettlementPanel';
import { AlertManager, AlertData } from '../../resources/scripts/Core/Manager/Alert/AlertManager';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { AlertType } from '../../resources/scripts/Game/UI/Alert/GameAlert';
import { Global } from '../../resources/scripts/Core/Manager/Config/Global';
import { SudokuDifficulty } from './SudukuGenerator';
import { SuduModel } from './SuduModel';
import { SuduItem } from './SuduItem';
import { SuduBtnItem } from './SuduBtnItem';
const { ccclass, property } = _decorator;

@ccclass('Sudu')
export class Sudu extends BaseScene<IBaseGameChild> {
    @property(Node)
    mainView: Node = null;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;

    @property(Label)
    private progresslabel: Label = null;

    @property(Label)
    private descLabel: Label = null;

    @property(ProgressBar)
    private progress: ProgressBar = null;

    @property(Node)
    quitBtn: Node;

    @property(Node)
    itemGroup: Node = null;

    @property(Node)
    btnGroup: Node = null;

    @property(Node)
    noticeBtnNode: Node;

    @property(Node)
    restartBtnNode: Node;

    @property(Node)
    submitBtnNode: Node;

    @property(Node)
    failViewNode: Node;

    protected bundleName: string = BundleName.SUDU;

    protected audioUrls = ['music/bgm', "music/win", "music/fail", "music/click"];

    /** 当前选中的格子位置 */
    private _selectedCell: { row: number, col: number } | null = null;

    /** 格子UI组件引用 */
    private _cellItems: SuduItem[][] = [];

    /** 数字按钮组件引用 */
    private _btnItems: SuduBtnItem[] = [];

    /** 数据模型 */
    private _model: SuduModel = null;

    /** 九宫格背景颜色（随机清淡色系） */
    private _boxColors: Color[] = [];


    onLoad(): void {
        this.loadAudio().then(() => {
            this.playBgmAudio('music/bgm', true);
        });

        // 获取数据模型实例
        this._model = SuduModel.getInstance();
    }

    start() {
        super.start();

        if (this.failViewNode) {
            this.failViewNode.active = false;
            const baseWidget = this.failViewNode.getComponent(Widget);
            if (baseWidget) {
                baseWidget.updateAlignment();
            }
            // 更新 bg 的 Widget 适配
            const bgNode = this.failViewNode.getChildByName('bg');
            if (bgNode) {
                const widget = bgNode.getComponent(Widget);
                if (widget) {
                    widget.updateAlignment();
                }
            }
        }

        // 初始化数字按钮
        this.initBtnItems();

        // 从 sceneModel 获取难度等级
        let difficulty = 1;
        if (this.sceneModel) {
            difficulty = (this.sceneModel as any).difficulty || 1;
            DebugLog.instance.log(`从 sceneModel 获取难度: ${difficulty}`);
        }

        // 初始化游戏
        this.initGame(difficulty);
    }

    /**
     * 初始化数字按钮
     */
    private initBtnItems(): void {
        if (!this.btnGroup) return;

        this._btnItems = [];
        const children = this.btnGroup.children;

        for (let i = 0; i < children.length && i < 9; i++) {
            const btnItem = children[i].getComponent(SuduBtnItem);
            if (btnItem) {
                // 数字从1开始
                const num = i + 1;
                btnItem.init(num, this.onBtnClick.bind(this));
                this._btnItems.push(btnItem);
            }
        }

        DebugLog.instance.log(`数字按钮初始化完成，共 ${this._btnItems.length} 个按钮`);
    }

    /**
     * 数字按钮点击事件处理
     * @param num 点击的数字
     */
    private onBtnClick(num: number): void {
        DebugLog.instance.log(`点击数字按钮: ${num}`);

        // 填入数字到选中的格子
        this.fillNumber(num);
    }

    /**
     * 初始化游戏
     * @param difficulty 难度等级，默认为简单 (1=简单, 2=中等, 3=困难)
     */
    public initGame(difficulty: number = 1): void {
        // 从模型获取题目
        this._model.getQuestion(difficulty);

        // 重置选中状态
        this._selectedCell = null;

        // 生成随机九宫格颜色
        this.generateBoxColors();

        // 初始化格子UI组件
        this.initCellItems();

        // 更新UI显示
        this.updateGridUI();

        DebugLog.instance.log(`数独游戏初始化完成，难度: ${difficulty}, 空格数: ${this._model.emptyCount}`);

        // 打印题目到控制台（调试用）
        this._model.printPuzzle();
    }

    /**
     * 根据行列获取九宫格索引 (0-8)
     * @param row 行索引
     * @param col 列索引
     * @returns 九宫格索引
     */
    private getBoxIndex(row: number, col: number): number {
        return Math.floor(row / 3) * 3 + Math.floor(col / 3);
    }

    /**
     * 生成一个随机的清淡颜色
     * RGB值在 210-250 之间，确保颜色清淡
     * @returns 随机清淡颜色
     */
    private generateLightColor(): Color {
        const min = 210;
        const max = 250;
        const r = Math.floor(Math.random() * (max - min + 1)) + min;
        const g = Math.floor(Math.random() * (max - min + 1)) + min;
        const b = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Color(r, g, b, 255);
    }

    /**
     * 生成9种不同的随机清淡颜色用于九宫格
     */
    private generateBoxColors(): void {
        this._boxColors = [];
        for (let i = 0; i < 9; i++) {
            this._boxColors.push(this.generateLightColor());
        }
        DebugLog.instance.log('生成随机九宫格颜色完成');
    }

    /**
     * 初始化格子UI组件，将题目数据赋值到itemGroup中
     */
    private initCellItems(): void {
        if (!this.itemGroup) return;

        // 初始化二维数组
        this._cellItems = [];
        for (let row = 0; row < 9; row++) {
            this._cellItems[row] = [];
        }

        const groupNode = this.itemGroup.getChildByName('group');
        if (!groupNode) {
            DebugLog.instance.error('找不到 group 节点');
            return;
        }

        const children = groupNode.children;
        const playerGrid = this._model.playerGrid;

        for (let i = 0; i < children.length && i < 81; i++) {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const item = children[i].getComponent(SuduItem);

            if (item) {
                // 初始化格子位置，并设置点击回调
                item.init(row, col, this.onCellClick.bind(this));

                // 存储引用到二维数组
                this._cellItems[row][col] = item;

                // 重置状态
                item.setSelected(false);
                item.setError(false);

                // 设置九宫格背景颜色
                const boxIndex = this.getBoxIndex(row, col);
                item.setBgColor(this._boxColors[boxIndex]);

                // 设置数据
                const value = playerGrid[row][col];
                const isFixed = this._model.isFixedCell(row, col);

                if (value === 0) {
                    item.clearData();
                } else {
                    item.setData(value.toString(), isFixed);
                }
            }
        }

        DebugLog.instance.log(`格子初始化完成，共 ${children.length} 个格子`);
    }

    /**
     * 格子点击事件处理
     * @param item 被点击的格子
     */
    private onCellClick(item: SuduItem): void {
        const row = item.row;
        const col = item.col;

        DebugLog.instance.log(`点击格子: [${row}, ${col}]`);

        // 选中格子
        this.selectCell(row, col);

        // 播放点击音效
        this.playAudio('music/click');
    }

    /**
     * 更新网格UI显示
     */
    private updateGridUI(): void {
        if (!this._cellItems || this._cellItems.length === 0) return;

        const playerGrid = this._model.playerGrid;

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const item = this._cellItems[row]?.[col];
                if (item) {
                    const value = playerGrid[row][col];
                    const isFixed = this._model.isFixedCell(row, col);

                    if (value === 0) {
                        item.clearData();
                    } else {
                        item.setData(value.toString(), isFixed);
                    }

                    // 清除错误状态
                    item.setError(false);
                }
            }
        }

        // 更新进度显示
        // this.updateProgress();
    }

    /**
     * 更新进度显示
     */
    private updateProgress(): void {
        if (this.progress) {
            this.progress.progress = this._model.getProgress();
        }
        if (this.progresslabel) {
            const remaining = this._model.getRemainingEmpty();
            this.progresslabel.string = `剩余: ${remaining}`;
        }
    }

    /**
     * 选中某个格子
     * @param row 行索引
     * @param col 列索引
     */
    public selectCell(row: number, col: number): void {
        // 检查是否是原始题目中的固定数字
        if (this._model.isFixedCell(row, col)) {
            DebugLog.instance.log('此格子为固定数字，无法修改');
            return;
        }

        this._selectedCell = { row, col };

        // 更新选中状态UI
        this.updateSelectionUI();
    }

    /**
     * 更新选中状态UI
     */
    private updateSelectionUI(): void {
        if (!this._cellItems || this._cellItems.length === 0) return;

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const item = this._cellItems[row]?.[col];
                if (item) {
                    const isSelected = this._selectedCell &&
                        this._selectedCell.row === row &&
                        this._selectedCell.col === col;
                    item.setSelected(isSelected);
                }
            }
        }
    }

    /**
     * 填入数字
     * @param num 要填入的数字 (1-9)
     */
    public fillNumber(num: number): void {
        if (!this._selectedCell) {
            DebugLog.instance.log('请先选择一个格子');
            return;
        }

        const { row, col } = this._selectedCell;

        // 通过模型填入数字
        if (!this._model.fillNumber(row, col, num)) {
            DebugLog.instance.log('此格子为固定数字，无法修改');
            return;
        }

        // 播放点击音效
        this.playAudio('music/click');

        // 更新UI
        this.updateGridUI();

        // // 检查是否完成
        // this.checkCompletion();
    }

    /**
     * 清除选中格子的数字
     */
    public clearSelectedCell(): void {
        if (!this._selectedCell) return;

        const { row, col } = this._selectedCell;

        // 通过模型清除
        this._model.clearCell(row, col);
        this.updateGridUI();
    }

    /**
     * 检查游戏是否完成
     */
    private checkCompletion(): void {
        // 检查是否所有格子都已填满
        if (!this._model.isComplete()) {
            return; // 还有空格，未完成
        }

        // 验证答案是否正确
        if (this._model.validateAnswer()) {
            this.onGameWin();
        } else {
            this.onGameError();
        }
    }

    /**
     * 游戏胜利
     */
    private onGameWin(): void {
        DebugLog.instance.log('恭喜！数独完成！');

        // 停止背景音乐
        this.pauseBgmAudio();

        this.playAudio('music/win');

        // 显示结算面板
        this.showSettlementPanel(true);
    }

    /** 失败倒计时定时器 */
    private _failCountdownTimer: number = null;

    /**
     * 答案错误
     */
    private onGameError(): void {
        DebugLog.instance.log('答案有误，请检查！');

        // 停止背景音乐
        this.pauseBgmAudio();

        this.playAudio('music/fail');

        // 标记错误的格子
        this.markErrorCells();

        // 显示正确答案
        this.showCorrectAnswer();

        // 显示失败界面，并将正确答案显示到失败界面中
        if (this.failViewNode) {
            this.failViewNode.active = true;
            this.showCorrectAnswerInFailView();

            // 从右往左 tween 动画，效果与 UIManager showPanel 一致
            const screenWidth = screen.windowSize.width;
            this.failViewNode.setPosition(new Vec3(screenWidth, 0, 0));
            tween(this.failViewNode)
                .to(0.3, { position: new Vec3(0, 0, 0) }, { easing: 'quartOut' })
                .start();
        }
    }

    /**
     * 显示正确答案到itemGroup上
     */
    private showCorrectAnswer(): void {
        if (!this._cellItems || this._cellItems.length === 0) return;

        const solution = this._model.getSolution();
        if (!solution) return;

        DebugLog.instance.log('显示正确答案');

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const item = this._cellItems[row]?.[col];
                if (item) {
                    const correctValue = solution[row][col];
                    const isFixed = this._model.isFixedCell(row, col);

                    // 设置正确答案
                    item.setData(correctValue.toString(), isFixed);

                    // 清除错误标记（因为现在显示的是正确答案）
                    item.setError(false);
                }
            }
        }
    }

    /**
     * 将正确答案显示到失败界面的itemGroup中
     * 固定数字为黑色，玩家填入的数字为蓝色
     * 九宫格背景使用不同的清淡颜色区分
     */
    private showCorrectAnswerInFailView(): void {
        if (!this.failViewNode) return;

        const solution = this._model.getSolution();
        if (!solution) return;

        // 获取失败界面中的 itemGroup
        const failItemGroup = this.failViewNode.getChildByName("view")?.getChildByName('itemGroup');
        if (!failItemGroup) {
            DebugLog.instance.error('失败界面中找不到 itemGroup 节点');
            return;
        }

        // 获取 group 节点
        const groupNode = failItemGroup.getChildByName('group');
        if (!groupNode) {
            DebugLog.instance.error('失败界面中找不到 group 节点');
            return;
        }

        const children = groupNode.children;

        DebugLog.instance.log('将正确答案显示到失败界面');

        for (let i = 0; i < children.length && i < 81; i++) {
            const row = Math.floor(i / 9);
            const col = i % 9;
            const item = children[i].getComponent(SuduItem);

            if (item) {
                const correctValue = solution[row][col];
                const isFixed = this._model.isFixedCell(row, col);

                // 设置九宫格背景颜色
                const boxIndex = this.getBoxIndex(row, col);
                item.setBgColor(this._boxColors[boxIndex]);

                // 设置正确答案，颜色会根据 isFixed 自动设置
                // 固定数字：黑色 (0, 0, 0)
                // 玩家填入的数字：蓝色 (0, 100, 200)
                item.setData(correctValue.toString(), isFixed);

                // 清除选中和错误状态
                item.setSelected(false);
                item.setError(false);
            }
        }
    }

    /**
     * 开始失败倒计时
     * @param seconds 倒计时秒数
     */
    private startFailCountdown(seconds: number): void {
        let countdown = seconds;

        // 清除之前的定时器
        if (this._failCountdownTimer !== null) {
            clearInterval(this._failCountdownTimer);
            this._failCountdownTimer = null;
        }

        // 更新进度标签显示倒计时
        if (this.descLabel) {
            this.descLabel.string = `展示答案，${countdown}秒后继续...`;
        }

        this._failCountdownTimer = setInterval(() => {
            countdown--;

            if (this.descLabel) {
                this.descLabel.string = `展示答案，${countdown}秒后继续...`;
            }

            if (countdown <= 0) {
                // 清除定时器
                if (this._failCountdownTimer !== null) {
                    clearInterval(this._failCountdownTimer);
                    this._failCountdownTimer = null;
                }

                // 自动进入下一关
                this.onFailNextClick();
            }
        }, 1000) as unknown as number;
    }

    /**
     * 显示结算面板
     * @param isWin 是否胜利
     */
    private showSettlementPanel(isWin: boolean): void {
        const panelData = {
            result: isWin,
            mode: "result",
            againHandler: () => {
                // 清空描述标签
                this.clearDescLabel();
                // 重新开启背景音乐
                this.playBgmAudio('music/bgm', true);
                // 重玩当前题目
                this.restartGame();
            },
            nextHandler: () => {
                // 清空描述标签
                this.clearDescLabel();
                // 重新开启背景音乐
                this.playBgmAudio('music/bgm', true);
                // 开始新游戏
                this.newGame();
            }
        };

        UIManager.getInstance().showPanel(SettlementPanel.NAME, panelData);
    }

    /**
     * 清空描述标签
     */
    private clearDescLabel(): void {
        if (this.descLabel) {
            this.descLabel.string = "";
        }
    }

    /**
     * 标记错误的格子
     */
    private markErrorCells(): void {
        if (!this._cellItems || this._cellItems.length === 0) return;

        const errors = this._model.getErrorCells();

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const item = this._cellItems[row]?.[col];
                if (item) {
                    const isError = errors.some(e => e.row === row && e.col === col);
                    item.setError(isError);
                }
            }
        }
    }

    /**
     * 提交答案
     * 将玩家填入的数字与正确答案进行比对
     */
    public submit(): void {
        DebugLog.instance.log('提交答案');

        // 检查是否所有格子都已填满
        if (!this._model.isComplete()) {
            // 还有空格未填写，用Toast提示用户
            AlertManager.getInstance().showToastAlert("还有空格未填写，请填写完整后再提交");
            return;
        }

        // 验证答案是否正确
        if (this._model.validateAnswer()) {
            // 答案正确，走胜利流程
            this.onGameWin();
        } else {
            // 答案错误，走失败流程
            this.onGameError();
        }
    }

    /**
     * 获取提示
     */
    public getHint(): void {
        if (!this._selectedCell) {
            DebugLog.instance.log('请先选择一个空格');
            return;
        }

        const { row, col } = this._selectedCell;

        if (this._model.isFixedCell(row, col)) {
            DebugLog.instance.log('此格子已有固定数字');
            return;
        }

        const hint = this._model.getHint(row, col);
        this.fillNumber(hint);
    }

    /**
     * 重新开始当前题目
     */
    public restartGame(): void {
        this.resetGame();
    }

    /**
     * 重置当前游戏状态，重新玩
     * 清除所有玩家填入的数字，保留原题目
     * 清除所有玩家填入的数字，保留原题目
     */
    public resetGame(): void {
        DebugLog.instance.log('重置游戏状态');

        // 重置模型中的玩家网格
        this._model.resetCurrentPuzzle();

        // 清除选中状态
        this._selectedCell = null;

        // 清除所有格子的错误状态和选中状态
        if (this._cellItems && this._cellItems.length > 0) {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const item = this._cellItems[row]?.[col];
                    if (item) {
                        item.setSelected(false);
                        item.setError(false);
                    }
                }
            }
        }

        // 更新UI显示
        this.updateGridUI();
        this.updateSelectionUI();

        // 播放点击音效
        this.playAudio('music/click');

        DebugLog.instance.log('游戏重置完成');
    }

    /**
     * 开始新游戏
     * @param difficulty 难度等级 (1=简单, 2=中等, 3=困难)
     */
    public newGame(difficulty?: number): void {
        this.initGame(difficulty || this._model.difficulty);
    }

    /**
     * 一键填入正确答案（用于测试）
     * 将正确答案直接填入到所有格子中
     */
    public fillAllAnswers(): void {
        const solution = this._model.getSolution();
        if (!solution) {
            DebugLog.instance.error('无法获取正确答案');
            return;
        }

        DebugLog.instance.log('一键填入正确答案');

        // 遍历所有格子，填入正确答案
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                // 跳过固定格子
                if (this._model.isFixedCell(row, col)) {
                    continue;
                }

                const correctValue = solution[row][col];

                // 通过模型填入数字
                this._model.fillNumber(row, col, correctValue);
            }
        }

        // 更新UI显示
        this.updateGridUI();

        // 播放点击音效
        this.playAudio('music/click');

        DebugLog.instance.log('所有答案已填入');
    }

    /**
     * 按钮点击事件
     */
    public clickBtn(event: Event, customEventData: string): void {
        const num = parseInt(customEventData, 10);
        if (num >= 1 && num <= 9) {
            this.fillNumber(num);
        } else if (num === 10) {
            this.clearSelectedCell();
        } else if (customEventData === 'hint') {
            this.getHint();
        }
    }

    /**
     * 获取数据模型
     */
    public get model(): SuduModel {
        return this._model;
    }

    /**
     * 获取指定位置的格子组件
     * @param row 行索引
     * @param col 列索引
     * @returns SuduItem组件或null
     */
    public getCellItem(row: number, col: number): SuduItem | null {
        if (row < 0 || row >= 9 || col < 0 || col >= 9) {
            return null;
        }
        return this._cellItems[row]?.[col] || null;
    }

    /**
     * 获取所有格子组件
     */
    public get cellItems(): SuduItem[][] {
        return this._cellItems;
    }

    quitGame() {
        this.pauseTime();
        // SceneManager.getInstance().backToGameCenter();
        super.quitGame({ parentNode: this.mainView, context: this })
    }

    /**
     * 失败界面 - 重玩按钮点击事件
     * 用于在编辑器中绑定 failViewNode 中的重玩按钮
     */
    public onFailRestartClick(): void {
        DebugLog.instance.log('失败界面 - 点击重玩按钮');

        // 清除失败倒计时定时器
        if (this._failCountdownTimer !== null) {
            clearInterval(this._failCountdownTimer);
            this._failCountdownTimer = null;
        }

        // 隐藏失败界面（带 tween 动画）
        this.hideFailViewWithAnimation(() => {
            // 清空描述标签
            this.clearDescLabel();

            // 重新开启背景音乐
            this.playBgmAudio('music/bgm', true);

            // 重玩当前题目
            this.restartGame();
        });
    }

    /**
     * 失败界面 - 下一关按钮点击事件
     * 用于在编辑器中绑定 failViewNode 中的下一关按钮
     */
    public onFailNextClick(): void {
        DebugLog.instance.log('失败界面 - 点击下一关按钮');

        // 清除失败倒计时定时器
        if (this._failCountdownTimer !== null) {
            clearInterval(this._failCountdownTimer);
            this._failCountdownTimer = null;
        }

        // 隐藏失败界面（带 tween 动画）
        this.hideFailViewWithAnimation(() => {
            // 清空描述标签
            this.clearDescLabel();

            // 重新开启背景音乐
            this.playBgmAudio('music/bgm', true);

            // 开始新游戏
            this.newGame();
        });
    }

    /**
     * 隐藏失败界面（带反向 tween 动画）
     * 效果与 UIManager hidePanel 一致
     * @param callback 动画完成后的回调
     */
    private hideFailViewWithAnimation(callback?: () => void): void {
        if (!this.failViewNode) {
            callback?.();
            return;
        }

        const screenWidth = screen.windowSize.width;
        tween(this.failViewNode)
            .to(0.3, { position: new Vec3(screenWidth, 0, 0) }, { easing: 'quartIn' })
            .call(() => {
                this.failViewNode.active = false;
                // 重置位置以便下次显示
                this.failViewNode.setPosition(new Vec3(0, 0, 0));
                callback?.();
            })
            .start();
    }

    /**
     * 组件销毁时清理资源
     */
    protected onDestroy(): void {
        // 清除失败倒计时定时器
        if (this._failCountdownTimer !== null) {
            clearInterval(this._failCountdownTimer);
            this._failCountdownTimer = null;
        }
    }
}