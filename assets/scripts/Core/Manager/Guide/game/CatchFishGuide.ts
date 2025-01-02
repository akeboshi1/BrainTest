import {BaseGuide} from "db://assets/scripts/Core/Manager/Guide/BaseGuide";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";

export class CatchFishGuide extends BaseGuide{
    public static NAME: string = "CatchFishGuide";

    constructor() {
        super();
        this.name = CatchFishGuide.NAME;
    }

    public start(data:any = null,name:string = null){
        super.start(data,name);



    }
}