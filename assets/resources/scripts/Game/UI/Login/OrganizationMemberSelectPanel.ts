import { _decorator, Component, EditBox, instantiate, Label, Node, Prefab } from 'cc';
import { GetOrganizationUsersResult, LoginManager, OrganizationUser } from '../../../Core/Manager/LoginManager/LoginManager';
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

    @property(EditBox)
    selectUserInput: EditBox;

    private _findUser:string = "";

    private _memberList: OrganizationUser[] = [];


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
        this._memberList = result.result;
        if (this._memberList.length === 0) {
            this.tips.string = "暂无组织成员";
            this.tips.node.active = true;
            return;
        }
        this._updateMemberList(this._memberList);
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

    public async textChange() {
        this._findUser = this.selectUserInput.string;
        this.searchUsers();
    }

    // 使用示例
    searchUsers() {
        const matchedUsers = this._fuzzyMatchUsers();
        console.log('匹配到的用户:', matchedUsers);
        this._updateMemberList(matchedUsers);
        return matchedUsers;
    }


    // 模糊匹配方法
    private _fuzzyMatchUsers() {
        if (!this._findUser || this._findUser.trim() === '') {
            return this._memberList; // 输入为空时返回所有用户
        }

        const searchTerm = this._findUser.toLowerCase();

        return this._memberList.filter(user => {
            const nickname = user.nickname || '';
            return nickname.toLowerCase().includes(searchTerm);
        });
    }

    // 更新成员列表显示
    private _updateMemberList(memberList: OrganizationUser[]) {
        // 清空容器
        this.memberItemContainer.removeAllChildren();
        
        // 如果没有匹配的用户，显示提示
        if (memberList.length === 0) {
            this.tips.string = "未找到匹配的用户，请调整搜索关键词";
            this.tips.node.active = true;
            return;
        }
        
        // 隐藏提示
        this.tips.node.active = false;
        
        // 重新添加匹配的用户项
        for (let i = 0; i < memberList.length; i++) {
            let memberItem = instantiate(this.memberItemPrefab);
            memberItem.getComponent(OrganizationMember).setData(memberList[i]);
            this.memberItemContainer.addChild(memberItem);
        }
    }

    public clearSerch(){
        this.selectUserInput.string = "";
        this.textChange();
    }



}


