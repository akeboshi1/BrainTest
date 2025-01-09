import { DebugLog } from "../Util/DebugLog";
import { AbortablePromise } from "./AbortablePromise";
import { IFlow } from "./IFlow";

export class SequenceFlow implements IFlow {
    private flows: AbortablePromise<any>[] = [];

    constructor() {
    }

    addFlow(flow: AbortablePromise<any>) {
        this.flows.push(flow);
    }

    async start(): Promise<void> {
        for (const flow of this.flows) {
            await flow.start();
        }
    }

    dispose(): void {
        for (const flow of this.flows) {
            flow.abort();
        }
        this.flows = [];
    }
}