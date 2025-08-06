import { _decorator, Component, Node } from 'cc';
import { TopNavBarController } from './TopNavBarController';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { ReportManager } from '../ManagerV2/ReportManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { VipAlert } from '../Game/UI/Vip/VipAlert';
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
        // EventManager.getInstance().on(ReportManager.getBrainTrainingTiersCallback, this.getBrainTrainingTiersCallback, this);
        EventManager.getInstance().on(ReportManager.getUserSumReportCallback, this.getUserSumReportCallback, this);
    }
    onDisable() {
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
        // EventManager.getInstance().off(ReportManager.getBrainTrainingTiersCallback, this);
        EventManager.getInstance().off(ReportManager.getUserSumReportCallback, this);
    }
    start() {
        ReportManager.getInstance().getUserSumReport();
        PersonalCenterManager.getInstance().requestUserInfo();
        this.callbackPromises = {
            userInfo: new Promise((resolve) => {
                this.userInfoResolve = resolve;
            }),
            // brainTraining: new Promise((resolve) => {
            //     this.brainTrainingResolve = resolve;
            // }),
            sumReport: new Promise((resolve) => {
                this.sumReportResolve = resolve;
            })
        };
        Promise.all([
            this.callbackPromises.userInfo,
            // this.callbackPromises.brainTraining,
            this.callbackPromises.sumReport
        ]).then(() => {
            // 检查用户是否是会员
            const userData = PersonalCenterManager.getInstance().userInfoData;
            if (userData && !userData.is_member) {
                // 如果不是会员，同时打开vipAlert
                UIManager.getInstance().showPanel(VipAlert.NAME,null,false,null,false);
            }
            
            if (this.pageParams) {
                EventManager.getInstance().emit('onTopNavBarClick', this.pageParams);
            }else{  
                this.topNavBarController.loadSumReport();
            }

        });
    }

    private userInfoResolve: Function;
    // private brainTrainingResolve: Function;
    private sumReportResolve: Function;

    getUserInfoCallBack() {
        if (this.userInfoResolve) {
            this.userInfoResolve();
        }
    }
    // getBrainTrainingTiersCallback() {
    //     if (this.brainTrainingResolve) {
    //         this.brainTrainingResolve();
    //     }
    // }
    getUserSumReportCallback() {
        if (this.sumReportResolve) {
            this.sumReportResolve();
        }
    }

    update(deltaTime: number) {

    }

}

