import { _decorator, Label, Node, UITransform, Vec3 } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { BundleManager } from 'db://assets/app/BundleManager';
import { UIManager } from '../../../Core/Manager/UI/UIManager';

const { ccclass, property } = _decorator;

@ccclass('BundleInfoDebugPanel')
export class BundleInfoDebugPanel extends BasePanel {
    public static NAME: string = "BundleInfoDebugPanel";

    @property(Label)
    private versionLabel: Label = null!;

    private contentNode: Node = null!;

    start() {
        // 获取预设的Label所在节点作为内容节点
        this.contentNode = this.versionLabel.node.parent;

        // 显示版本信息
        this.showBundleInfo();
    }

    private showBundleInfo() {
        const bundleManager = BundleManager.getInstance();
        const config = bundleManager.bundleConfig;

        if (!config) {
            this.versionLabel.string = "没有相关配置";
            return;
        }

        // 显示全局版本号
        let ver = config.version.split(' ')[1];
        this.versionLabel.string = `全局版本：${ver}`;

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
}