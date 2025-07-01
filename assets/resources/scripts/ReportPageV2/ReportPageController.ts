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
    private pageParams: any = null;

    public initWithParams(params: any) {
        this.pageParams = params;
    }

    onEnable() {
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
        ]).then(async () => {
            await this.topNavBarController.loadSumReport();
            if (this.pageParams) {
                EventManager.getInstance().emit('onNavBarClick', this.pageParams);
            }

        });
    }

    private userInfoResolve: Function;
    private brainTrainingResolve: Function;
    private sumReportResolve: Function;

    getUserInfoCallBack() {
        if (this.userInfoResolve) {
            this.userInfoResolve();
        }
    }
    getBrainTrainingTiersCallback() {
        if (this.brainTrainingResolve) {
            this.brainTrainingResolve();
        }
    }
    getUserSumReportCallback() {
        if (this.sumReportResolve) {
            this.sumReportResolve();
        }
    }

    update(deltaTime: number) {

    }

}

