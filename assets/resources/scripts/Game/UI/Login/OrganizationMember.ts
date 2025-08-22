import { _decorator, Component, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
import { OrganizationUser } from '../../../Core/Manager/LoginManager/LoginManager';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { OrganizationMemberLoginPanel } from './OrganizationMemberLoginPanel';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
const { ccclass, property } = _decorator;

@ccclass('OrganizationMember')
export class OrganizationMember extends Component {
    @property(Label)
    private memberName: Label;

    @property(Node)
    private finishIcon: Node;

    @property(Node)
    private unfinishIcon: Node;

    @property(Label)
    private status: Label;

    @property(Sprite)
    private userIcon: Sprite;

    private _data: OrganizationUser;

    private _isShowing: boolean = false;

    start() {
        UIManager.getInstance().registerPanel(OrganizationMemberLoginPanel.NAME, BundleName.RESOURCES, "prefab/AuthLogin/OrganizationMemberLoginPanel", OrganizationMemberLoginPanel);
    }

    setData(data: OrganizationUser) {
        this._data = data;
        this.memberName.string = data.full_name == "" ? data.username : data.full_name;
        this.status.string = data.today_trained ? "已完成" : "未完成";
        this.finishIcon.active = data.today_trained;
        this.unfinishIcon.active = !data.today_trained;

        let iconPath = "";
        if (data.gender == 1) {
            iconPath = "textureV2/indexPage/male/spriteFrame";
        } else {
            iconPath = "textureV2/indexPage/female/spriteFrame";
        }
        resources.load(iconPath, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                DebugLog.instance.error(err);
            } else {
                this.userIcon.spriteFrame = spriteFrame;
            }
        });
    }

    onClickMember() {
        if (this._isShowing) return;
        this._isShowing = true;
        UIManager.getInstance().showPanel(OrganizationMemberLoginPanel.NAME, this._data).finally(() => {
            this._isShowing = false;
        });
    }
}


