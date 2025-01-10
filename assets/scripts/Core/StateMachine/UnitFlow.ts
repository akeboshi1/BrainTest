import { AbortablePromise } from "./AbortablePromise";
import { IFlow } from "./IFlow";

export class UnitFlow implements IFlow {
    private flow: AbortablePromise<any>;

    constructor(flow: AbortablePromise<any>) {
        this.flow = flow;
    }

    async start(): Promise<any> {
        return await this.flow.start();
    }

    dispose(): void {
        if(this.flow){
            this.flow.abort();
        }
        this.flow = null;
    }
}


