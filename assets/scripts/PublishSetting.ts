import { _decorator, Component, Enum, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

export enum Environment {
    DEVELOPMENT,
    PRODUCTION
}

@ccclass('PublishSetting')
export class PublishSetting extends Component {
    @property(String)
    dev_api_url: String = "";

    @property(String)
    api_url: String = "";

    @property(String)
    version: String = "";

    @property({
        type: Enum(Environment),
        tooltip: '请选择环境'
    })
    currentEnvironment: Environment = Environment.DEVELOPMENT;

    @property(Label)
    infoLabel: Label = null;

    get currentApiUrl(): string {
        switch (this.currentEnvironment) {
            case Environment.DEVELOPMENT:
                return this.dev_api_url.valueOf();
            case Environment.PRODUCTION:
                return this.api_url.valueOf();
        }
    }

    start(): void {
        if(this.infoLabel){
            let ver = "ver: " + this.version.toString();
            let env = this.currentEnvironment == Environment.DEVELOPMENT ? "Dev" : "";
            this.infoLabel.string = env + "   " + ver;
        }
    }
}


