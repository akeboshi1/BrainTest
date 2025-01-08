import { DebugLog } from "../Util/DebugLog";
import { AbortablePromise } from "./AbortablePromise";
import { IFlow } from "./IFlow";

export class ParallelFlow implements IFlow {
    private flows: AbortablePromise<any>[] = [];

    constructor() {
    }

    addFlow(flow: AbortablePromise<any>) {
        this.flows.push(flow);
    }

    async start(): Promise<void> {
        const promises = this.flows.map((flow) => flow.start());
        try {
            const results = await Promise.all(promises);
            for (const result of results) {
                if (result.status === "rejected") {
                    const error = result.reason;
                    DebugLog.instance.error('An error occurred during parallel flow execution:', error);
                }
            }
        } catch (error) {
            DebugLog.instance.error('An error occurred during parallel flow execution:', error);
        }
    }

    dispose(): void {
        for (const flow of this.flows) {
            flow.abort();
        }
        this.flows = [];
    }
}