export class AbortablePromise<T> {
    private executor: (resolve: (value: T) => void, reject: (reason: any) => void) => void;
    private innerPromise: Promise<T>;
    private innerReject: (any) => void = null;
    private resolveCb: (value: T) => void = null;
    private abortProcess: () => void = null;

    constructor(executor: (resolve: (value: T) => void, reject: (reason: any) => void) => void) {
        this.executor = executor;
        this.innerPromise = null;
    }

    public start(): Promise<T> {
        if (!this.innerPromise) {
            this.innerPromise = new Promise((resolve, reject) => {
                this.innerReject = reject;
                this.executor((value) => {
                    if (this.resolveCb) {
                        this.resolveCb(value);
                    }
                    resolve(value);
                }, (reason) => {
                    this.innerReject = null;
                    reject(reason);
                });
            });
        }
        return this.innerPromise;
    }

    get promise(): Promise<T> {
        return this.innerPromise;
    }

    abort(): void {
        if (this.abortProcess) {
            this.abortProcess();
            this.abortProcess = null;
        }
        if (this.innerReject) {
            this.innerReject("AbortablePromise dispose");
            this.innerReject = null;
        }
    }

    then(resolve: (value: T) => void): AbortablePromise<T> {
        this.resolveCb = resolve;
        return this;
    }

    onAbort(abortProcess: () => void): AbortablePromise<T> {
        this.abortProcess = abortProcess;
        return this;
    }
}