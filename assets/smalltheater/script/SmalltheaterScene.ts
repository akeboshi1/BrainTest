import { _decorator, AnimationComponent, Color, Component, easing, instantiate, Label, Node, RichText, Sprite, Tween, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { AutoPlayLineData, SmalltheaterModel } from './SmalltheaterModel';
import { StateMachine } from '../../scripts/Core/StateMachine/StateMachine';
import { AbortablePromise } from '../../scripts/Core/StateMachine/AbortablePromise';
import { DebugLog } from '../../scripts/Core/Util/DebugLog';
import { UnitFlow } from '../../scripts/Core/StateMachine/UnitFlow';
import { SequenceFlow } from '../../scripts/Core/StateMachine/SequenceFlow';
import { CharacterCtrl } from './CharacterCtrl';
import { AudioManager } from '../../scripts/Core/Manager/Audio/AudioManager';
import { SceneManager } from '../../scripts/Core/Manager/Scene/SceneManager';
import { EventManager } from '../../scripts/Core/Manager/Event/EventManager';
import { ChatFlowModel } from '../../scripts/Game/UI/ChatPanel/Model/ChatFlowModel';
import { ParallelFlow } from '../../scripts/Core/StateMachine/ParallelFlow';
import { IFlow } from '../../scripts/Core/StateMachine/IFlow';
import { UIManager } from '../../scripts/Core/Manager/UI/UIManager';
import { StageLinesPanel } from './StageLinesPanel';
import { BundleName } from '../../scripts/Core/Manager/Load/BundleName';
const { ccclass, property } = _decorator;

@ccclass('SmalltheaterScene')
export class SmalltheaterScene extends Component {
    @property(Node)
    blackMask: Node = null;

    @property(Node)
    mubu_l: Node = null;

    @property(Node)
    mubu_r: Node = null;

    @property(Node)
    descNode: Node = null;

    @property(Label)
    descLabel: Label = null;

    @property(Label)
    plotTitle: Label = null;

    @property(Node)
    btnStartGame: Node = null;

    @property([Node])
    characterRootNodes: Node[] = [];

    @property(RichText)
    stagelineLabel: RichText = null;

    @property(Node)
    btnConfirmCharacter: Node = null;

    @property(Label)
    selectCharacterLabel: Label = null;

    @property(Label)
    timeCountLabel: Label = null;

    @property(Node)
    btnRecord: Node = null;

    @property(Node)
    btnStopRecord: Node = null;

    @property(Node)
    talkingAnimNode: Node = null;

    @property(Node)
    scoringNode: Node = null;

    @property(Label)
    scoreLabel: Label = null;

    @property(Label)
    scoringProcessLabel: Label = null;

    @property(Node)
    btnReplay: Node = null;

    @property(Node)
    btnStopReplay: Node = null;

    private model: SmalltheaterModel = new SmalltheaterModel();

    private stateMachine: StateMachine = new StateMachine();

    private _characterNodes: Node[] = [];

    private _flowCache: IFlow[] = [];
    private _scrollScoreTw: Tween<Node> = null;

    private mubul_original_pos = new Vec3(20, 767, 0);
    private mubul_target_pos = new Vec3(-590, 767, 0);
    private mubur_original_pos = new Vec3(-20, 767, 0);
    private mubur_target_pos = new Vec3(590, 767, 0);
    private desc_origianl_pos = new Vec3(0, 205, 0);
    private desc_target_pos = new Vec3(0, 1600, 0);

    start() {
        this.model.init();

        this.initScene();

        this.stateMachine.addState(SmalltheaterState.LoadConfig, this.onEnterLoadConfig.bind(this));
        this.stateMachine.addState(SmalltheaterState.DescribePlot, this.onEnterDescribePlot.bind(this));
        this.stateMachine.addState(SmalltheaterState.Demo, this.onEnterDemo.bind(this));
        this.stateMachine.addState(SmalltheaterState.Interaction, this.onEnterInteraction.bind(this));
        this.stateMachine.addState(SmalltheaterState.AutoPlayLine, this.onEnterAutoPlayLine.bind(this));
        this.stateMachine.addState(SmalltheaterState.PlayerLine, this.onEnterPlayLine.bind(this));
        this.stateMachine.addState(SmalltheaterState.SelectCharacter, this.onEnterSelectCharacter.bind(this));
        this.stateMachine.addState(SmalltheaterState.Scoring, this.onEnterScoring.bind(this));
        this.stateMachine.addState(SmalltheaterState.Replay, this.onEnterReplay.bind(this));

        this.stateMachine.enterState(SmalltheaterState.LoadConfig, { id: 1 });

        AudioManager.getInstance().onAudioEnd(this.onAudioEnd, this);

        EventManager.getInstance().on(ChatFlowModel.ASRResult, this.onAsrResult, this);
        EventManager.getInstance().on(ChatFlowModel.ASRFlowStartEvent, this.onAsrContected, this);
        EventManager.getInstance().on(ChatFlowModel.ASRFlowCompleteEvent, this.onAsrClosed, this);

        UIManager.getInstance().registerPanel(StageLinesPanel.NAME, BundleName.SMALLTHEATER, "prefab/StageLinesPanel", StageLinesPanel);
    }

    protected onDestroy(): void {
        EventManager.getInstance().off(ChatFlowModel.ASRResult, this);
        EventManager.getInstance().off(ChatFlowModel.ASRFlowStartEvent, this);
        EventManager.getInstance().off(ChatFlowModel.ASRFlowCompleteEvent, this);

        ChatFlowModel.getInstance().onCloseASR();

        AudioManager.getInstance().offAudioEnd(this.onAudioEnd, this);

        AudioManager.getInstance().stop();

        this.cleanFlowCache();

        this.model.dispose();
        this.stateMachine.dispose();
    }

    private initScene() {
        this.blackMask.active = true;
        this.blackMask.getComponent(UIOpacity).opacity = 255;
        this.mubu_l.setPosition(this.mubul_original_pos);
        this.mubu_r.setPosition(this.mubur_original_pos);
        this.descNode.setPosition(this.desc_origianl_pos);
    }

    private async onEnterLoadConfig(data: any) {
        await this.model.loadConfigByID(data.id);

        let plot = this.model.currentPlot;
        this.plotTitle.string = plot.poltName;
        this.descLabel.string = plot.description;
        this.btnStartGame.active = true;

        this.model.initDemoState();

        let flow = new UnitFlow(this.blackMaskHideFlow());
        await this.stateMachine.enterState(SmalltheaterState.DescribePlot, null, flow);
    }

    private async onEnterDescribePlot(data: any) {
        this.blackMask.active = false;

        for (let i = 0; i < this._characterNodes.length; i++) {
            let inst = this._characterNodes[i];
            inst.removeFromParent();
        }
        this._characterNodes = [];

        let plot = this.model.currentPlot;
        let characters = plot.character;
        for (let i = 0; i < characters.length; i++) {
            const cdata = characters[i];
            const cprefab = await this.model.loadCharacterPrefab(cdata.prefab);
            const inst = instantiate(cprefab);
            this.characterRootNodes[i].addChild(inst);
            inst.setPosition(0, 0);
            this._characterNodes.push(inst);
        }
    }

    private onEnterDemo(data: any) {
        if (this.model.hasCurrentStageLine()) {
            this.model.prepareAutoPlayData().then((data: AutoPlayLineData) => {
                this.stateMachine.enterState(SmalltheaterState.AutoPlayLine, data);
            });
        } else {
            this.stateMachine.enterState(SmalltheaterState.SelectCharacter);
        }
    }

    private onEnterInteraction(data: any) {
        if (this.model.hasCurrentStageLine()) {
            if (this.model.getCurrentStageLine().character == this.model.selectedCharacterIndex) {
                this.stateMachine.enterState(SmalltheaterState.PlayerLine);
            } else {
                this.model.prepareAutoPlayData().then((data: AutoPlayLineData) => {
                    this.stateMachine.enterState(SmalltheaterState.AutoPlayLine, data);
                });
            }
        } else {
            let parallelFlow = new ParallelFlow();
            parallelFlow.addFlow(this.timeCountLabelAnim("演出结束"));
            parallelFlow.addFlow(this.closeMubuFlow());
            this.stateMachine.enterState(SmalltheaterState.Scoring, null, parallelFlow);
        }
    }

    private onEnterAutoPlayLine(data: AutoPlayLineData) {
        if (data) {
            this.stagelineLabel.node.active = true;
            let str = data.characterName + ":\n" + data.line;
            if (data.playerResult) {
                str += "\n<color=#000000>[你]：" + data.playerResult + "</color>";
            }
            this.stagelineLabel.string = str;
            for (let i = 0; i < this._characterNodes.length; i++) {
                let inst = this._characterNodes[i];
                let ctrl = inst.getComponent(CharacterCtrl);
                ctrl.setMaskOpacity(i == data.characterid ? 0 : 125);
            }
            AudioManager.getInstance().play(data.audioClip);
        }
    }

    private onEnterPlayLine(data: any) {
        this.btnRecord.active = true;
        this.model.cleanAsrResult();
        for (let i = 0; i < this._characterNodes.length; i++) {
            let inst = this._characterNodes[i];
            let ctrl = inst.getComponent(CharacterCtrl);
            ctrl.setMaskOpacity(i == this.model.selectedCharacterIndex ? 0 : 125);
        }
        this.stagelineLabel.node.active = true;
        this.stagelineLabel.string = this.model.currentStageLine.tipline;
    }

    private onEnterSelectCharacter(data: any) {
        for (let i = 0; i < this._characterNodes.length; i++) {
            let inst = this._characterNodes[i];
            let ctrl = inst.getComponent(CharacterCtrl);
            ctrl.setInteractive(true);
            ctrl.setMaskOpacity(125);
            ctrl.setTouchedCallback(this.onTouchCharacter.bind(this, i))
        }
        this.btnConfirmCharacter.active = true;
        this.btnConfirmCharacter.getComponent(Sprite).color = Color.GRAY;
        this.selectCharacterLabel.node.active = true;
        this.selectCharacterLabel.string = "请选择你想要扮演的角色";
    }

    private async onEnterScoring(data: any) {
        this.cleanFlowCache();
        this.scoreLabel.string = "???";

        let unitflow = new UnitFlow(this.showScoringNodeFlow());
        this._flowCache.push(unitflow);
        await unitflow.start();
        this.startScoringAnim();

        let score = this.model.score;
        if (this.model.score == -1) {
            let postflow = new UnitFlow(this.model.postPlayerResult())
            this._flowCache.push(postflow);
            score = await postflow.start();
        }

        let duration: number = 6;
        this.stopScoringAnimAtNum(score, duration);

        let delayflow = new UnitFlow(this.delayFlow(duration * 1000));
        this._flowCache.push(delayflow);
        await delayflow.start();
        this.btnReplay.active = true;
    }

    private onEnterReplay(data: any) {
        this.btnStopReplay.active = true;
        if (this.model.hasCurrentStageLine()) {
            let cursl = this.model.getCurrentStageLine();
            if (cursl.character == this.model.selectedCharacterIndex) {
                let timestamp = this.model.timeStampMap.get(cursl.id);
                let id = this.model.plotID + "_" + cursl.id + "_" + timestamp;
                this.model.prepareAutoPlayData(id).then((data: AutoPlayLineData) => {
                    this.stateMachine.enterState(SmalltheaterState.AutoPlayLine, data);
                }).catch(() => {
                    DebugLog.instance.warn("下载不到玩家语音：" + id);
                    this.model.goNextStageLine();
                    this.stateMachine.enterState(SmalltheaterState.Replay);
                });
            } else {
                this.model.prepareAutoPlayData().then((data: AutoPlayLineData) => {
                    this.stateMachine.enterState(SmalltheaterState.AutoPlayLine, data);
                });
            }
        } else {
            this.btnStopReplay.active = false;
            let parallelFlow = new ParallelFlow();
            parallelFlow.addFlow(this.timeCountLabelAnim("演出结束"));
            parallelFlow.addFlow(this.closeMubuFlow());
            this.stateMachine.enterState(SmalltheaterState.Scoring, null, parallelFlow);
        }
    }

    //============== clickHandler ======================
    onClickStartGame() {
        if (this.stateMachine.currentState == SmalltheaterState.DescribePlot) {
            let seqflow = new SequenceFlow();
            seqflow.addFlow(this.hideDescNodeFlow());
            seqflow.addFlow(this.openMubuFlow());
            this.btnStartGame.active = false;
            this.stateMachine.enterState(SmalltheaterState.Demo, null, seqflow);
        }
    }

    onClickBack() {
        SceneManager.getInstance().backToHall();
    }

    onTouchCharacter(index: number) {
        for (let i = 0; i < this._characterNodes.length; i++) {
            let inst = this._characterNodes[i];
            let ctrl = inst.getComponent(CharacterCtrl);
            ctrl.setMaskOpacity(i == index ? 0 : 125);
        }
        this.model.selectedCharacterIndex = index;
        this.btnConfirmCharacter.getComponent(Sprite).color = Color.WHITE;
        let charaName = this.model.currentPlot.character[index].name;
        this.selectCharacterLabel.string = "已选择：" + charaName;
    }

    onClickConfirmCharacter() {
        if (this.model.selectedCharacterIndex < 0) {
            return;
        }
        this.btnConfirmCharacter.active = false;
        this.selectCharacterLabel.node.active = false;

        for (let i = 0; i < this._characterNodes.length; i++) {
            let inst = this._characterNodes[i];
            let ctrl = inst.getComponent(CharacterCtrl);
            ctrl.setInteractive(false);
            ctrl.setMaskOpacity(0);
        }

        UIManager.getInstance().showPanel(StageLinesPanel.NAME, {
            model: this.model, onhideCallback: () => {
                this.model.initInteractionState();
                let seqflow = new SequenceFlow();
                seqflow.addFlow(this.timeCountLabelAnim("3"));
                seqflow.addFlow(this.timeCountLabelAnim("2"));
                seqflow.addFlow(this.timeCountLabelAnim("1"));
                seqflow.addFlow(this.timeCountLabelAnim("开始"));
                this.stateMachine.enterState(SmalltheaterState.Interaction, null, seqflow);
            }
        });
    }

    onClickRecord() {
        let timestamp = Date.now();
        let id = this.model.plotID + "_" + this.model.getCurrentStageLine().id + "_" + timestamp;
        this.model.timeStampMap.set(this.model.getCurrentStageLine().id, timestamp);

        let data: { id: string, save_audio: string, max_sentence_silence: string } = {
            id: id,
            save_audio: "true",
            max_sentence_silence: "500"
        };

        ChatFlowModel.getInstance().onOpenASR(data);

        this.blackMask.active = true;
        this.talkingAnimNode.active = true;
        this.talkingAnimNode.getComponent(AnimationComponent).play("takingAnimIcon_reset");
    }

    onClickStopRecord() {
        this.btnStopRecord.active = false;
        this.talkingAnimNode.active = false;

        setTimeout(() => {
            ChatFlowModel.getInstance().onCloseASR();
        }, 2000);
    }

    onClickBtnReplay() {
        for (let i = 0; i < this._characterNodes.length; i++) {
            let inst = this._characterNodes[i];
            let ctrl = inst.getComponent(CharacterCtrl);
            ctrl.setMaskOpacity(0);
        }
        this.btnReplay.active = false;

        let seqflow = new SequenceFlow();
        seqflow.addFlow(this.hideScoringNodeFlow());
        seqflow.addFlow(this.openMubuFlow());
        seqflow.addFlow(this.timeCountLabelAnim("3"));
        seqflow.addFlow(this.timeCountLabelAnim("2"));
        seqflow.addFlow(this.timeCountLabelAnim("1"));
        seqflow.addFlow(this.timeCountLabelAnim("开始"));

        this.model.initReplayState();

        this.stateMachine.enterState(SmalltheaterState.Replay, null, seqflow);
    }

    onClickBtnStopReplay() {
        this.btnStopRecord.active = false;
        let parallelFlow = new ParallelFlow();
        parallelFlow.addFlow(this.timeCountLabelAnim("演出结束"));
        parallelFlow.addFlow(this.closeMubuFlow());
        this.stateMachine.enterState(SmalltheaterState.Scoring, null, parallelFlow);
    }

    //============= private ===========================
    private onAudioEnd(): void {
        if (this.stateMachine.currentState == SmalltheaterState.AutoPlayLine) {
            this.model.goNextStageLine();
            this.stagelineLabel.node.active = false;
            let delayFlow = new UnitFlow(this.delayFlow(500));
            this.stateMachine.backToLastState(null, delayFlow);
        }
    }

    private onAsrContected(data: any) {
        this.blackMask.active = false;
        this.talkingAnimNode.getComponent(AnimationComponent).play("takingAnimIcon");
        this.btnRecord.active = false;
        this.btnStopRecord.active = true;
    }

    private onAsrClosed(data: any) {
        this.btnStopRecord.active = false;
        this.talkingAnimNode.active = false;
        this.stagelineLabel.node.active = false;

        this.model.confirmCurrentStageResult();
        this.model.goNextStageLine();
        this.stateMachine.backToLastState();
    }

    private onAsrResult(data: any) {
        let content = data.content;
        this.model.pushAsrResult(content);
    }

    private cleanFlowCache() {
        for (let i = 0; i < this._flowCache.length; i++) {
            let flow = this._flowCache[i];
            flow.dispose();
        }
        this._flowCache = [];
    }
    //============== animflow ==========================
    private blackMaskHideFlow(): AbortablePromise<any> {
        const uiOpacity = this.blackMask.getComponent(UIOpacity);

        let tw = null;
        return new AbortablePromise((resolve, reject) => {
            tw = tween(uiOpacity).to(1, { opacity: 0 }).call(() => {
                resolve({});
            }).start();
        }).onAbort(() => {
            if (tw) {
                tw.stop();
            }
        });
    }

    private hideDescNodeFlow(): AbortablePromise<any> {
        let tw = tween(this.descNode);
        let endpos = this.desc_target_pos.clone();
        return new AbortablePromise((resolve, reject) => {
            tw.to(1, { position: endpos }, {
                easing: easing.backIn
            }).call(() => {
                resolve({});
            }).start();
        }).onAbort(() => {
            if (tw) {
                tw.stop();
            }
        });
    }

    private openMubuFlow(): AbortablePromise<any> {
        let twl = tween(this.mubu_l);
        let endposl = this.mubul_target_pos.clone();
        let twr = tween(this.mubu_r);
        let endposr = this.mubur_target_pos.clone();
        return new AbortablePromise((resolve, reject) => {
            twl.to(1, { position: endposl }).call(() => {
                resolve({});
            }).start();
            twr.to(1, { position: endposr }).start();
        }).onAbort(() => {
            if (twl) {
                twl.stop();
            }
            if (twr) {
                twr.stop();
            }
        });
    }

    private closeMubuFlow(): AbortablePromise<any> {
        let twl = tween(this.mubu_l);
        let endposl = this.mubul_original_pos.clone();
        let twr = tween(this.mubu_r);
        let endposr = this.mubur_original_pos.clone();
        return new AbortablePromise((resolve, reject) => {
            twl.to(1, { position: endposl }).call(() => {
                resolve({});
            }).start();
            twr.to(1, { position: endposr }).start();
        }).onAbort(() => {
            if (twl) {
                twl.stop();
            }
            if (twr) {
                twr.stop();
            }
        });
    }

    private delayFlow(delay: number): AbortablePromise<any> {
        let timeout: Number = null;
        return new AbortablePromise((resolve, reject) => {
            timeout = setTimeout(() => {
                resolve(1);
            }, delay);
        }).onAbort(() => {
            if (timeout) {
                clearTimeout(timeout.valueOf());
            }
        });
    }

    private timeCountLabelAnim(str: string): AbortablePromise<any> {
        let tws = tween(this.timeCountLabel.node);
        let two = tween(this.timeCountLabel.node.getComponent(UIOpacity));
        let dur = 1;
        return new AbortablePromise((resolve, reject) => {
            this.timeCountLabel.string = str;
            this.timeCountLabel.node.active = true;
            this.timeCountLabel.node.setScale(1, 1);
            this.timeCountLabel.node.getComponent(UIOpacity).opacity = 255;
            tws.to(dur, { scale: new Vec3(10, 10, 10) }, { easing: easing.circIn }).call(() => {
                resolve(1);
            }).start();
            two.to(dur, { opacity: 0 }, { easing: easing.circIn }).start();
        }).onAbort(() => {
            if (tws) {
                tws.stop();
            }
            if (two) {
                two.stop();
            }
        });
    }

    private hideScoringNodeFlow(): AbortablePromise<any> {
        let tw = tween(this.scoringNode);
        let endpos = this.desc_target_pos.clone();
        return new AbortablePromise((resolve, reject) => {
            tw.to(1, { position: endpos }, {
                easing: easing.backIn
            }).call(() => {
                resolve({});
            }).start();
        }).onAbort(() => {
            if (tw) {
                tw.stop();
            }
        });
    }

    private showScoringNodeFlow(): AbortablePromise<any> {
        this.scoringNode.active = true;
        let tw = tween(this.scoringNode);
        return new AbortablePromise((resolve, reject) => {
            tw.to(1, { position: new Vec3() }, {
                easing: easing.backOut
            }).call(() => {
                resolve({});
            }).start();
        }).onAbort(() => {
            if (tw) {
                tw.stop();
            }
        });
    }

    private startScoringAnim() {
        let twdelay = tween(this.node).delay(0.05);
        let twUpdateNum = tween(this.node).call(() => {
            const randomNumten = Math.floor(Math.random() * 10);
            const randomNum = Math.floor(Math.random() * 10);
            this.scoreLabel.string = randomNumten.toString() + randomNum.toString();
        });
        if (this._scrollScoreTw != null) {
            this._scrollScoreTw.stop();
            this._scrollScoreTw = null;
        }

        this._scrollScoreTw = tween(this.node).sequence(twdelay, twUpdateNum).repeatForever().start();
    }

    private stopScoringAnimAtNum(endNum: number, duration: number) {
        if (this._scrollScoreTw != null) {
            this._scrollScoreTw.stop();
            this._scrollScoreTw = null;
        }

        let updated = 0.05;
        let repeatcount = Math.floor((duration / 2) / updated);
        let twdelay = tween(this.node).delay(updated);
        let numcount = 0;
        let twUpdateNum = tween(this.node).call(() => {
            const randomNumten = numcount;
            numcount = (numcount + 1) % 10;
            const randomNum = Math.floor(Math.random() * 10);
            this.scoreLabel.string = randomNumten.toString() + randomNum.toString();
        });

        let twUpdateNumTen = tween(this.node).call(() => {
            const randomNumten = numcount;
            numcount = (numcount + 1) % 10;
            const randomNum = endNum % 10;
            this.scoreLabel.string = randomNumten.toString() + randomNum.toString();
        });

        this._scrollScoreTw = tween(this.node).sequence(twdelay, twUpdateNum).repeat(repeatcount)
            .sequence(twdelay, twUpdateNumTen).repeat(repeatcount).call(() => {
                this.scoreLabel.string = endNum.toString();
            })
            .start();
    }
}

enum SmalltheaterState {
    LoadConfig = "LoadConfig",
    DescribePlot = "DescribePlot",
    Demo = "Demo",
    Interaction = "Interaction",
    AutoPlayLine = "AutoPlayLine",
    PlayerLine = "PlayerLine",
    SelectCharacter = "SelectCharacter",
    Scoring = "Scoring",
    Replay = "Replay"
}


