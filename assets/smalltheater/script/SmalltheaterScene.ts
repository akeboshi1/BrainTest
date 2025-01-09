import { _decorator, Component, easing, instantiate, Label, Node, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { AutoPlayLineData, SmalltheaterModel } from './SmalltheaterModel';
import { StateMachine } from '../../scripts/Core/StateMachine/StateMachine';
import { AbortablePromise } from '../../scripts/Core/StateMachine/AbortablePromise';
import { DebugLog } from '../../scripts/Core/Util/DebugLog';
import { UnitFlow } from '../../scripts/Core/StateMachine/UnitFlow';
import { SequenceFlow } from '../../scripts/Core/StateMachine/SequenceFlow';
import { CharacterCtrl } from './CharacterCtrl';
import { AudioManager } from '../../scripts/Core/Manager/Audio/AudioManager';
import { SceneManager } from '../../scripts/Core/Manager/Scene/SceneManager';
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

    @property(Label)
    stagelineLabel: Label = null;

    @property(Node)
    btnConfirmCharacter:Node = null;

    private model: SmalltheaterModel = new SmalltheaterModel();

    private stateMachine: StateMachine = new StateMachine();

    private _characterNodes: Node[] = [];

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
        this.stateMachine.addState(SmalltheaterState.Socring, this.onEnterSocring.bind(this));
        this.stateMachine.addState(SmalltheaterState.Replay, this.onEnterReplay.bind(this));

        this.stateMachine.enterState(SmalltheaterState.LoadConfig, { id: 1 });

        AudioManager.getInstance().onAudioEnd(this.onAudioEnd, this);
    }

    protected onDestroy(): void {
        AudioManager.getInstance().offAudioEnd(this.onAudioEnd, this);

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

        this.model.initDemo();

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

    }

    private onEnterAutoPlayLine(data: AutoPlayLineData) {
        if (data) {
            this.stagelineLabel.node.active = true;
            this.stagelineLabel.string = data.characterName + ":\n" + data.line;
            for (let i = 0; i < this._characterNodes.length; i++) {
                let inst = this._characterNodes[i];
                let ctrl = inst.getComponent(CharacterCtrl);
                ctrl.setMaskOpacity(i == data.characterid ? 0 : 125);
            }
            AudioManager.getInstance().play(data.audioClip);
        }
    }

    private onEnterPlayLine(data: any) {

    }

    private onEnterSelectCharacter(data: any) {

    }

    private onEnterSocring(data: any) {

    }

    private onEnterReplay(data: any) {

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

    onClickBack(){
        SceneManager.getInstance().backToHall();
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

    private delayFlow(delay): AbortablePromise<any> {
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
}

enum SmalltheaterState {
    LoadConfig = "LoadConfig",
    DescribePlot = "DescribePlot",
    Demo = "Demo",
    Interaction = "Interaction",
    AutoPlayLine = "AutoPlayLine",
    PlayerLine = "PlayerLine",
    SelectCharacter = "SelectCharacter",
    Socring = "Socring",
    Replay = "Replay"
}


