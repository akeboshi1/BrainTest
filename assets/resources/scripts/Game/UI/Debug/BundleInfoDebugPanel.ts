import { _decorator, Label, Node, UITransform, Vec3 } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { BundleManager } from 'db://assets/app/BundleManager';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { Environment, PublishSettingConfig } from 'db://assets/app/PublishSettingConfig';
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';

const { ccclass, property } = _decorator;

@ccclass('BundleInfoDebugPanel')
export class BundleInfoDebugPanel extends BasePanel {
    public static NAME: string = "BundleInfoDebugPanel";

    @property(Label)
    private versionLabel: Label = null!;

    @property(Node)
    private contentNode: Node = null!;

    @property(Label)
    private prePublishTestButtonLabel: Label = null!;

    start() {
        // 显示版本信息
        this.showBundleInfo();

        this.initPrePublishTest();
    }

    private initPrePublishTest() {
        let isPrePublishTest = LocalStorageUtil.get(LocalStorageKeyEnum.IS_PRE_PUBLISH_TEST);
        if (isPrePublishTest != "1" && isPrePublishTest != "0") {
            LocalStorageUtil.set(LocalStorageKeyEnum.IS_PRE_PUBLISH_TEST, "0");
            isPrePublishTest = "0";
        }
        this.prePublishTestButtonLabel.string = isPrePublishTest == "0" ? "预发布测试关闭" : "预发布测试开启";
    }

    private showBundleInfo() {
        const bundleManager = BundleManager.getInstance();
        const config = bundleManager.bundleConfig;

        if (!config) {
            this.versionLabel.string = "没有相关配置";
            return;
        }

        let isremote = PublishSettingConfig.getInstance().getIsRemoteBundle();
        // 显示全局版本号
        let ver = config.version.split(' ')[1];
        let env = PublishSettingConfig.getInstance().getEnvironment();
        this.versionLabel.string = `全局版本：${ver} ${isremote ? "远程" : "本地"} \n ${env == Environment.DEVELOPMENT ? "开发" : "生产"} \n ${bundleManager.isPrePublishTest ? "预发布测试" : "正式发布"}`;

        for (const bundleName in config.bundles) {
            const bundleInfo = config.bundles[bundleName];

            // 创建新的Label节点
            const newNode = new Node(bundleName);
            const label = newNode.addComponent(Label);
            const transform = newNode.addComponent(UITransform);

            // 设置Label属性
            let bver = bundleInfo.version.split(' ')[1];
            label.string = `${bundleName}: \tversion: ${bver} \tmd5: ${bundleInfo.md5}`;
            label.fontSize = 46;
            label.lineHeight = 50;

            // 设置节点位置和大小
            transform.setContentSize(900, 50);

            // 添加到内容节点
            this.contentNode.addChild(newNode);
        }
    }

    public onClickClose() {
        UIManager.getInstance().hidePanel(BundleInfoDebugPanel.NAME);
    }

    public onClickPrePublishTest() {
        let isPrePublishTest = LocalStorageUtil.get(LocalStorageKeyEnum.IS_PRE_PUBLISH_TEST);
        if (isPrePublishTest == "1") {
            isPrePublishTest = "0";
        } else {
            isPrePublishTest = "1";
        }
        LocalStorageUtil.set(LocalStorageKeyEnum.IS_PRE_PUBLISH_TEST, isPrePublishTest);
        this.prePublishTestButtonLabel.string = isPrePublishTest == "0" ? "预发布测试关闭" : "预发布测试开启";
    }
}