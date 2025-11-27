import { _decorator, resources, Label, Node, Sprite, SpriteFrame, ProgressBar, VideoPlayer, VideoClip, assetManager, game, Game, ParticleAsset, AudioClip, Color, UITransform, Vec3, RichText } from 'cc';
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { TimeUtil } from "../../resources/scripts/Core/Util/TimeUtil";
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { AudioManager } from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { SkewersManager } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import { SkewersGameType } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
import { EventManager } from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import { FrameComponent } from '../../resources/scripts/Core/Component/FrameComponent';
import { ScreenSizeUtil } from '../../resources/scripts/Adapter/ScreenSizeUtil';
import { IListeningConfig, ListeningModel } from './ListeningModel';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { SettlementPanel } from '../../resources/scripts/Core/UI/SettlementPanel';
import { AlertManager } from '../../resources/scripts/Core/Manager/Alert/AlertManager';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends BaseScene<IBaseGameChild> {

    @property(Node)
    mainView: Node = null;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;

    @property(Label)
    private progresslabel: Label = null;

    @property(ProgressBar)
    private progress: ProgressBar = null;


    @property(Label)
    private loadLabel: Label = null;

    @property(RichText)
    private answerCountLabel: RichText = null;

    @property(Node)
    quitBtn: Node;

    @property(Node)
    startBtn: Node;

    @property(Node)
    private videoNode: Node = null;

    @property(VideoPlayer)
    videoPlayer: VideoPlayer = null;

    @property(Node)
    private optionsNode: Node = null;

    @property(Node)
    private chooseNodes:Node = null;

    @property(Node)
    private upLine:Node = null;

    @property(Node)
    private leftLine:Node = null;

    @property(Node)
    private downLine:Node = null;  

    @property(Node)
    private rightLine:Node = null;

    protected bundleName: string = BundleName.LISTENINGMASTER;

    protected audioUrls = ['music/bgm',"music/win","music/fail","music/click"];

    private model: ListeningModel = null;

    private _questions: IListeningConfig[] = null;
    private _currentVideoPath: string = null; // 当前使用的视频路径

    private _totalDuration: number = 0; // 总时长（秒）
    private _elapsedTime: number = 0; // 已播放时间（秒）
    private _audioTimer: any = null; // 音频播放定时器
    private _durationTimer: any = null; // 总时长定时器
    private _firstAudioTimer: any = null; // 第一个音效延迟定时器
    private _isPlaying: boolean = false; // 是否正在播放
    private _pauseStartTime: number = 0; // 暂停开始的时间（用于计算暂停时长）
    private _playedQuestions: IListeningConfig[] = []; // 已播放的音效列表
    private _audioInterval: number = 3; // 音效之间的间隔时间（秒）
    private _firstAudioDelay: number = 3; // 第一个音效的延迟时间（秒）
    private _isFirstAudio: boolean = true; // 是否是第一个音效
    private _clickedIndices: Set<number> = new Set(); // 缓存点击过的按钮索引
    private _wrongAnswerIndex: number = -1; // 缓存错误答案索引
    private _currentDifficulty: number = 3; // 当前难度，默认3
    private _requiredAnswerCount: number = 3; // 对应难度需要的回答数量
    private _optionBank: IListeningConfig[] = null; // 选项题库
    private _selectedOptions: IListeningConfig[] = []; // 缓存选中的选项数据
    private _hasSubmittedAnswer: boolean = false; // 是否已经提交答案

    onLoad(): void {
        this.loadAudio().then(() => {
            this.playBgmAudio('music/bgm', true);
        });
    }

    // /**
    //  * 随机选择并播放背景音乐
    //  */
    // private randomPlayBgm() {
    //     const bgmOptions = ['music/bgm', 'music/bgm1', 'music/bgm2'];
    //     const randomBgm = bgmOptions[Math.floor(Math.random() * bgmOptions.length)];
    //     this.playBgmAudio(randomBgm, true,0.8);
    //     DebugLog.instance.log(`随机播放背景音乐: ${randomBgm}`);
    // }

    async start(): Promise<void> {
        super.start();
        
        // 等待视频加载完成
        await this.initVideo();

        this.model = ListeningModel.getInstance();
        await this.model.initModel();
        
        // 获取难度，如果没有则使用默认值3
        this._currentDifficulty = (this.sceneModel as any)?.difficulty || 1;
        this._questions = this.model.getQuestion(this._currentDifficulty);
        
        // 根据难度获取需要的回答数量
        const hardData = [3, 4, 5];
        const hardIndex = Math.max(0, Math.min(this._currentDifficulty - 1, hardData.length - 1));
        this._requiredAnswerCount = hardData[hardIndex];
        
        // 重置点击缓存
        this._clickedIndices.clear();
        this._wrongAnswerIndex = -1;
        this._selectedOptions = [];
        
        // 初始化startBtn颜色为不可点击状态
        this.changeStartBtnColor(false);
        
        // 视频加载完成后，开始播放视频和音效
        this.startVideoWithAudio();
    }

    itemClick(event: Event, customEventData: string) {
        this.playAudio("music/click",true);
        let index = Number(customEventData);
        
        // 检查选项题库是否已初始化
        if (!this._optionBank || this._optionBank.length === 0) {
            DebugLog.instance.warn(`选项题库未初始化`);
            return;
        }
        
        // 检查索引是否有效
        if (index < 0 || index >= this._optionBank.length) {
            DebugLog.instance.warn(`索引 ${index} 超出选项题库范围 ${this._optionBank.length}`);
            return;
        }
        
        // 通过index从选项题库中获取选项数据
        const option = this._optionBank[index];
        if (!option) {
            DebugLog.instance.warn(`索引 ${index} 对应的选项不存在`);
            return;
        }
        
        // 如果已经点击过，则取消选中
        if (this._clickedIndices.has(index)) {
            // 取消选中：从缓存中移除
            this._clickedIndices.delete(index);
            
            // 从选中的选项数据中移除对应的选项
            const optionIndex = this._selectedOptions.findIndex(opt => opt === option || opt.name === option.name);
            if (optionIndex !== -1) {
                this._selectedOptions.splice(optionIndex, 1);
            }
            
            // 如果取消的是错误答案，清除错误答案索引
            if (this._wrongAnswerIndex === index) {
                this._wrongAnswerIndex = -1;
            }
            
            // 恢复按钮颜色
            this.changeButtonColor(index, false);
            
            // 检查是否还需要更新startBtn状态
            if (this._clickedIndices.size < this._requiredAnswerCount) {
                // 数量不足，startBtn变为不可点击状态
                this.changeStartBtnColor(false);
                // 恢复所有未选中按钮的正常颜色 #151c7f
                this.updateUnselectedButtonsColor();
            }
            
            DebugLog.instance.log(`取消选中: ${option.name}, 已选择: ${this._clickedIndices.size}/${this._requiredAnswerCount}`);
            return;
        }
        
        // 未选中状态，检查是否已经达到要求的数量
        if (this._clickedIndices.size >= this._requiredAnswerCount) {
            // 已经达到要求的数量，不能再选择其他按钮
            this.showMaxSelectionAlert();
            return;
        }
        
        // 未选中状态，执行选中逻辑
        // 判断是否为错误答案
        if (option.isCorrect === false) {
            this._wrongAnswerIndex = index;
            DebugLog.instance.log(`错误答案: ${option.name}`);
        }
        
        // 缓存点击的按钮索引
        this._clickedIndices.add(index);
        
        // 缓存选中的选项数据
        this._selectedOptions.push(option);
        
        // 改变按钮颜色
        this.changeButtonColor(index, true);
        
        // 检查是否达到对应难度的回答数量（统计所有点击过的选项按钮）
        if (this._clickedIndices.size >= this._requiredAnswerCount) {
            // 改变startBtn颜色，表示可以被点击
            this.changeStartBtnColor(true);
            // 将其他未选中的按钮颜色变为 #5c5f87
            this.updateUnselectedButtonsColor();
        }
        
        DebugLog.instance.log(`点击了: ${option.name}, 是否正确: ${option.isCorrect}, 已选择: ${this._clickedIndices.size}/${this._requiredAnswerCount}`);
    }

    /**
     * 改变按钮颜色
     * @param index 按钮索引
     * @param isSelected 是否选中
     */
    private changeButtonColor(index: number, isSelected: boolean) {
        if (!this.chooseNodes) {
            DebugLog.instance.warn(`chooseNodes 未设置`);
            return;
        }
        
        // 获取对应索引的按钮节点
        const buttonNode = this.chooseNodes.children[index];
        if (!buttonNode) {
            DebugLog.instance.warn(`按钮节点不存在: index=${index}`);
            return;
        }
        
        // 获取按钮的Sprite组件
        const sprite = buttonNode.getComponent(Sprite);
        if (sprite) {
            if (isSelected) {
                // 选中状态：#b3f12e
                sprite.color = new Color(179, 241, 46, 255);
            } else {
                // 未选中状态：恢复默认颜色 #151c7f
                sprite.color = new Color(21, 28, 127, 255);
            }
        }
    }

    /**
     * 更新所有未选中按钮的颜色
     * 当选中数量达到要求时，未选中按钮变为 #5c5f87
     * 当选中数量不足时，未选中按钮恢复为正常色 #151c7f
     */
    private updateUnselectedButtonsColor() {
        if (!this.chooseNodes) {
            DebugLog.instance.warn(`chooseNodes 未设置`);
            return;
        }

        // 判断是否达到要求的数量
        const isReachedRequiredCount = this._clickedIndices.size >= this._requiredAnswerCount;
        // 未选中按钮的颜色：达到要求时为 #5c5f87，否则为正常色 #151c7f
        const unselectedColor = isReachedRequiredCount 
            ? new Color(92, 95, 135, 255)  // #5c5f87
            : new Color(21, 28, 127, 255); // #151c7f 正常色

        // 遍历所有按钮
        for (let i = 0; i < this.chooseNodes.children.length; i++) {
            // 跳过已选中的按钮
            if (this._clickedIndices.has(i)) {
                continue;
            }

            const buttonNode = this.chooseNodes.children[i];
            if (!buttonNode) {
                continue;
            }

            // 获取按钮的Sprite组件
            const sprite = buttonNode.getComponent(Sprite);
            if (sprite) {
                sprite.color = unselectedColor;
            }
        }

        DebugLog.instance.log(`更新未选中按钮颜色: ${isReachedRequiredCount ? '#5c5f87' : '#151c7f'}`);
    }
    
    /**
     * 改变startBtn颜色
     * @param isEnabled 是否可点击
     */
    private changeStartBtnColor(isEnabled: boolean) {
        if (!this.startBtn) {
            DebugLog.instance.warn(`startBtn 未设置`);
            return;
        }
        
        const sprite = this.startBtn.getComponent(Sprite);
        if (sprite) {
            if (isEnabled) {
                // 可点击状态：#151c7f
                sprite.color = new Color(21, 28, 127, 255);
            } else {
                // 不可点击状态：#5c5f87
                sprite.color = new Color(92, 95, 135, 255);
            }
        }
    }

    setAnswer(){
        // 检查是否有选中的选项
        if (!this._selectedOptions || this._selectedOptions.length === 0) {
            DebugLog.instance.warn(`没有选中的选项`);
            this.showSelectOptionAlert();
            return;
        }

        // 检查选项数量是否达到当前难度需要的数量
        if (this._selectedOptions.length < this._requiredAnswerCount) {
            DebugLog.instance.warn(`选项数量不足: ${this._selectedOptions.length}/${this._requiredAnswerCount}`);
            this.showSelectOptionAlert();
            return;
        }

        // 提交答案并判断结果
        this.submitAnswer();
    }

    /**
     * 提交答案并判断结果（内部方法，可被自动提交调用）
     */
    private submitAnswer() {
        // 停止倒计时
        if (this.timerComponent && this.timerComponent.isRun()) {
            this.timerComponent.pauseTimer();
            DebugLog.instance.log(`停止答题倒计时`);
        }

        // 标记已提交答案
        this._hasSubmittedAnswer = true;

        // 判断缓存的数据是否有错误
        // 方式1：检查是否有错误答案索引
        // 方式2：检查选中的选项中是否有 isCorrect === false 的项
        const hasError = this._wrongAnswerIndex !== -1 || 
                        this._selectedOptions.some(opt => opt.isCorrect === false);

        if (hasError) {
            // 有错误，展示失败Panel
            DebugLog.instance.log(`答案有错误，展示失败Panel`);
            this.showFailPanel();
        } else {
            // 成功，展示成功Panel
            DebugLog.instance.log(`答案正确，展示成功Panel`);
            this.showSuccessPanel();
        }
    }

    /**
     * 显示请选择选项的弹窗
     */
    private showSelectOptionAlert() {
        AlertManager.getInstance().showToastAlert("请选择足够数量的选项");
       
    }

    /**
     * 显示已达到最大选择数量的弹窗
     */
    private showMaxSelectionAlert() {
        AlertManager.getInstance().showToastAlert(`当前只能选${this._requiredAnswerCount}个选项哦~\n可点击取消选中，重新选择`);
    }

    /**
     * 展示成功Panel
     */
    private showSuccessPanel() {
        this.playAudio("music/win",true);
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: true,
            nextHandler: () => {
                // 成功后的下一步处理 - 进入下一关
                DebugLog.instance.log(`成功Panel - 进入下一关`);
                this.goToNextLevel();
            },
            againHandler: () => {
                // 重新开始当前关卡
                DebugLog.instance.log(`成功Panel - 重玩当前关卡`);
                this.restartCurrentLevel();
            }
        });
    }

    /**
     * 展示失败Panel
     */
    private showFailPanel() {
        this.playAudio("music/fail",true);
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: false,
            nextHandler: () => {
                // 失败后的下一步处理 - 进入下一关
                DebugLog.instance.log(`失败Panel - 进入下一关`);
                this.goToNextLevel();
            },
            againHandler: () => {
                // 重新开始当前关卡
                DebugLog.instance.log(`失败Panel - 重玩当前关卡`);
                this.restartCurrentLevel();
            }
        });
    }

    /**
     * 重玩当前关卡
     * 使用上一次的音效和视频，不重新随机
     */
    private async restartCurrentLevel() {
        // 停止当前播放的视频和音频
        this.stopVideoWithAudio();
        
        // 先重置选项节点状态（在隐藏之前重置，确保颜色被重置）
        this.resetOptionNodes();
        
        // 保存当前的题目和视频路径（重玩时使用相同的）
        const savedQuestions = this._questions ? [...this._questions] : null;
        const savedVideoPath = this._currentVideoPath;
        
        // 重置所有状态
        this.resetGameState();
        
        // 恢复上一次的题目（不重新随机获取）
        if (savedQuestions) {
            this._questions = savedQuestions;
            DebugLog.instance.log(`重玩当前关卡，使用上一次的题目: ${savedQuestions.map(q => q.name).join(', ')}`);
        } else {
            // 如果没有保存的题目，则重新获取（容错处理）
            this._questions = this.model.getQuestion(this._currentDifficulty);
            DebugLog.instance.log(`重玩当前关卡，重新获取题目（无保存的题目）`);
        }
        
        // 使用上一次的视频路径重新加载视频（不重新随机），并自动播放
        if (savedVideoPath) {
            await this.loadLocalVideo(savedVideoPath, true);
            DebugLog.instance.log(`重玩当前关卡，使用上一次的视频: ${savedVideoPath}`);
        } else {
            // 如果没有保存的视频路径，则重新随机（容错处理）
            await this.initVideo();
            DebugLog.instance.log(`重玩当前关卡，重新随机视频（无保存的视频路径）`);
        }
        
        // 视频加载完成后，重新开始视频和音频播放
        this.startVideoWithAudio();
        
        DebugLog.instance.log(`重玩当前关卡，难度: ${this._currentDifficulty}`);
    }

    /**
     * 进入下一关
     */
    private async goToNextLevel() {
        // 停止当前播放的视频和音频
        this.stopVideoWithAudio();
        
        // 先重置选项节点状态（在隐藏之前重置，确保颜色被重置）
        this.resetOptionNodes();
        
        // 增加难度（1->2->3，然后循环回到1）
        const maxDifficulty = 3;
        // this._currentDifficulty = (this._currentDifficulty % maxDifficulty) + 1;
        
        // 重置所有状态
        this.resetGameState();
        
        // 根据新难度获取需要的回答数量
        const hardData = [3, 4, 5];
        const hardIndex = Math.max(0, Math.min(this._currentDifficulty - 1, hardData.length - 1));
        this._requiredAnswerCount = hardData[hardIndex];
        
        // 重新获取新难度的题目
        this._questions = this.model.getQuestion(this._currentDifficulty);
        
        // 重新随机选择背景音乐
        // this.randomPlayBgm();
        
        // 重新初始化视频（会随机选择新的视频）
        await this.initVideo();
        
        // 视频加载完成后，重新开始视频和音频播放
        this.startVideoWithAudio();
        
        DebugLog.instance.log(`进入下一关，新难度: ${this._currentDifficulty}`);
    }

    /**
     * 重置游戏状态
     */
    private resetGameState() {
        // 重置点击缓存
        this._clickedIndices.clear();
        this._wrongAnswerIndex = -1;
        this._selectedOptions = [];
        this._optionBank = null;
        this._hasSubmittedAnswer = false;
        
        // 重置播放状态
        this._playedQuestions = [];
        this._isFirstAudio = true;
        this._isPlaying = false;
        this._elapsedTime = 0;
        this._totalDuration = 0;
        
        // 清除定时器
        if (this._audioTimer) {
            clearTimeout(this._audioTimer);
            this._audioTimer = null;
        }
        if (this._durationTimer) {
            clearInterval(this._durationTimer);
            this._durationTimer = null;
        }
        
        // 停止并重置倒计时
        if (this.timerComponent) {
            this.timerComponent.resetTimer();
        }
        
        // 重置按钮状态
        this.changeStartBtnColor(false);
        
        // 隐藏选项节点
        if (this.optionsNode) {
            this.optionsNode.active = false;
        }
        
        // 显示视频节点
        if (this.videoNode) {
            this.videoNode.active = true;
        }
        if (this.videoPlayer && this.videoPlayer.node) {
            this.videoPlayer.node.active = true;
        }
    }

    /**
     * 重置选项节点状态（恢复按钮颜色）
     */
    private resetOptionNodes() {
        if (!this.chooseNodes) {
            DebugLog.instance.warn(`chooseNodes 未设置，无法重置按钮颜色`);
            return;
        }
        
        // 恢复所有按钮的颜色为未选中状态
        const childrenCount = this.chooseNodes.children.length;
        DebugLog.instance.log(`重置选项节点，按钮数量: ${childrenCount}`);
        
        for (let i = 0; i < childrenCount; i++) {
            const buttonNode = this.chooseNodes.children[i];
            if (!buttonNode) {
                continue;
            }
            
            // 直接获取按钮的Sprite组件并重置颜色
            const sprite = buttonNode.getComponent(Sprite);
            if (sprite) {
                // 恢复为默认颜色 #151c7f
                sprite.color = new Color(21, 28, 127, 255);
                DebugLog.instance.log(`重置按钮 ${i} 的颜色`);
            }
        }
    }

     /**
     * 初始化视频
     */
     private async initVideo(): Promise<void> {
        // 确保VideoPlayer不会自动播放
        if (this.videoPlayer) {
            this.videoPlayer.playOnAwake = true;
        }

        await this.loadLocalVideo();
    }


    private videoLen:number = 10;

    /**
     * 加载本地视频文件
     * @param videoPath 视频路径，如果不传则随机选择
     * @param autoPlay 是否自动播放，默认false
     * @returns Promise，视频加载完成后resolve
     */
    private loadLocalVideo(videoPath?: string, autoPlay: boolean = false): Promise<void> {
        return new Promise((resolve, reject) => {
            // 如果没有传入视频路径，随机选择 0-2 的视频
            if (!videoPath) {
                const randomIndex = Math.floor(Math.random() * this.videoLen);
                videoPath = `video/bgm${randomIndex}`;
            }
            
            // 保存当前视频路径
            this._currentVideoPath = videoPath;

            if (videoPath&&videoPath.length>0) {
                const bundle = assetManager.getBundle(BundleName.LISTENINGMASTER);
                if (!bundle) {
                    DebugLog.instance.error(`Bundle ${BundleName.LISTENINGMASTER} 未加载`);
                    reject(new Error(`Bundle ${BundleName.LISTENINGMASTER} 未加载`));
                    return;
                }

                bundle.load(videoPath, VideoClip, (err, videoClip) => {
                    if (err) {
                        DebugLog.instance.error(`加载视频失败: ${videoPath}`, err);
                        reject(err);
                        return;
                    }

                    DebugLog.instance.log(`视频加载成功: ${videoPath}`);

                    // 设置视频到播放器
                    this.videoPlayer.clip = videoClip;
                    // 设置视频循环播放
                    this.videoPlayer.loop = true;
                    this.videoNode.active = true;
                    this.videoPlayer.node.active = true;
                    this.adaptVideoPlayer();

                    // 如果设置了自动播放，立即播放视频
                    if (autoPlay && this.videoPlayer) {
                        this.videoPlayer.play();
                        DebugLog.instance.log(`视频自动播放: ${videoPath}`);
                    }

                    // 视频加载完成，resolve Promise
                    resolve();
                });
            } else {
                // 没有视频路径，直接resolve
                resolve();
            }
        });
    }

    adaptVideoPlayer() {
        if (!this.videoPlayer) {
            return;
        }

        // 视频固定尺寸
        const FIXED_VIDEO_WIDTH = 900;
        const FIXED_VIDEO_HEIGHT = 505;

        // 设置videoPlayer节点的固定大小
        const playerTransform = this.videoPlayer.node.getComponent(UITransform);
        if (playerTransform) {
            playerTransform.setContentSize(FIXED_VIDEO_WIDTH, FIXED_VIDEO_HEIGHT);
        }
        
        // 更新边框线位置
        this.updateVideoBorderLines(FIXED_VIDEO_WIDTH, FIXED_VIDEO_HEIGHT);
    }

    /**
     * 更新视频边框线位置（动态贴着videoNode）
     */
    private updateVideoBorderLines(playerWidth: number, playerHeight: number) {
        if (!this.videoNode || !this.videoPlayer) {
            return;
        }

        // 获取videoPlayer节点的UITransform
        const playerTransform = this.videoPlayer.node.getComponent(UITransform);
        if (!playerTransform) {
            DebugLog.instance.warn(`videoPlayer.node 没有 UITransform 组件`);
            return;
        }

        // 获取videoNode的UITransform（用于坐标转换）
        const videoTransform = this.videoNode.getComponent(UITransform);
        if (!videoTransform) {
            DebugLog.instance.warn(`videoNode 没有 UITransform 组件`);
            return;
        }

        // 获取videoPlayer节点的锚点
        const playerAnchor = playerTransform.anchorPoint;
        
        // 计算videoPlayer在videoNode坐标系中的边界
        const playerPos = this.videoPlayer.node.position;
        const left = playerPos.x - playerAnchor.x * playerWidth;
        const right = playerPos.x + (1 - playerAnchor.x) * playerWidth;
        const bottom = playerPos.y - playerAnchor.y * playerHeight;
        const top = playerPos.y + (1 - playerAnchor.y) * playerHeight;
        
        // 获取边框线的父节点（假设是videoNode或与videoNode同级的节点）
        const getLineParent = (lineNode: Node): Node => {
            return lineNode.parent || this.videoNode;
        };

        const lineWidOffset = 14;
        const lineHeiOffset = -5
        
        // 上边框线：在videoPlayer上边缘，往上偏移
        if (this.upLine) {
            const upLineTransform = this.upLine.getComponent(UITransform);
            if (upLineTransform) {
                const lineParent = getLineParent(this.upLine);
                const lineParentTransform = lineParent.getComponent(UITransform);
                
                // 获取上边框线的缩放
                const upLineScale = this.upLine.scale;
                
                // 计算上边框线的偏移量（向上移动半个边框线高度，考虑缩放）
                const upLineHeight = upLineTransform.contentSize.height * upLineScale.y;
                const upOffset = upLineHeight / 2;
                
                // 计算上边框线的实际宽度（考虑videoPlayer的缩放和lineNode的缩放）
                const upLineWidth = (playerWidth+lineWidOffset) / upLineScale.x;
                
                if (lineParentTransform) {
                    // 将上边缘位置转换到边框线父节点的坐标系，并向上偏移
                    const topWorldPos = videoTransform.convertToWorldSpaceAR(new Vec3(0, top, 0));
                    const topLocalPos = lineParentTransform.convertToNodeSpaceAR(topWorldPos);
                    this.upLine.position = topLocalPos;
                    upLineTransform.setContentSize(upLineWidth, upLineTransform.contentSize.height);
                } else {
                    // 如果父节点没有UITransform，直接使用videoNode坐标系
                    this.upLine.position = new Vec3(0, top, 0);
                    upLineTransform.setContentSize(upLineWidth, upLineTransform.contentSize.height);
                }
            }
        }
        
        // 下边框线：在videoPlayer下边缘，往下偏移
        if (this.downLine) {
            const downLineTransform = this.downLine.getComponent(UITransform);
            if (downLineTransform) {
                const lineParent = getLineParent(this.downLine);
                const lineParentTransform = lineParent.getComponent(UITransform);
                
                // 获取下边框线的缩放
                const downLineScale = this.downLine.scale;
                
                // 计算下边框线的偏移量（向下移动半个边框线高度，考虑缩放）
                const downLineHeight = downLineTransform.contentSize.height * Math.abs(downLineScale.y);
                const downOffset = downLineHeight / 2;
                
                // 计算下边框线的实际宽度（考虑videoPlayer的缩放和lineNode的缩放）
                const downLineWidth = (playerWidth+lineWidOffset) / Math.abs(downLineScale.x);
                
                if (lineParentTransform) {
                    const bottomWorldPos = videoTransform.convertToWorldSpaceAR(new Vec3(0, bottom, 0));
                    const bottomLocalPos = lineParentTransform.convertToNodeSpaceAR(bottomWorldPos);
                    this.downLine.position = bottomLocalPos;
                    downLineTransform.setContentSize(downLineWidth, downLineTransform.contentSize.height);
                } else {
                    this.downLine.position = new Vec3(0, bottom, 0);
                    downLineTransform.setContentSize(downLineWidth, downLineTransform.contentSize.height);
                }
            }
        }
        
        // 左边框线：在videoPlayer左边缘，往外扩展
        if (this.leftLine) {
            const leftLineTransform = this.leftLine.getComponent(UITransform);
            if (leftLineTransform) {
                const lineParent = getLineParent(this.leftLine);
                const lineParentTransform = lineParent.getComponent(UITransform);
                
                // 获取左边框线的缩放
                const leftLineScale = this.leftLine.scale;
                
                // 计算左边框线的偏移量（向左移动半个边框线宽度，考虑缩放）
                const leftLineWidth = leftLineTransform.contentSize.width * leftLineScale.x;
                const leftOffset = -0.1;
                
                // 计算左边框线的实际高度（考虑videoPlayer的缩放和lineNode的缩放）
                const leftLineHeight = (playerHeight + lineHeiOffset)/ leftLineScale.y;
                
                if (lineParentTransform) {
                    const leftWorldPos = videoTransform.convertToWorldSpaceAR(new Vec3(left-leftOffset , (bottom + top) / 2, 0));
                    const leftLocalPos = lineParentTransform.convertToNodeSpaceAR(leftWorldPos);
                    this.leftLine.position = leftLocalPos;
                    leftLineTransform.setContentSize(leftLineTransform.contentSize.width, leftLineHeight);
                } else {
                    this.leftLine.position = new Vec3(left-leftOffset , (bottom + top) / 2, 0);
                    leftLineTransform.setContentSize(leftLineTransform.contentSize.width, leftLineHeight);
                }
            }
        }
        
        // 右边框线：在videoPlayer右边缘，往外扩展
        if (this.rightLine) {
            const rightLineTransform = this.rightLine.getComponent(UITransform);
            if (rightLineTransform) {
                const lineParent = getLineParent(this.rightLine);
                const lineParentTransform = lineParent.getComponent(UITransform);
                
                // 获取右边框线的缩放
                const rightLineScale = this.rightLine.scale;
                
                // 计算右边框线的偏移量（向右移动半个边框线宽度，考虑缩放）
                const rightLineWidth = rightLineTransform.contentSize.width * rightLineScale.x;
                const rightOffset = -0.1;
                
                // 计算右边框线的实际高度（考虑videoPlayer的缩放和lineNode的缩放）
                const rightLineHeight =  (playerHeight + lineHeiOffset) / rightLineScale.y;
                
                if (lineParentTransform) {
                    const rightWorldPos = videoTransform.convertToWorldSpaceAR(new Vec3(right+rightOffset , (bottom + top) / 2, 0));
                    const rightLocalPos = lineParentTransform.convertToNodeSpaceAR(rightWorldPos);
                    this.rightLine.position = rightLocalPos;
                    rightLineTransform.setContentSize(rightLineTransform.contentSize.width, rightLineHeight);
                } else {
                    this.rightLine.position = new Vec3(right+rightOffset , (bottom + top) / 2, 0);
                    rightLineTransform.setContentSize(rightLineTransform.contentSize.width, rightLineHeight);
                }
            }
        }
    }

    /**
     * 播放视频（外部调用接口）
     */
    playVideo() {
        if (this.videoPlayer) {
            // 直接使用VideoPlayer播放
            this.videoPlayer.play();
        }
    }

    /**
     * 暂停视频（外部调用接口）
     */
    pauseVideo() {
        if (this.videoPlayer && this.videoPlayer.isPlaying) {
            this.videoPlayer.pause();
        }
    }

    /**
     * 停止视频（外部调用接口）
     */
    stopVideo() {
        if (this.videoPlayer) {
            this.videoPlayer.stop();
        }
    }

    /**
     * 开始播放视频和音效
     */
    private startVideoWithAudio() {
        if (!this._questions || this._questions.length === 0) {
            DebugLog.instance.warn(`没有可播放的问题配置`);
            return;
        }

        // 重置已播放列表
        this._playedQuestions = [];
        this._isFirstAudio = true;

        // 计算总时长：所有音效时长 + 间隔时间（n个音效有n-1个间隔）+ 第一个音效延迟时间 + 音效播放完成后的延迟时间（2秒）
        const totalAudioDuration = this._questions.reduce((sum, question) => sum + question.duration, 0);
        const totalIntervalDuration = (this._questions.length - 1) * this._audioInterval;
        const finalDelay = 2; // 所有音效播放完成后的延迟时间（秒）
        this._totalDuration = totalAudioDuration + totalIntervalDuration + this._firstAudioDelay + finalDelay;
        this._elapsedTime = 0;
        this._isPlaying = true;

        DebugLog.instance.log(`开始播放，总时长: ${this._totalDuration} 秒（音效时长: ${totalAudioDuration} 秒，间隔时长: ${totalIntervalDuration} 秒，初始延迟: ${this._firstAudioDelay} 秒）`);

        // 确保视频循环播放
        if (this.videoPlayer) {
            this.videoPlayer.loop = true;
        }

        // 播放视频（会一直循环直到停止）
        this.playVideo();

        // 第一个音效延迟3秒播放（保存定时器以便暂停时清除）
        this._firstAudioTimer = setTimeout(() => {
            if (this._isPlaying) {
                this.playRandomAudio();
            }
            this._firstAudioTimer = null;
        }, this._firstAudioDelay * 1000);

        // 启动总时长定时器
        this._durationTimer = setInterval(() => {
            this._elapsedTime += 0.1; // 每100ms更新一次
            
            if (this._elapsedTime >= this._totalDuration) {
                this.stopVideoWithAudio();
                this.startAnswerTimer();
            }
        }, 100);
    }

    /**
     * 随机播放音效
     */
    private playRandomAudio() {
        if (!this._isPlaying || !this._questions || this._questions.length === 0) {
            return;
        }

        // 获取未播放的音效列表
        const unplayedQuestions = this._questions.filter(q => 
            !this._playedQuestions.some(played => played.name === q.name)
        );

        // 如果所有音效都已播放，延迟2秒后停止播放
        if (unplayedQuestions.length === 0) {
            DebugLog.instance.log(`所有音效已播放完成，延迟2秒后停止视频并显示选项`);
            // 延迟2秒后停止视频、关闭视频，显示选项节点
            setTimeout(() => {
                if (this._isPlaying) {
                    this.stopVideoWithAudio();
                    this.startAnswerTimer();
                }
            }, 2000);
            return;
        }

        // 从未播放的音效中随机选择一个
        const randomIndex = Math.floor(Math.random() * unplayedQuestions.length);
        const question = unplayedQuestions[randomIndex];

        // 标记为已播放
        this._playedQuestions.push(question);

        // 从 bundle 加载并播放音效
        const bundle = assetManager.getBundle(BundleName.LISTENINGMASTER);
        if (!bundle) {
            DebugLog.instance.error(`Bundle ${BundleName.LISTENINGMASTER} 未加载`);
            return;
        }

        bundle.load(question.path, AudioClip, (err, audioClip) => {
            if (err) {
                DebugLog.instance.error(`加载音效失败: ${question.path}`, err);
                // 即使加载失败，也继续播放下一个音效
                this.scheduleNextAudio(question.duration);
                return;
            }

            if (audioClip) {
                // 播放短音效
                AudioManager.getInstance().playShortSound(audioClip, 1.0);
                DebugLog.instance.log(`播放音效: ${question.name}, 时长: ${question.duration} 秒，已播放: ${this._playedQuestions.length}/${this._questions.length}`);
            }

            // 根据当前音效的时长和间隔，安排下一个音效的播放
            this.scheduleNextAudio(question.duration);
        });
    }

    /**
     * 安排下一个音效的播放
     */
    private scheduleNextAudio(duration: number) {
        if (!this._isPlaying) {
            return;
        }

        // 清除之前的定时器
        if (this._audioTimer) {
            clearTimeout(this._audioTimer);
        }

        // 计算下一个音效的播放时间：当前音效时长 + 间隔时间（3秒）
        const nextDelay = (duration + this._audioInterval) * 1000; // 转换为毫秒

        this._audioTimer = setTimeout(() => {
            if (this._isPlaying && this._elapsedTime < this._totalDuration) {
                this._isFirstAudio = false; // 第一个音效已播放，后续不再是第一个
                this.playRandomAudio();
            }
        }, nextDelay);
    }

    /**
     * 停止视频和音效播放
     */
    private stopVideoWithAudio() {
        this._isPlaying = false;

        // 清除定时器
        if (this._audioTimer) {
            clearTimeout(this._audioTimer);
            this._audioTimer = null;
        }

        if (this._durationTimer) {
            clearInterval(this._durationTimer);
            this._durationTimer = null;
        }

        // 停止视频
        this.stopVideo();

        // 隐藏视频播放器
        if (this.videoPlayer && this.videoPlayer.node) {
            this.videoNode.active = false;
            this.videoPlayer.node.active = false;
        }

        // 显示选项节点
        if (this.optionsNode) {
             // 获取选项队列并设置到label上
             this.setupOptionLabels();
            this.optionsNode.active = true;
            
            // 重置提交答案标记
            this._hasSubmittedAnswer = false;

            this.answerCountLabel.string = `请选出<color=#B3F12E>${this._requiredAnswerCount}</color>种刚才听到的声音`;
            
        }

        DebugLog.instance.log(`播放完成，总时长: ${this._totalDuration} 秒`);
    }

    /**
     * 启动答题倒计时（30秒）
     */
    private startAnswerTimer() {
        if (!this.timerComponent) {
            DebugLog.instance.warn(`timerComponent 未设置`);
            return;
        }

        // 启动30秒倒计时
        this.timerComponent.startTimer(30);
        DebugLog.instance.log(`开始答题倒计时: 30秒`);
    }

    /**
     * 倒计时结束处理（重写父类方法）
     * 超时未提交自动提交当前选中选项
     */
    onTimerEnd() {
        // 如果已经提交答案，不再处理
        if (this._hasSubmittedAnswer) {
            DebugLog.instance.log(`倒计时结束，但已提交答案，忽略`);
            return;
        }

        // 倒计时结束且未提交答案，自动提交当前选中选项
        DebugLog.instance.log(`倒计时结束，自动提交当前选中选项`);
        
        // 检查是否有选中的选项
        if (!this._selectedOptions || this._selectedOptions.length === 0) {
            // 没有选中的选项，直接判断失败
            DebugLog.instance.log(`倒计时结束，没有选中的选项，直接判断失败`);
            this._hasSubmittedAnswer = true;
            this.showFailPanel();
            return;
        }

        // 检查选项数量是否达到当前难度需要的数量
        if (this._selectedOptions.length < this._requiredAnswerCount) {
            // 选项数量不足，直接判断失败
            DebugLog.instance.log(`倒计时结束，选项数量不足: ${this._selectedOptions.length}/${this._requiredAnswerCount}，直接判断失败`);
            this._hasSubmittedAnswer = true;
            this.showFailPanel();
            return;
        }

        // 选项数量足够，自动提交并判断结果
        this.submitAnswer();
    }

    /**
     * 设置选项标签（从选项题库中获取name并显示到对应的label上）
     */
    private setupOptionLabels() {
        if (!this.model || !this._questions) {
            DebugLog.instance.warn(`模型或题目未初始化`);
            return;
        }

        // 从ListeningModel中获取选项队列
        this._optionBank = this.model.getOptionBank(this._currentDifficulty, this._questions);
        
        if (!this._optionBank || this._optionBank.length === 0) {
            DebugLog.instance.warn(`选项队列为空`);
            return;
        }

        // 将选项队列打乱顺序（可选，让选项随机排列）
        this.shuffleArray(this._optionBank);

        // 将队列中每个data的name展示到对应的label上
        if (!this.chooseNodes) {
            DebugLog.instance.warn(`chooseNodes 未设置`);
            return;
        }

        // 遍历chooseNodes的子节点，设置label文本
        for (let i = 0; i < this.chooseNodes.children.length; i++) {
            const childNode = this.chooseNodes.children[i];
            if (!childNode) {
                continue;
            }

            // 如果选项队列中有对应的数据，则设置label
            if (i < this._optionBank.length) {
                const option = this._optionBank[i];
                // 查找子节点中的Label组件（可能在子节点中）
                const label = this.findLabelInNode(childNode);
                if (label) {
                    label.string = option.name;
                    DebugLog.instance.log(`设置选项 ${i}: ${option.name}`);
                } else {
                    DebugLog.instance.warn(`节点 ${i} 中未找到Label组件`);
                }
            }
        }
    }

    /**
     * 在节点及其子节点中查找Label组件
     * @param node 要查找的节点
     * @returns Label组件，如果未找到则返回null
     */
    private findLabelInNode(node: Node): Label | null {
        if (!node) {
            return null;
        }

        // 先检查当前节点是否有Label组件
        const label = node.getComponent(Label);
        if (label) {
            return label;
        }

        // 递归查找子节点中的Label组件
        for (let i = 0; i < node.children.length; i++) {
            const childLabel = this.findLabelInNode(node.children[i]);
            if (childLabel) {
                return childLabel;
            }
        }

        return null;
    }

    /**
     * 打乱数组顺序（Fisher-Yates洗牌算法）
     * @param array 要打乱的数组
     */
    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    quitGame() {
        // 暂停答题倒计时（如果正在运行）
        if (this.timerComponent && this.timerComponent.isRun()) {
            this.timerComponent.pauseTimer();
            DebugLog.instance.log(`退出界面，暂停答题倒计时`);
        }
        
        // 暂停时间（包括其他可能的计时器）
        this.pauseTime();
        
        // 判断当前是在播放阶段还是答题阶段
        const isInPlayingPhase = this._isPlaying; // 正在播放视频和音效
        const isInAnswerPhase = this.optionsNode && this.optionsNode.active; // 选项节点已显示（答题阶段）
        
        if (isInPlayingPhase) {
            // 在播放阶段：只暂停视频和音效，不停止，不显示选项节点
            // 暂停视频播放
            this.pauseVideo();
            
            // 记录暂停开始时间
            this._pauseStartTime = Date.now();
            
            // 清除所有定时器
            if (this._firstAudioTimer) {
                clearTimeout(this._firstAudioTimer);
                this._firstAudioTimer = null;
            }
            if (this._audioTimer) {
                clearTimeout(this._audioTimer);
                this._audioTimer = null;
            }
            if (this._durationTimer) {
                clearInterval(this._durationTimer);
                this._durationTimer = null;
            }
            
            // 暂停音效播放（通过设置_isPlaying标志）
            this._isPlaying = false;
            DebugLog.instance.log(`退出界面，暂停视频和音效播放（播放阶段），已清除所有定时器`);
        } else if (isInAnswerPhase) {
            // 在答题阶段：已经停止播放
            DebugLog.instance.log(`退出界面，答题阶段`);
        } else {
            // 其他情况：完全停止
            this.stopVideoWithAudio();
        }
        
        // 无论什么阶段，弹窗时都隐藏 videoPlayer 和 videoNode
        if (this.videoNode) {
            this.videoNode.active = false;
        }
        if (this.videoPlayer && this.videoPlayer.node) {
            this.videoPlayer.node.active = false;
        }
        DebugLog.instance.log(`退出界面，隐藏视频播放器`);
        
        // SceneManager.getInstance().backToGameCenter();
        super.quitGame({ parentNode: this.mainView, context: this })
    }

    resumeCallBack(context?: any) {
        // 如果游戏在结算阶段，不恢复倒计时
        if (context && context._hasSubmittedAnswer) {
            DebugLog.instance.log("游戏在结算阶段，不恢复倒计时");
            // 调用父类方法处理其他逻辑
            if (context.sceneModel) {
                if (!context.sceneModel.resumeCallBack()) {
                    return;
                }
            }
            context.resumeTime();
            return;
        }

        // 判断当前是在播放阶段还是答题阶段
        const isInAnswerPhase = context && context.optionsNode && context.optionsNode.active;
        
        if (isInAnswerPhase) {
            // 在答题阶段：恢复倒计时（不重置）
            if (context.timerComponent && context.timerComponent.isRun()) {
                context.timerComponent.resumeTimer();
                DebugLog.instance.log(`继续游戏，恢复答题倒计时`);
            }
            // 答题阶段不需要显示 videoPlayer
        } else {
            // 在播放阶段：恢复视频和音效播放
            // 先显示 videoPlayer 和 videoNode
            if (context && context.videoNode) {
                context.videoNode.active = true;
            }
            if (context && context.videoPlayer && context.videoPlayer.node) {
                context.videoPlayer.node.active = true;
            }
            DebugLog.instance.log(`继续游戏，显示视频播放器`);
            
            // 恢复视频播放
            if (context && context.videoPlayer && context.videoPlayer.isPlaying === false) {
                context.playVideo();
                DebugLog.instance.log(`继续游戏，恢复视频播放`);
            }
            
            // 恢复音效播放（重新设置_isPlaying标志，重新启动定时器）
            if (context && !context._isPlaying && context._elapsedTime < context._totalDuration) {
                context._isPlaying = true;
                
                // 计算暂停时长（毫秒）
                const pauseDuration = context._pauseStartTime > 0 ? (Date.now() - context._pauseStartTime) / 1000 : 0;
                context._pauseStartTime = 0;
                
                // 重新启动总时长定时器
                if (!context._durationTimer) {
                    context._durationTimer = setInterval(() => {
                        context._elapsedTime += 0.1; // 每100ms更新一次
                        
                        if (context._elapsedTime >= context._totalDuration) {
                            context.stopVideoWithAudio();
                            context.startAnswerTimer();
                        }
                    }, 100);
                    DebugLog.instance.log(`继续游戏，重新启动总时长定时器，已播放时间: ${context._elapsedTime.toFixed(1)}秒`);
                }
                
                // 判断是否需要重新启动音效播放定时器
                // 如果第一个音效还没播放，重新启动第一个音效延迟定时器
                if (context._isFirstAudio && !context._firstAudioTimer) {
                    // 计算剩余延迟时间（考虑已播放时间和暂停时间）
                    const remainingDelay = Math.max(0, (context._firstAudioDelay * 1000) - (context._elapsedTime * 1000));
                    if (remainingDelay > 0) {
                        context._firstAudioTimer = setTimeout(() => {
                            if (context._isPlaying) {
                                context.playRandomAudio();
                            }
                            context._firstAudioTimer = null;
                        }, remainingDelay);
                        DebugLog.instance.log(`继续游戏，重新启动第一个音效延迟定时器，剩余延迟: ${(remainingDelay / 1000).toFixed(1)}秒`);
                    } else {
                        // 延迟时间已过，直接播放第一个音效
                        context.playRandomAudio();
                        DebugLog.instance.log(`继续游戏，延迟时间已过，直接播放第一个音效`);
                    }
                } else if (!context._isFirstAudio && !context._audioTimer) {
                    // 第一个音效已播放，需要继续播放下一个音效
                    // 计算下一个音效的延迟时间（基于已播放时间和间隔时间）
                    const lastPlayedQuestion = context._playedQuestions[context._playedQuestions.length - 1];
                    if (lastPlayedQuestion) {
                        // 计算从上次音效播放后经过的时间
                        const timeSinceLastAudio = context._elapsedTime - (context._firstAudioDelay + 
                            context._playedQuestions.slice(0, -1).reduce((sum, q) => sum + q.duration + context._audioInterval, 0));
                        const remainingDelay = Math.max(0, (lastPlayedQuestion.duration + context._audioInterval) * 1000 - timeSinceLastAudio * 1000);
                        
                        if (remainingDelay > 0) {
                            context._audioTimer = setTimeout(() => {
                                if (context._isPlaying && context._elapsedTime < context._totalDuration) {
                                    context.playRandomAudio();
                                }
                            }, remainingDelay);
                            DebugLog.instance.log(`继续游戏，重新启动下一个音效定时器，剩余延迟: ${(remainingDelay / 1000).toFixed(1)}秒`);
                        } else {
                            // 延迟时间已过，直接播放下一个音效
                            context.playRandomAudio();
                            DebugLog.instance.log(`继续游戏，延迟时间已过，直接播放下一个音效`);
                        }
                    } else {
                        // 没有已播放的音效，直接播放
                        context.playRandomAudio();
                        DebugLog.instance.log(`继续游戏，没有已播放的音效，直接播放`);
                    }
                }
                
                DebugLog.instance.log(`继续游戏，恢复音效播放，已播放时间: ${context._elapsedTime.toFixed(1)}秒，暂停时长: ${pauseDuration.toFixed(1)}秒`);
            }
        }
        
        // 恢复时间（包括其他可能的计时器）
        if (context) {
            context.resumeTime();
        } else {
            this.resumeTime();
        }
        
        // 调用父类方法
        if (context && context.sceneModel) {
            if (!context.sceneModel.resumeCallBack()) {
                return;
            }
        }
    }


}