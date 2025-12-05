import { _decorator, resources, Label, Node, Sprite, SpriteFrame, ProgressBar, VideoPlayer, VideoClip, assetManager, game, Game, ParticleAsset, AudioClip, AudioSource, Color, UITransform, Vec3, RichText } from 'cc';
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { AudioManager } from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { SkewersManager } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import { SkewersGameStatus } from "db://assets/resources/scripts/Core/Data/GameState";
import { IListeningConfig, ListeningModel } from './ListeningModel';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { SettlementPanel } from '../../resources/scripts/Core/UI/SettlementPanel';
import { AlertManager } from '../../resources/scripts/Core/Manager/Alert/AlertManager';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { AlertType } from '../../resources/scripts/Game/UI/Alert/GameAlert';
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

    @property(Node)
    private descLabelNode:Node = null;

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
    private _shouldDeferResult: boolean = false; // 是否延迟显示答题界面（deferResult == 1）
    private _audioSource: AudioSource = null; // 用于播放音效的AudioSource
    private _finishedAudioCount: number = 0; // 已播放完成的音效数量
    private _allAudioFinished: boolean = false; // 所有音效是否已播放完成
    private _audioQueue: IListeningConfig[] = []; // 音效播放队列
    private _audioCountdownTimer: any = null; // 音效间隔倒计时定时器（2秒）
    private _skewersSavedQuestions: IListeningConfig[] = null; // 串烧模式下保存的题目（用于保证多次游戏一致）
    private _skewersSavedVideoPath: string = null; // 串烧模式下保存的视频路径（用于保证多次游戏一致）
    private _wrongAnswerCount: number = 0; // 本次游戏答错的数量
    private _correctAnswerCount: number = 0; // 本次游戏答对的数量
    private _currentRequiredAnswerCount: number = 0; // 本次游戏对应难度需要答题的数量

    onLoad(): void {
        // 初始化AudioSource用于播放音效
        this._audioSource = this.node.addComponent(AudioSource);

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
        
        // 根据游戏类型获取难度和关卡
        if (this.sceneModel && this.sceneModel.gameType === GameType.SKEWERS) {
            // 串烧训练模式：从 sceneModel 获取难度和关卡
            this._currentDifficulty = (this.sceneModel as any).difficulty || 1;
            // const level = (this.sceneModel as any).level || 1;
            
            // 获取串烧游戏数据，设置进度条和关卡标签
            const skewersGameData = (this.sceneModel as any).game;
            if (skewersGameData && this.progress) {
                this.progress.progress = skewersGameData.progress || 0;
            }
            if (skewersGameData && this.progresslabel) {
                this.progresslabel.string = "第" + (skewersGameData.progressStr) + "关";
            }
            
            // 检查是否有缓存的游戏状态（所有游戏完成后回到延迟显示的游戏）
            const manager = SkewersManager.getInstance();
            const cachedState = manager.getCachedDeferredGameState();
            // 如果有缓存的游戏状态，且缓存的 gameData 的 gameCode 是 listeningMaster，则恢复缓存状态
            if (cachedState && cachedState.gameData.gameCode === BundleName.LISTENINGMASTER) {
                // 恢复缓存的游戏状态
                this._questions = cachedState.questions;
                this._optionBank = cachedState.optionBank;
                this._currentVideoPath = cachedState.videoPath;
                this._currentDifficulty = cachedState.difficulty;
                this._requiredAnswerCount = cachedState.requiredAnswerCount;
                this._shouldDeferResult = true;
                this.descLabelNode.getComponent(Label).string = "请回忆刚才听到的音效,并选出正确的选项";
                DebugLog.instance.log(`恢复缓存的游戏状态: 题目数量=${this._questions.length}, 选项数量=${this._optionBank.length}, 视频路径=${this._currentVideoPath}`);
                
                // // 如果视频路径存在，加载视频（但不自动播放）
                // if (this._currentVideoPath) {
                //     await this.loadLocalVideo(this._currentVideoPath, false);
                // }
            } else {
                // 没有缓存状态，正常初始化
                // 检查当前游戏的 trainData.deferResult 是否为 1
                const curGameData = manager.getUnCompleteGameData();
                if (curGameData) {
                    const curTrainData = curGameData.getCurTrainData();
                    if (curTrainData && curTrainData.deferResult == 1) {
                        this._shouldDeferResult = true;
                        
                        // 检查是否已经播放过音效和视频
                        if (curTrainData.hasPlayedAudioVideo) {
                            this.descLabelNode.getComponent(Label).string = "听视频音频，记住并选出你听到的声音";
                            // 初始化选项题库（用于缓存）
                            if (!this._optionBank || this._optionBank.length === 0) {
                                // 先获取题目
                                this._questions = this.model.getQuestion(this._currentDifficulty);
                                // 初始化选项题库
                                this.setupOptionLabels();
                            }
                            // 缓存当前游戏状态
                            manager.cacheDeferredGameState(curGameData, {
                                questions: this._questions ? [...this._questions] : [],
                                optionBank: this._optionBank ? [...this._optionBank] : [],
                                videoPath: this._currentVideoPath || "",
                                difficulty: this._currentDifficulty,
                                requiredAnswerCount: this._requiredAnswerCount
                            });
                            // 跳转到下一个游戏
                            manager.runNextGame(true);
                            return; // 直接返回，不播放音效和视频
                        } else {
                            // 没有播放过，正常播放音效和视频
                            this.descLabelNode.getComponent(Label).string = "听视频音频，记住并选出你听到的声音";
                            DebugLog.instance.log(`当前游戏 deferResult=1，将先播放音效和视频，然后标记为已播放`);
                        }
                    } else {
                        this._shouldDeferResult = false;
                    }
                }
                
                // 获取题目（串烧模式下，如果已有保存的题目，则使用保存的题目，否则获取新题目并保存）
                if (this._skewersSavedQuestions && this._skewersSavedQuestions.length > 0) {
                    // 使用保存的题目，保证多次游戏一致
                    this._questions = [...this._skewersSavedQuestions];
                    DebugLog.instance.log(`串烧训练模式 - 使用保存的题目: ${this._questions.map(q => q.name).join(', ')}`);
                } else {
                    // 第一次游戏，获取新题目并保存
                    this._questions = this.model.getQuestion(this._currentDifficulty);
                    this._skewersSavedQuestions = this._questions ? [...this._questions] : null;
                    DebugLog.instance.log(`串烧训练模式 - 获取新题目并保存: ${this._questions.map(q => q.name).join(', ')}`);
                }
            }
            
        } else {
            // 非串烧模式：使用默认逻辑
            let level = 1;
            this.descLabelNode.getComponent(Label).string = "听视频音频，记住并选出你听到的声音";
            if (this.sceneModel) {
                // 如果是 GameCenterSpecModel（从 GameCenterManager 进入），难度从 guidepanel 选择，level 直接等于 1
                if (this.sceneModel.gameType === GameType.GAME_CENTER) {
                    // 难度通过 guidepanel 选择的难度（从 sceneModel.difficulty 获取）
                    this._currentDifficulty = (this.sceneModel as any)?.difficulty || 1;
                    level = 1; // level 直接等于 1
                } else {
                    // 其他模式：使用默认逻辑
                    this._currentDifficulty = (this.sceneModel as any)?.difficulty || 1;
                    level = (this.sceneModel as any)?.levelIndex || (this.sceneModel as any)?.level || 1;
                }
            } else {
                this._currentDifficulty = 1;
            }
            
            // 设置进度条和关卡标签
            if (this.progress) {
                this.progress.progress = 1;
            }
            if (this.progresslabel) {
                this.progresslabel.string = "第" + level + "关";
            }
            
            DebugLog.instance.log(`普通模式 - 难度: ${this._currentDifficulty}, 关卡: ${level}`);
            
            // 获取题目
            this._questions = this.model.getQuestion(this._currentDifficulty);
        }
        
        // 检查 restoreData 中是否有缓存的游戏状态数据
        const restoreData = SceneManager.getInstance().getRestoreData();
        const cachedGameState = restoreData && restoreData.cachedGameState;
        
        // 检查是否有缓存的游戏状态（所有游戏完成后回到延迟显示的游戏）
        const manager = SkewersManager.getInstance();
        const cachedState = manager.getCachedDeferredGameState();
        // 如果有 restoreData 中的缓存的游戏状态，或者有 manager 中的缓存的游戏状态，则认为是需要恢复缓存的游戏状态
        const isRestoredFromCache = (cachedGameState && 
                                    this.sceneModel && 
                                    this.sceneModel.gameType === GameType.SKEWERS) ||
                                    (cachedState && 
                                    this.sceneModel && 
                                    this.sceneModel.gameType === GameType.SKEWERS &&
                                    cachedState.gameData.gameCode === BundleName.LISTENINGMASTER);
        
        if (!isRestoredFromCache) {
            // 没有缓存状态，正常初始化
            // 根据难度获取需要的回答数量
            const hardData = [3, 4, 5];
            const hardIndex = Math.max(0, Math.min(this._currentDifficulty - 1, hardData.length - 1));
            this._requiredAnswerCount = hardData[hardIndex];
            this._currentRequiredAnswerCount = this._requiredAnswerCount; // 记录本次游戏需要答题的数量
        } else {
            // 恢复缓存状态时，也记录需要答题的数量
            this._currentRequiredAnswerCount = this._requiredAnswerCount;
        }
        
        // 重置点击缓存
        this._clickedIndices.clear();
        this._wrongAnswerIndex = -1;
        this._selectedOptions = [];
        this._wrongAnswerCount = 0; // 重置答错数量
        this._correctAnswerCount = 0; // 重置答对数量
        this._currentRequiredAnswerCount = 0; // 重置需要答题数量
        
        // 初始化startBtn颜色为不可点击状态
        this.changeStartBtnColor(false);

        if (isRestoredFromCache) {
            // 优先使用 restoreData 中的缓存的游戏状态数据
            const stateToRestore = cachedGameState || (cachedState ? {
                questions: cachedState.questions,
                optionBank: cachedState.optionBank,
                videoPath: cachedState.videoPath,
                difficulty: cachedState.difficulty,
                requiredAnswerCount: cachedState.requiredAnswerCount
            } : null);
            
            if (stateToRestore) {
                // 恢复缓存的游戏状态，直接显示选项界面，不重新播放视频和音效
                DebugLog.instance.log(`从 restoreData 恢复缓存的游戏状态，直接显示选项界面`);
                
                // 恢复缓存的游戏状态数据
                this._questions = stateToRestore.questions || [];
                this._optionBank = stateToRestore.optionBank || [];
                this._currentVideoPath = stateToRestore.videoPath || null;
                this._currentDifficulty = stateToRestore.difficulty || this._currentDifficulty;
                this._requiredAnswerCount = stateToRestore.requiredAnswerCount || this._requiredAnswerCount;
                this._shouldDeferResult = true;
                
                // 隐藏视频节点（因为已经播放完音效了）
                if (this.videoNode) {
                    this.videoNode.active = false;
                }
                if (this.videoPlayer && this.videoPlayer.node) {
                    this.videoPlayer.node.active = false;
                }
                
                // 设置选项标签（使用缓存的选项题库）
                if (this._optionBank && this._optionBank.length > 0) {
                    // 将缓存的选项题库打乱顺序（可选）
                    this.shuffleArray(this._optionBank);
                    
                    // 将选项队列中每个data的name展示到对应的label上
                    if (this.chooseNodes) {
                        for (let i = 0; i < this.chooseNodes.children.length; i++) {
                            const childNode = this.chooseNodes.children[i];
                            if (!childNode) continue;
                            
                            if (i < this._optionBank.length) {
                                const option = this._optionBank[i];
                                const label = this.findLabelInNode(childNode);
                                if (label) {
                                    label.string = option.name;
                                }
                            }
                        }
                    }
                }
                
                // 显示选项节点
                if (this.optionsNode) {
                    this.optionsNode.active = true;
                    this._hasSubmittedAnswer = false;
                    this.answerCountLabel.string = `请选出<color=#B3F12E>${this._requiredAnswerCount}</color>种刚才听到的声音`;
                }
                
                // 启动答题倒计时
                this.startAnswerTimer();
                
                // // 清除缓存状态（如果使用的是 manager 中的缓存）
                // if (cachedState) {
                //     manager.clearCachedDeferredGameState();
                // }
                return; // 直接返回，不执行后续的 startVideoWithAudio
            }
        }
        
        // 如果没有缓存的游戏状态，正常流程：播放视频和音效，播放完成后显示选项节点
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

        // 计算答错数量和答对数量
        this._wrongAnswerCount = 0;
        this._correctAnswerCount = 0;
        // 统计选中的选项中错误答案和正确答案的数量
        if (this._selectedOptions && this._selectedOptions.length > 0) {
            this._wrongAnswerCount = this._selectedOptions.filter(opt => opt.isCorrect === false).length;
            this._correctAnswerCount = this._selectedOptions.filter(opt => opt.isCorrect === true).length;
        }
        
        // 记录本次游戏对应难度需要答题的数量（如果还没有记录）
        if (this._currentRequiredAnswerCount === 0) {
            this._currentRequiredAnswerCount = this._requiredAnswerCount;
        }
        
        DebugLog.instance.log(`本次游戏答错数量: ${this._wrongAnswerCount}, 答对数量: ${this._correctAnswerCount}, 需要答题数量: ${this._currentRequiredAnswerCount}`);

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
     * 展示成功结算
     * 串烧类型使用 GameAlert（通过 Skewers 流程），普通类型使用 SettlementPanel
     */
    private showSuccessPanel() {
        this.playAudio("music/win", true);

        // 计算本局耗时（如果有倒计时组件）
        let duration = 0;
        if (this.timerComponent && this.timerComponent.hasStarted) {
            try {
                duration = this.timerComponent.getElapsedTime
                    ? this.timerComponent.getElapsedTime()
                    : 0;
            } catch (e) {
                duration = 0;
            }
        }

        // 如果 _currentRequiredAnswerCount = 0，则重新用当前难度获取需要答题的数量
        if (this._currentRequiredAnswerCount === 0) {
            const hardData = [3, 4, 5];
            const hardIndex = Math.max(0, Math.min(this._currentDifficulty - 1, hardData.length - 1));
            this._currentRequiredAnswerCount = hardData[hardIndex];
            DebugLog.instance.log(`_currentRequiredAnswerCount 为 0，根据当前难度 ${this._currentDifficulty} 重新计算为: ${this._currentRequiredAnswerCount}`);
        }

        // 串烧模式：走 GameAlert / Skewers 统一结算流程
        if (this.sceneModel && this.sceneModel.gameType === GameType.SKEWERS) {
            DebugLog.instance.log(`串烧模式结算（成功），通过 GameAlert 流程上报结果`);
            
            // 检查是否是缓存数据
            const manager = SkewersManager.getInstance();
            const cachedState = manager.getCachedDeferredGameState();
            const isCachedData = this._shouldDeferResult && cachedState && cachedState.gameData;
            
            if (isCachedData) {
                // 是缓存数据，找到对应的 trainData
                const cachedGameData = cachedState.gameData;
                // 从缓存的 gameData 中找到对应的 trainData（deferResult == 1 的那个）
                let cachedTrainData = null;
                if (cachedGameData && cachedGameData.trains) {
                    for (let i = 0; i < cachedGameData.trains.length; i++) {
                        const trainData = cachedGameData.trains[i];
                        if (trainData && trainData.deferResult == 1) {
                            cachedTrainData = trainData;
                            break;
                        }
                    }
                }
                
                if (cachedTrainData) {
                    // 使用缓存数据上报
                    DebugLog.instance.log(`使用缓存数据上报（成功）`);
                    this.requestGameComplete({
                        context: this,
                        parentNode: this.mainView,
                        complete: 1,   // 成功
                        duration: duration,
                        isCachedData: true,
                        cachedGameData: cachedGameData,
                        cachedTrainData: cachedTrainData
                    });
                    manager.clearCachedDeferredGameState();
                } else {
                    // 找不到缓存的 trainData，走正常流程
                    DebugLog.instance.warn(`找不到缓存的 trainData，走正常流程上报`);
                    this.requestGameComplete({
                        context: this,
                        parentNode: this.mainView,
                        complete: 1,   // 成功
                        duration: duration,
                    });
                }
            } else {
                // 不是缓存数据，走正常流程
                this.requestGameComplete({
                    context: this,
                    parentNode: this.mainView,
                    complete: 1,   // 成功
                    duration: duration,
                });
            }
            return;
        }

        // 普通模式：使用通用结算面板
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
            },
        });
    }

    /**
     * 展示失败结算
     * 串烧类型使用 GameAlert（通过 Skewers 流程），普通类型使用 SettlementPanel
     */
    private showFailPanel() {
        this.playAudio("music/fail", true);

        // 计算本局耗时（如果有倒计时组件）
        let duration = 0;
        if (this.timerComponent && this.timerComponent.hasStarted) {
            try {
                duration = this.timerComponent.getElapsedTime
                    ? this.timerComponent.getElapsedTime()
                    : 0;
            } catch (e) {
                duration = 0;
            }
        }

        // 如果 _currentRequiredAnswerCount = 0，则重新用当前难度获取需要答题的数量
        if (this._currentRequiredAnswerCount === 0) {
            const hardData = [3, 4, 5];
            const hardIndex = Math.max(0, Math.min(this._currentDifficulty - 1, hardData.length - 1));
            this._currentRequiredAnswerCount = hardData[hardIndex];
            DebugLog.instance.log(`_currentRequiredAnswerCount 为 0，根据当前难度 ${this._currentDifficulty} 重新计算为: ${this._currentRequiredAnswerCount}`);
        }

        // 串烧模式：走 GameAlert / Skewers 统一结算流程
        if (this.sceneModel && this.sceneModel.gameType === GameType.SKEWERS) {
            DebugLog.instance.log(`串烧模式结算（失败），通过 GameAlert 流程上报结果`);
            
            // 检查是否是缓存数据
            const manager = SkewersManager.getInstance();
            const cachedState = manager.getCachedDeferredGameState();
            const isCachedData = this._shouldDeferResult && cachedState && cachedState.gameData;
            
            if (isCachedData) {
                // 是缓存数据，找到对应的 trainData
                const cachedGameData = cachedState.gameData;
                // 从缓存的 gameData 中找到对应的 trainData（deferResult == 1 的那个）
                let cachedTrainData = null;
                if (cachedGameData && cachedGameData.trains) {
                    for (let i = 0; i < cachedGameData.trains.length; i++) {
                        const trainData = cachedGameData.trains[i];
                        if (trainData && trainData.deferResult == 1) {
                            cachedTrainData = trainData;
                            break;
                        }
                    }
                }
                
                if (cachedTrainData) {
                    // 使用缓存数据上报
                    DebugLog.instance.log(`使用缓存数据上报（失败）`);
                    this.requestGameComplete({
                        context: this,
                        parentNode: this.mainView,
                        complete: this._correctAnswerCount/this._currentRequiredAnswerCount,
                        duration: duration,
                        isCachedData: true,
                        cachedGameData: cachedGameData,
                        cachedTrainData: cachedTrainData
                    });
                    manager.clearCachedDeferredGameState();
                } else {
                    // 找不到缓存的 trainData，走正常流程
                    DebugLog.instance.warn(`找不到缓存的 trainData，走正常流程上报`);
                    this.requestGameComplete({
                        context: this,
                        parentNode: this.mainView,
                        complete: this._correctAnswerCount/this._currentRequiredAnswerCount,   // 失败
                        duration: duration,
                    });
                }
            } else {
                // 不是缓存数据，走正常流程
                this.requestGameComplete({
                    context: this,
                    parentNode: this.mainView,
                    complete: this._correctAnswerCount/this._currentRequiredAnswerCount,   // 失败
                    duration: duration,
                });
            }
            return;
        }

        // 普通模式：使用通用结算面板
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
            },
        });
    }

    /**
     * 重玩当前关卡
     * 使用上一次的音效和视频，不重新随机
     */
    private async restartCurrentLevel() {
        // 停止当前播放的视频和音频（无需进入答题阶段，这里忽略返回值）
        this.stopVideoWithAudio();
        
        // 先重置选项节点状态（在隐藏之前重置，确保颜色被重置）
        this.resetOptionNodes();
        
        // 重置所有状态
        this.resetGameState();
        
        // 串烧模式下，使用保存的题目和视频路径
        if (this.sceneModel && this.sceneModel.gameType === GameType.SKEWERS) {
            // 使用保存的题目
            if (this._skewersSavedQuestions && this._skewersSavedQuestions.length > 0) {
                this._questions = [...this._skewersSavedQuestions];
                DebugLog.instance.log(`串烧模式重玩 - 使用保存的题目: ${this._questions.map(q => q.name).join(', ')}`);
            } else {
                // 如果没有保存的题目，则重新获取（容错处理）
                this._questions = this.model.getQuestion(this._currentDifficulty);
                this._skewersSavedQuestions = this._questions ? [...this._questions] : null;
                DebugLog.instance.log(`串烧模式重玩 - 重新获取题目并保存（无保存的题目）`);
            }
            
            // 使用保存的视频路径
            if (this._skewersSavedVideoPath) {
                await this.loadLocalVideo(this._skewersSavedVideoPath, true);
                DebugLog.instance.log(`串烧模式重玩 - 使用保存的视频: ${this._skewersSavedVideoPath}`);
            } else {
                // 如果没有保存的视频路径，则重新随机并保存（容错处理）
                await this.initVideo();
                DebugLog.instance.log(`串烧模式重玩 - 重新随机视频并保存（无保存的视频路径）`);
            }
        } else {
            // 非串烧模式：使用上一次的题目和视频路径
            const savedQuestions = this._questions ? [...this._questions] : null;
            const savedVideoPath = this._currentVideoPath;
            
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
        
        // 根据游戏类型处理难度和关卡
        if (this.sceneModel && this.sceneModel.gameType === GameType.SKEWERS) {
            // 串烧训练模式：从 sceneModel 获取最新的难度和关卡（不自动增加难度）
            this._currentDifficulty = (this.sceneModel as any).difficulty || 1;
            const level = (this.sceneModel as any).level || 1;
            
            // 更新进度条和关卡标签
            const skewersGameData = (this.sceneModel as any).game;
            if (skewersGameData && this.progress) {
                this.progress.progress = skewersGameData.progress || 0;
            }
            if (skewersGameData && this.progresslabel) {
                this.progresslabel.string = "第" + (skewersGameData.progressStr || level) + "关";
            }
            
            DebugLog.instance.log(`串烧训练模式 - 进入下一关，难度: ${this._currentDifficulty}, 关卡: ${level}`);
        } else {
            // 非串烧模式：可以自动增加难度（如果需要）
            const maxDifficulty = 3;
            // this._currentDifficulty = (this._currentDifficulty % maxDifficulty) + 1;
            
            let level = 1;
            if (this.sceneModel) {
                // 如果是 GameCenterSpecModel（从 GameCenterManager 进入），难度从 guidepanel 选择，level 直接等于 1
                if (this.sceneModel.gameType === GameType.GAME_CENTER) {
                    // 难度通过 guidepanel 选择的难度（从 sceneModel.difficulty 获取）
                    this._currentDifficulty = (this.sceneModel as any)?.difficulty || 1;
                    level = 1; // level 直接等于 1
                } else {
                    // 其他模式：使用默认逻辑
                    level = (this.sceneModel as any)?.levelIndex || (this.sceneModel as any)?.level || 1;
                }
            }
            if (this.progress) {
                this.progress.progress = 1;
            }
            if (this.progresslabel) {
                this.progresslabel.string = "第" + level + "关";
            }
            
            DebugLog.instance.log(`普通模式 - 进入下一关，难度: ${this._currentDifficulty}, 关卡: ${level}`);
        }
        
        // 重置所有状态
        this.resetGameState();
        
        // 根据新难度获取需要的回答数量
        const hardData = [3, 4, 5];
        const hardIndex = Math.max(0, Math.min(this._currentDifficulty - 1, hardData.length - 1));
        this._requiredAnswerCount = hardData[hardIndex];
        this._currentRequiredAnswerCount = this._requiredAnswerCount; // 记录本次游戏需要答题的数量
        
        // 串烧模式下，使用保存的题目和视频路径，保证多次游戏一致
        if (this.sceneModel && this.sceneModel.gameType === GameType.SKEWERS) {
            // 使用保存的题目
            if (this._skewersSavedQuestions && this._skewersSavedQuestions.length > 0) {
                this._questions = [...this._skewersSavedQuestions];
                DebugLog.instance.log(`串烧模式进入下一关 - 使用保存的题目: ${this._questions.map(q => q.name).join(', ')}`);
            } else {
                // 如果没有保存的题目，则重新获取并保存（容错处理）
                this._questions = this.model.getQuestion(this._currentDifficulty);
                this._skewersSavedQuestions = this._questions ? [...this._questions] : null;
                DebugLog.instance.log(`串烧模式进入下一关 - 重新获取题目并保存（无保存的题目）`);
            }
            
            // 使用保存的视频路径
            if (this._skewersSavedVideoPath) {
                await this.loadLocalVideo(this._skewersSavedVideoPath, false);
                DebugLog.instance.log(`串烧模式进入下一关 - 使用保存的视频: ${this._skewersSavedVideoPath}`);
            } else {
                // 如果没有保存的视频路径，则重新随机并保存（容错处理）
                await this.initVideo();
                DebugLog.instance.log(`串烧模式进入下一关 - 重新随机视频并保存（无保存的视频路径）`);
            }
        } else {
            // 非串烧模式：重新获取新难度的题目和视频
            this._questions = this.model.getQuestion(this._currentDifficulty);
            
            // 重新随机选择背景音乐
            // this.randomPlayBgm();
            
            // 重新初始化视频（会随机选择新的视频）
            await this.initVideo();
        }
        
        // 视频加载完成后，重新开始视频和音频播放
        this.startVideoWithAudio();
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
        this._wrongAnswerCount = 0; // 重置答错数量
        this._correctAnswerCount = 0; // 重置答对数量
        this._currentRequiredAnswerCount = 0; // 重置需要答题数量
        
        // 重置播放状态
        this._playedQuestions = [];
        this._isFirstAudio = true;
        this._isPlaying = false;
        this._allAudioFinished = false;
        this._finishedAudioCount = 0;
        this._audioQueue = []; // 重置音效队列
        
        // 清除定时器
        if (this._audioTimer) {
            clearTimeout(this._audioTimer);
            this._audioTimer = null;
        }
        if (this._firstAudioTimer) {
            clearTimeout(this._firstAudioTimer);
            this._firstAudioTimer = null;
        }
        if (this._audioCountdownTimer) {
            clearTimeout(this._audioCountdownTimer);
            this._audioCountdownTimer = null;
        }

        // 停止并清理AudioSource
        if (this._audioSource) {
            this._audioSource.node.off(AudioSource.EventType.ENDED, this.onAudioFinished, this);
            this._audioSource.stop();
            this._audioSource.clip = null;
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

        // 串烧模式下，如果已有保存的视频路径，则使用保存的视频路径，否则随机选择并保存
        let videoPath: string = null;
        if (this.sceneModel && this.sceneModel.gameType === GameType.SKEWERS) {
            if (this._skewersSavedVideoPath) {
                // 使用保存的视频路径，保证多次游戏一致
                videoPath = this._skewersSavedVideoPath;
                DebugLog.instance.log(`串烧训练模式 - 使用保存的视频路径: ${videoPath}`);
            } else {
                // 第一次游戏，随机选择视频并保存
                const randomIndex = Math.floor(Math.random() * this.videoLen);
                videoPath = `video/bgm${randomIndex}`;
                this._skewersSavedVideoPath = videoPath;
                DebugLog.instance.log(`串烧训练模式 - 随机选择视频并保存: ${videoPath}`);
            }
        }
        
        await this.loadLocalVideo(videoPath);
    }


    private videoLen:number = 11;

    private playvideoDelay:number = 500;

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
            
            // 串烧模式下，如果还没有保存的视频路径，则保存当前视频路径
            if (this.sceneModel && this.sceneModel.gameType === GameType.SKEWERS && !this._skewersSavedVideoPath) {
                this._skewersSavedVideoPath = videoPath;
                DebugLog.instance.log(`串烧训练模式 - 保存视频路径: ${videoPath}`);
            }

            if (videoPath&&videoPath.length>0) {
                const bundle = assetManager.getBundle(BundleName.LISTENINGMASTER);
                if (!bundle) {
                    DebugLog.instance.error(`Bundle ${BundleName.LISTENINGMASTER} 未加载`);
                    reject(new Error(`Bundle ${BundleName.LISTENINGMASTER} 未加载`));
                    return;
                }

                let self = this;
                bundle.load(videoPath, VideoClip, (err, videoClip) => {
                    if (err) {
                        DebugLog.instance.error(`加载视频失败: ${videoPath}`, err);
                        reject(err);
                        return;
                    }

                    DebugLog.instance.log(`视频加载成功: ${videoPath}`);

                    // 设置视频到播放器
                    self.videoPlayer.clip = videoClip;
                    // 设置视频循环播放
                    self.videoPlayer.loop = true;
                    self.videoNode.active = true;
                    self.videoPlayer.node.active = true;
                    self.adaptVideoPlayer();

                    // 如果设置了自动播放，立即播放视频
                    if (autoPlay) {
                        self.playVideo(self.playvideoDelay,self);
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
     * 播放视频（统一调用接口）
     * @param delay 延迟播放时间（毫秒），默认0立即播放
     * @param context 上下文对象（用于延迟回调时使用）
     */
    playVideo(delay: number = 0, context?: any) {
        const targetContext = context || this;
        const playAction = () => {
            if (targetContext.videoPlayer) {
                // 如果视频未播放，则播放
                if (!targetContext.videoPlayer.isPlaying) {
                    targetContext.videoPlayer.play();
                    console.log(`视频未播放，开始播放视频`);
                } else {
                    // 如果视频正在播放，确保继续播放
                    // targetContext.videoPlayer.play();
                    console.log(`视频正在播放，确保继续播放`);
                }
            }
        };

        if (delay > 0) {
            setTimeout(() => {
                if (targetContext && targetContext.videoPlayer) {
                    playAction();
                }
            }, delay);
        } else {
            playAction();
        }
    }

    /**
     * 暂停视频（外部调用接口）
     */
    pauseVideo() {
        if (this.videoPlayer) {
            // 如果视频正在播放，则暂停
            if (this.videoPlayer.isPlaying) {
                this.videoPlayer.pause();
                console.log(`listen 视频已暂停`);
            } else {
                console.log(`listen 视频未在播放，无需暂停`);
            }
        }
    }

    /**
     * 停止视频（外部调用接口）
     */
    stopVideo() {
        if (this.videoPlayer) {
            this.videoPlayer.stop();
            // 清空视频内容
            this.videoPlayer.clip = null;
            console.log(`listen 视频已停止并清空内容`);
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

        // 重置状态
        this._playedQuestions = [];
        this._isFirstAudio = true;
        this._isPlaying = true;
        this._allAudioFinished = false;
        this._finishedAudioCount = 0;

        // 初始化音效队列：复制题目数组并打乱顺序
        this._audioQueue = [...this._questions];
        this.shuffleArray(this._audioQueue);

        DebugLog.instance.log(`开始播放，共 ${this._audioQueue.length} 个音效`);

        // 确保视频循环播放（视频会一直循环直到所有音效播放完成）
        if (this.videoPlayer) {
            this.videoPlayer.loop = true;
        }

        // 播放视频（会一直循环直到停止）
        this.playVideo(this.playvideoDelay,this);

        // 第一个音效延迟3秒播放
        this._firstAudioTimer = setTimeout(() => {
            if (this._isPlaying) {
                this.playNextAudioFromQueue();
            }
            this._firstAudioTimer = null;
        }, this._firstAudioDelay * 1000);
    }

    /**
     * 从队列中取出并播放下一个音效
     */
    private playNextAudioFromQueue() {
        if (!this._isPlaying || !this._audioQueue || this._audioQueue.length === 0) {
            // 队列为空，所有音效都已播放完成
            this.onAllAudioFinished();
            return;
        }

        // 从队列头部取出一个音效
        const question = this._audioQueue.shift();
        if (!question) {
            this.onAllAudioFinished();
            return;
        }

        // 判断当前视频是否在播放，如果没有则让它播放
        this.playVideo(this.playvideoDelay, this);

        // 标记为已播放
        this._playedQuestions.push(question);
        this._isFirstAudio = false;

        // 从 bundle 加载并播放音效
        const bundle = assetManager.getBundle(BundleName.LISTENINGMASTER);
        if (!bundle) {
            DebugLog.instance.error(`Bundle ${BundleName.LISTENINGMASTER} 未加载`);
            // 加载失败，继续播放下一个音效
            this.startAudioCountdown();
            return;
        }

        bundle.load(question.path, AudioClip, (err, audioClip) => {
            if (err) {
                DebugLog.instance.error(`加载音效失败: ${question.path}`, err);
                // 加载失败，继续播放下一个音效
                this.startAudioCountdown();
                return;
            }

            if (audioClip && this._audioSource) {
                // 先移除之前的事件监听器（避免重复绑定）
                this._audioSource.node.off(AudioSource.EventType.ENDED, this.onAudioFinished, this);

                // 使用AudioSource播放音效，可以监听播放完成事件
                this._audioSource.clip = audioClip;
                this._audioSource.play();

                DebugLog.instance.log(`播放音效: ${question.name}, 队列剩余: ${this._audioQueue.length}, 已播放: ${this._playedQuestions.length}/${this._questions.length}`);

                // 监听播放完成事件
                this._audioSource.node.on(AudioSource.EventType.ENDED, this.onAudioFinished, this);
            } else if (!audioClip) {
                // 如果音效加载失败，继续播放下一个音效
                this.startAudioCountdown();
            }
        });
    }

    /**
     * 音效播放完成回调
     */
    private onAudioFinished() {
        if (!this._isPlaying) {
            return;
        }

        this._finishedAudioCount++;
        DebugLog.instance.log(`音效播放完成，已完成: ${this._finishedAudioCount}/${this._questions.length}`);

        // 开启2秒倒计时，倒计时完成后播放下一个音效
        this.startAudioCountdown();
    }

    /**
     * 开启2秒倒计时，倒计时完成后播放下一个音效
     */
    private startAudioCountdown() {
        if (!this._isPlaying) {
            return;
        }

        // 清除之前的倒计时定时器
        if (this._audioCountdownTimer) {
            clearTimeout(this._audioCountdownTimer);
        }

        // 开启2秒倒计时
        this._audioCountdownTimer = setTimeout(() => {
            if (this._isPlaying) {
                // 倒计时完成，播放下一个音效
                this.playNextAudioFromQueue();
            }
            this._audioCountdownTimer = null;
        }, 2000);
    }

    /**
     * 所有音效播放完成后的处理
     */
    private onAllAudioFinished() {
        if (!this._allAudioFinished) {
            this._allAudioFinished = true;
            DebugLog.instance.log(`队列中所有音效已播放完成，开启2秒倒计时后关闭视频并显示选项`);

            // 开启2秒倒计时，倒计时完成后关闭视频显示选项
            if (this._audioCountdownTimer) {
                clearTimeout(this._audioCountdownTimer);
            }

            this._audioCountdownTimer = setTimeout(() => {
                if (this._isPlaying) {
                    // 根据返回值决定是否进入答题阶段
                    const shouldShowOptions = this.stopVideoWithAudio();
                    if (shouldShowOptions) {
                        this.startAnswerTimer();
                    } else {
                        DebugLog.instance.log(`所有音效播放完成，但当前为串烧 deferResult 中间关卡，不进入答题阶段`);
                    }
                }
                this._audioCountdownTimer = null;
            }, 2000);
        }
    }

    /**
     * 停止视频和音效播放
     */
    private stopVideoWithAudio(): boolean {
        this._isPlaying = false;

        // 清除定时器
        if (this._audioTimer) {
            clearTimeout(this._audioTimer);
            this._audioTimer = null;
        }

        if (this._firstAudioTimer) {
            clearTimeout(this._firstAudioTimer);
            this._firstAudioTimer = null;
        }

        if (this._audioCountdownTimer) {
            clearTimeout(this._audioCountdownTimer);
            this._audioCountdownTimer = null;
        }

        // 停止并清理AudioSource
        if (this._audioSource) {
            this._audioSource.node.off(AudioSource.EventType.ENDED, this.onAudioFinished, this);
            this._audioSource.stop();
            this._audioSource.clip = null;
        }

        // 停止视频
        this.stopVideo();

        // 隐藏视频播放器
        if (this.videoPlayer && this.videoPlayer.node) {
            this.videoNode.active = false;
            this.videoPlayer.node.active = false;
        }

        // 如果 deferResult == 1，播放完成后标记为已播放，然后检查是否有下一个游戏
        if (this._shouldDeferResult && this.sceneModel && this.sceneModel.gameType === GameType.SKEWERS) {
            const manager = SkewersManager.getInstance();
            const curGameData = manager.curGame;
            if (curGameData) {
                const curTrainData = curGameData.getCurTrainData();
                if (curTrainData && curTrainData.deferResult == 1) {
                    // 标记当前 trainData 已经播放过音效和视频
                    curTrainData.hasPlayedAudioVideo = true;
                    DebugLog.instance.log(`deferResult=1，音效和视频播放完成，标记 trainData 为已播放`);
                    
                    // 检查是否有下一个未完成的游戏（不包括当前游戏）
                    const hasNextGame = manager.hasNextUnCompleteGame(curGameData);
                    
                    if (hasNextGame) {
                        // 有下一个游戏类型，缓存当前游戏状态（题目、选项题库、视频路径等），然后跳转
                        // 注意：此时选项题库可能还没有初始化，需要在 setupOptionLabels 之前缓存
                        // 但 setupOptionLabels 是在显示选项时调用的，所以这里需要先初始化选项题库
                        if (!this._optionBank || this._optionBank.length === 0) {
                            // 如果选项题库未初始化，先初始化它
                            this.setupOptionLabels();
                        }
                        
                        // 缓存当前游戏状态
                        manager.cacheDeferredGameState(curGameData, {
                            questions: this._questions ? [...this._questions] : [],
                            optionBank: this._optionBank ? [...this._optionBank] : [],
                            videoPath: this._currentVideoPath || "",
                            difficulty: this._currentDifficulty,
                            requiredAnswerCount: this._requiredAnswerCount
                        });
                        
                        // 定义继续回调：跳转到下一个游戏
                        const goonCallBack = () => {
                            DebugLog.instance.log(`用户选择继续，跳转到下一个游戏`);
                            manager.runNextGame(true);
                        };
                        
                        // 定义退出回调：退出串烧任务
                        const exitCallBack = () => {
                            DebugLog.instance.log(`用户选择退出，退出串烧任务`);
                            if (this.sceneModel) {
                                this.sceneModel.remoteExitCallBack();
                            }
                        };
                        
                        // 显示缓存游戏提示弹窗
                        DebugLog.instance.log(`deferResult=1，且不是最后一个游戏类型，显示缓存游戏提示弹窗`);
                        manager.showGameAlert(this.mainView, AlertType.Cache, "请注意", "请记住刚才听到的音效", true, 0, 0, goonCallBack, exitCallBack, this);
                        return false; // 不显示本局选项
                    } else {
                        // 没有下一个游戏类型，说明这是最后一个，正常显示选项并等待最终提交
                        DebugLog.instance.log(`deferResult=1，且当前为最后一个游戏类型，正常显示听音选项等待最终提交`);
                    }
                }
            }
        }

        // 显示选项节点（仅在需要进入答题阶段时调用）
        if (this.optionsNode) {
             // 获取选项队列并设置到label上
             this.setupOptionLabels();
            this.optionsNode.active = true;
            
            // 重置提交答案标记
            this._hasSubmittedAnswer = false;

            this.answerCountLabel.string = `请选出<color=#B3F12E>${this._requiredAnswerCount}</color>种刚才听到的声音`;
        }

        DebugLog.instance.log(`所有音效播放完成，停止视频并显示选项`);
        return true;
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

        // 倒计时结束且未提交答案，完成度填入 0
        DebugLog.instance.log(`倒计时结束，完成度填入 0`);
        
        // 倒计时结束时，将答对数量设置为 0，确保完成度为 0
        this._correctAnswerCount = 0;
        
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

        // 选项数量足够，但倒计时结束，完成度仍为 0，直接判断失败
        DebugLog.instance.log(`倒计时结束，选项数量足够但超时，完成度为 0，直接判断失败`);
        this._hasSubmittedAnswer = true;
        this.showFailPanel();
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
            if (this._audioCountdownTimer) {
                clearTimeout(this._audioCountdownTimer);
                this._audioCountdownTimer = null;
            }
            // 暂停音效播放
            if (this._audioSource && this._audioSource.playing) {
                this._audioSource.pause();
            }
            
            // 暂停音效播放（通过设置_isPlaying标志）
            this._isPlaying = false;
            DebugLog.instance.log(`退出界面，暂停视频和音效播放（播放阶段），已清除所有定时器`);
        } else if (isInAnswerPhase) {
            // 在答题阶段：已经停止播放
            DebugLog.instance.log(`退出界面，答题阶段`);
        } else {
            // 其他情况：完全停止（无需进入答题阶段，这里忽略返回值）
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
            
            // 恢复视频播放（延迟1秒后从暂停位置继续播放）
            if (context) {
                context.playVideo(context.playvideoDelay, context);
            }
            
            // 恢复音效播放（重新设置_isPlaying标志，重新启动定时器）
            if (context && !context._isPlaying && !context._allAudioFinished) {
                context._isPlaying = true;
                
                // 恢复AudioSource播放（如果被暂停了）
                if (context._audioSource && !context._audioSource.playing && context._audioSource.clip) {
                    context._audioSource.play();
                }
                
                // 重新绑定AudioSource事件监听（如果AudioSource存在）
                if (context._audioSource) {
                    context._audioSource.node.off(AudioSource.EventType.ENDED, context.onAudioFinished, context);
                    context._audioSource.node.on(AudioSource.EventType.ENDED, context.onAudioFinished, context);
                }
                
                // 判断是否需要重新启动音效播放
                // 如果音效正在播放，恢复播放即可（AudioSource会自动继续）
                // 如果音效已播放完成但队列还有音效，开启2秒倒计时后播放下一个
                if (context._audioSource && context._audioSource.playing) {
                    // 音效正在播放，无需额外操作
                    DebugLog.instance.log(`继续游戏，音效正在播放中`);
                } else if (context._audioQueue && context._audioQueue.length > 0) {
                    // 队列还有音效，开启2秒倒计时后播放下一个
                    context.startAudioCountdown();
                    DebugLog.instance.log(`继续游戏，队列还有 ${context._audioQueue.length} 个音效，开启2秒倒计时`);
                } else if (context._isFirstAudio && !context._firstAudioTimer) {
                    // 第一个音效还没播放，重新启动第一个音效延迟定时器
                    context._firstAudioTimer = setTimeout(() => {
                        if (context._isPlaying) {
                            context.playNextAudioFromQueue();
                        }
                        context._firstAudioTimer = null;
                    }, context._firstAudioDelay * 1000);
                    DebugLog.instance.log(`继续游戏，重新启动第一个音效延迟定时器`);
                }
                
                DebugLog.instance.log(`继续游戏，恢复音效播放，队列剩余: ${context._audioQueue ? context._audioQueue.length : 0}, 已播放: ${context._playedQuestions.length}/${context._questions.length}, 已完成: ${context._finishedAudioCount}/${context._questions.length}`);
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