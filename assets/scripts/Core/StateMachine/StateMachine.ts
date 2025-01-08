import { DebugLog } from "../Util/DebugLog";
import { IFlow } from "./IFlow";

export class StateMachine {
    private _lastState: string = null;
    private _currentState: string = null;
    private _curFlow: IFlow = null;

    private _stateData: Map<string, { name: string, enterCallback: (any) => void, exitCallback: () => void }> = new Map();

    constructor() {

    }

    addState(name: string, enterCallback: (any) => void, exitCallback: () => void = null) {
        this._stateData.set(name, { name, enterCallback, exitCallback });
    }

    async enterState(name: string, data: any = null, flow: IFlow = null) {
        if (this._curFlow != null) {
            DebugLog.instance.warn("StateMachine , enterState failed ! 正在切换状态中：laststate = " + this._lastState + " , nextstate = " + this._currentState);
            return;
        }
        const stateInfo = this._stateData.get(name);
        if (!stateInfo) {
            DebugLog.instance.warn("StateMachine , enterState failed ! state is not exist : name = " + name);
            return;
        }

        if (this._currentState) {
            const currentStateInfo = this._stateData.get(this._currentState);
            if (currentStateInfo && currentStateInfo.exitCallback) {
                currentStateInfo.exitCallback();
            }
        }
        this._lastState = this._currentState;
        this._currentState = name;

        DebugLog.instance.log("StateMachine start enter state：laststate = " + this._lastState + " , nextstate = " + this._currentState);
        if (flow) {
            this._curFlow = flow;
            await flow.start();
            this._curFlow.dispose();
            this._curFlow = null;
        }

        if (stateInfo.enterCallback) {
            stateInfo.enterCallback(data);
        }
        DebugLog.instance.log("StateMachine entered state：laststate = " + this._lastState + " , nextstate = " + this._currentState);
    }

    async backToLastState(data: any = null, flow: IFlow = null) {
        if (this._lastState != null) {
            this.enterState(this._lastState, data, flow);
        }
    }

    dispose() {
        if (this._curFlow) {
            this._curFlow.dispose();
        }
    }
}


