import { _decorator, Component, instantiate, Label, Node, Prefab } from 'cc';
import { GetOrganizationUsersResult, LoginManager } from '../../../Core/Manager/LoginManager/LoginManager';
import { LocalStorageKeyEnum } from '../../../Core/Util/LocalStorageUtil';
import { LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { OrganizationMember } from './OrganizationMember';
const { ccclass, property } = _decorator;

@ccclass('OrganizationMemberSelectPanel')
export class OrganizationMemberSelectPanel extends Component {
    @property(Label)
    private orgName: Label;

    @property(Node)
    private memberItemContainer: Node;

    @property(Prefab)
    private memberItemPrefab: Prefab;

    @property(Label)
    private tips: Label;

    private clickBack: () => void;

    start() {
        
    }

    protected onEnable(): void {
        EventManager.getInstance().on(LoginManager.GetOrganizationUsersResult, this.onGetOrganizationUsersResult, this);
        let orgToken = LocalStorageUtil.get(LocalStorageKeyEnum.ORGANIZATION_TOKEN);
        if (!orgToken) {
            return;
        }
        this.tips.string = "获取组织成员中...";
        LoginManager.getInstance().requestGetOrganizationUsers(orgToken);
    }

    protected onDisable(): void {
        EventManager.getInstance().off(LoginManager.GetOrganizationUsersResult, this);
    }

    onGetOrganizationUsersResult(result: GetOrganizationUsersResult) {
        let memberList = result.result;
        if (memberList.length === 0) {
            this.tips.string = "暂无组织成员";
            return;
        }
        this.tips.string = "";
        this.tips.node.active = false;
        for (let i = 0; i < memberList.length; i++) {
            let memberItem = instantiate(this.memberItemPrefab);
            memberItem.getComponent(OrganizationMember).setData(memberList[i]);
            this.memberItemContainer.addChild(memberItem);
        }
    }

    onClickBack(){
        if (this.clickBack) {
            this.clickBack();
        }
    }

    setOrgName(orgName: string) {
        this.orgName.string = orgName;
    }

    setClickBack(callback: () => void) {
        this.clickBack = callback;
    }
}


