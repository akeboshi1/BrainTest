import { _decorator, Component, easing, Label, Node, tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { SmalltheaterModel } from './SmalltheaterModel';
import { StateMachine } from '../../scripts/Core/StateMachine/StateMachine';
import { AbortablePromise } from '../../scripts/Core/StateMachine/AbortablePromise';
import { DebugLog } from '../../scripts/Core/Util/DebugLog';
import { UnitFlow } from '../../scripts/Core/StateMachine/UnitFlow';
import { SequenceFlow } from '../../scripts/Core/StateMachine/SequenceFlow';
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

    private model: SmalltheaterModel = new SmalltheaterModel();

    private stateMachine: StateMachine = new StateMachine();

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
    }

    protected onDestroy(): void {
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

        let flow = new UnitFlow(this.blackMaskHideFlow());
        await this.stateMachine.enterState(SmalltheaterState.DescribePlot, null, flow);
    }

    private onEnterDescribePlot(data: any) {
        this.blackMask.active = false;
    }

    private onEnterDemo(data: any) {

    }

    private onEnterInteraction(data: any) {

    }

    private onEnterAutoPlayLine(data: any) {

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
            this.stateMachine.enterState(SmalltheaterState.Demo, null, seqflow);
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

    //============= private ==========
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


