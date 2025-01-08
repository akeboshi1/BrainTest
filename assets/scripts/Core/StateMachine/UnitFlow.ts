import { DebugLog } from "../Util/DebugLog";
import { AbortablePromise } from "./AbortablePromise";
import { IFlow } from "./IFlow";

export class UnitFlow implements IFlow {
    private flow: AbortablePromise<any>;

    constructor(flow: AbortablePromise<any>) {
        this.flow = flow;
    }

    async start(): Promise<void> {
        try {
            await this.flow.start();
        } catch (error) {
            DebugLog.instance.error('An error occurred during unit flow execution:', error);
        }
    }

    dispose(): void {
        if(this.flow){
            this.flow.abort();
        }
        this.flow = null;
    }
}


