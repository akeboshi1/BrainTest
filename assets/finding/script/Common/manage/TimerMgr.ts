import CacheMgr from "./CacheMgr";
import Tools from "../Tools";
import Global from "../Global";
import GameInfoView from "../../Moudle/View/GameInfoView";

/**
 *  总定时器 ， 用来 判断签到 或者恢复体力  每分钟判断
 */
class TimerMgr {
    constructor() {
        // this.update()
        //每秒进行判断
        window.setInterval(() => {
            this.update()
        }, 1000)
    }

    update() {  //每秒执行
        let nowTime = new Date();
        if (CacheMgr.stamina >= Global.config.gameInfo.maxStamina) {
            CacheMgr.lastTimeLogin = 0;
            return;
        }
        if (CacheMgr.lastTimeLogin != 0) {
            let distance = Tools.date_getTimeDifference(nowTime.getTime(), Number(CacheMgr.lastTimeLogin), 2);
            let needAddPower = Math.floor(distance.distance / Global.config.gameInfo.autoAddStaminaTime);
            let residue = distance.distance_real % (Global.config.gameInfo.autoAddStaminaTime * 60 * 1000);
            if (needAddPower >= 1) {
                if (CacheMgr.stamina >= Global.config.gameInfo.maxAutoAddStamina) {

                } else if (CacheMgr.stamina + needAddPower * Global.config.gameInfo.autoAddStaminaNum > Global.config.maxAutoAddStamina) {
                    CacheMgr.stamina = Global.config.maxAutoAddStamina;
                } else {
                    CacheMgr.stamina = CacheMgr.stamina + needAddPower * Global.config.gameInfo.autoAddStaminaNum;
                }
                CacheMgr.lastTimeLogin = nowTime.getTime() - residue;
            }
            let gins = GameInfoView.INS();
            if (gins) {
                let r = Global.config.gameInfo.autoAddStaminaTime * 60 * 1000 - distance.distance_real;
                gins.changeResidue(Math.floor(r / (1000 * 60)), Math.floor((r % (1000 * 60) / (1000))));
            }
        } else {
            CacheMgr.lastTimeLogin = nowTime.getTime();
        }
    }
}

export default new TimerMgr();
