import { _decorator, Component, Node } from 'cc';
import { TopNavBarController } from './TopNavBarController';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { ReportManager } from '../ManagerV2/ReportManager';
const { ccclass, property } = _decorator;

@ccclass('ReportPageController')
export class ReportPageController extends Component {
    @property(TopNavBarController)
    topNavBarController: TopNavBarController = null;
    
    private callbackPromises: { [key: string]: Promise<any> } = {};

    onEnable(){
        EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
        EventManager.getInstance().on(ReportManager.getBrainTrainingTiersCallback, this.getBrainTrainingTiersCallback, this);
        EventManager.getInstance().on(ReportManager.getUserSumReportCallback, this.getUserSumReportCallback, this);
    }
    onDisable() {
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
        EventManager.getInstance().off(ReportManager.getBrainTrainingTiersCallback, this); 
        EventManager.getInstance().off(ReportManager.getUserSumReportCallback, this);
    }
    start() {
        ReportManager.getInstance().getPersonalReport();
        ReportManager.getInstance().getUserSumReport();
        PersonalCenterManager.getInstance().requestUserInfo();
        // 创建三个 Promise 来跟踪回调执行
        this.callbackPromises = {
            userInfo: new Promise((resolve) => {
                this.userInfoResolve = resolve;
            }),
            brainTraining: new Promise((resolve) => {
                this.brainTrainingResolve = resolve;
            }),
            sumReport: new Promise((resolve) => {
                this.sumReportResolve = resolve;
            })
        };

        // 等待所有回调完成后执行 loadSumReport
        Promise.all([
            this.callbackPromises.userInfo,
            this.callbackPromises.brainTraining,
            this.callbackPromises.sumReport
        ]).then(() => {
            this.topNavBarController.loadSumReport();
        });
    }

    private userInfoResolve: Function;
    private brainTrainingResolve: Function;
    private sumReportResolve: Function;

    getUserInfoCallBack(){
        console.log("更新初测数据",PersonalCenterManager.getInstance().userInfoData);
        if (this.userInfoResolve) {
            this.userInfoResolve();
        }
    }
    getBrainTrainingTiersCallback(){
        console.log("更新雷达图",ReportManager.getInstance().reportDataList);
        if (this.brainTrainingResolve) {
            this.brainTrainingResolve();
        }
    }
    getUserSumReportCallback(){
        console.log("更新报告总结",ReportManager.getInstance().userSumReport);
        if (this.sumReportResolve) {
            this.sumReportResolve();
        }
    }

    update(deltaTime: number) {
        
    }

}

