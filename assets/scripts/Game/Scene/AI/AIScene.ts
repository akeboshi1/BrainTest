import {BaseObejct} from "../../../Core/Object/BaseObject";
import { DebugLog } from "../../../Core/Util/DebugLog";

export class AIScene extends BaseObejct{
       constructor() {
           super();
       }

       protected start(): void {
           DebugLog.instance.log("AIScene Start");
       }

       protected update(dt: number): void {
           
       }
}