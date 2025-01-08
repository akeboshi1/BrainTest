
export interface IFlow {
    start(): Promise<void>;
    dispose(): void;
}

