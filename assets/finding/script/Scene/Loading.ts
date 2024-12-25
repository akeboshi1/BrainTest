import Tools from "../Common/Tools";
import GameLogMgr from "../Common/manage/GameLogMgr";
import CacheMgr from "../Common/manage/CacheMgr";
import Global from "../Common/Global";
import TestMgr from "../Common/Test";
import LoadMgr from "../Common/manage/LoadMgr";
import { _decorator,Component,Node,tween,director,Vec3,v3 } from "cc";
const {ccclass, property} = _decorator;

@ccclass
export default class Loading extends Component {

    @property(Node)
    round: Node = null;

    @property(Node)
    mask: Node = null;

    private tween = null;

    protected onLoad() {
        this._initSystemEvent();

        this.mask.scale = v3(0,1,1);

        //假的进度条
        this.tween = tween(this.mask)
            .to(5, {scale: v3(1,1,1)}, {easing: "quadOut"})
            .start();
        let i = 0;

        director.preloadScene("Game");
        LoadMgr.init_bundleMgr()

        TestMgr.start("加载总时长")
        let num = Tools.model_initModel(() => {
            // i++
            // if (i === num) {
                TestMgr.end("加载总时长")
                this.tween.stop();
                tween(this.mask)
                    .to(0.2, {scale: v3(1,1,1)}, {easing: 'quadOut'})
                    .call(() => {
                        director.loadScene('Game');
                    })
                    .start();
            // }
        });
    }

    _initSystemEvent() {
        // WechatApi.systemInterface_do('setKeepScreenOn', null, null, {
        //     keepScreenOn: true
        // });
        // WechatApi.systemInterface_do('getLaunchOptionsSync', (res) => {
        //     JiuWuSDK.launchData = res;
        //     JiuWuSDK.joinTime = new Date().getTime();
        //     GameLogMgr.log('获取小游戏冷启动时参数调用成功:', res);
        // }, null);
        // WechatApi.systemInterface_do('onHide', null, null, () => {
        //     GameLogMgr.log('微信 onHide ... ');
        //     CacheMgr.updateData();
        //     JiuWuSDK.pushAction(1).then();
        //     if (JiuWuSDK.systemInfo.platform == "ios"){
        //         console.log("暂停背景音乐")
        //         audioEngine.pauseMusic()
        //     }
        // });
        // WechatApi.systemInterface_do('onShow', null, null, (res) => {
        //     JiuWuSDK.launchData = res;
        //     if (Global.isShowBanner && Global.config.adv_unit_conf.bannerBeClick_Refresh) {
        //         WechatApi.bottomAdv.bannerIns.activeRefreshBanner()
        //     }
        //     GameLogMgr.log('微信 onShow:', res);
        //
        //     if (JiuWuSDK.systemInfo.platform == "ios"){
        //         console.log("恢复背景音乐")
        //         audioEngine.resumeMusic()
        //     }
        // });
        // WechatApi.systemInterface_do('showShareMenu', null, null, {
        //     withShareTicket: true,
        //     menus: ['shareAppMessage', 'shareTimeline'],
        //     success: () => {
        //         GameLogMgr.log('显示当前页面的转发按钮成功 ... ');
        //     }
        // });
        // WechatApi.systemInterface_do("getSystemInfoSync", (res) => {
        //     JiuWuSDK.systemInfo = res;
        //     GameLogMgr.log("获取系统信息成功", res);
        // }, null);
    }
}
