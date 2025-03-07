import {BaseGuide} from "db://assets/resources/scripts/Core/Manager/Guide/BaseGuide";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";

export class SentenceMakingGuide extends BaseGuide{
    public static NAME: string = "SentenceMakingGuide";

    constructor() {
        super();
        this.name = SentenceMakingGuide.NAME;
    }

    public start(data:any = null,name:string = null){
        super.start(data,name);

    }

    /**
     * 结束引导
     * @param event
     */
    public end(event):void{
        super.end(event);
        DebugLog.instance.log(`${this.name}引导结束`);
    }
}