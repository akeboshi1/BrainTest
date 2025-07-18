import { _decorator, Color, Component, EditBox, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
import { SelectDate } from '../Game/PersonalCenterManager/SelectDate';
import { BasePanel } from '../Core/UI/BasePanel';
import { Selector } from '../Game/PersonalCenterManager/Selector';
import { DebugLog } from '../Core/Util/DebugLog';
import { AlertData, AlertManager } from '../Core/Manager/Alert/AlertManager';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import {VerifyPanel} from "db://assets/resources/scripts/Game/UI/Login/VerifyPanel";
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
const { ccclass, property } = _decorator;

@ccclass('AlterUserInfoView')
export class AlterUserInfoView extends BasePanel {
    static NAME: string = "AlterUserInfoView";
    @property(SelectDate)
    comDateSelect: SelectDate = null;
    @property(Node)
    comDataNode:Node =null;
    @property(Label)
    birthdayLabel:Label =null
    @property(Selector)
    commonSelector: Selector = null;
    @property(Node)
    comSexNode:Node =null;
    @property(Label)
    sexLabel:Label =null;
    @property(Selector)
    comEducationSelect:Selector =null;
    @property(Node)
    comEducationNode:Node =null;
    @property(Label)
    educationLabel:Label =null;
    @property(EditBox)
    nickNameEditBox: EditBox = null;
    @property(EditBox)
    nameEditBox:EditBox =null;
    @property(Node)
    backBtnNode:Node = null;
    @property(Label)
    title:Label = null;
    @property(Sprite)
    touXiangIcon:Sprite = null;

    private user_birthday='';
    private user_sex=0;
    private user_nick_name='';
    private user_name='';
    private user_education=0;

    onDisable(): void {
        this.nickNameEditBox.node.off('editing-did-begin');
        this.nickNameEditBox.node.off('editing-did-ended');
        this.nameEditBox.node.off('editing-did-begin');
        this.nameEditBox.node.off('editing-did-ended');
    }

    onEnable(): void {
        this.nickNameEditBox.node.on('editing-did-began', this.onInputStarted, this);
        this.nickNameEditBox.node.on('editing-did-ended', this.nickNameInputFinished, this);
        this.nameEditBox.node.on('editing-did-began', this.onInputStarted, this);
        this.nameEditBox.node.on('editing-did-ended', this.nameInputFinished, this);
    }

    private loginEmitboo = false;
    restore(data){
        if(data !=null)this.loginEmitboo = data;
        this.backBtnNode.active = !this.loginEmitboo;
        this.title.string = this.loginEmitboo ? "完善信息" : "修改信息";
    }
    onInputStarted() {
        DebugLog.instance.log("onInputStarted", this.nickNameEditBox.string)
    }
    nickNameInputFinished(event) {
        this.user_nick_name = this.nickNameEditBox.string;
        DebugLog.instance.log("onInputFinished", this.user_nick_name)
     
    }
    nameInputFinished(event) {
        this.user_name = this.nameEditBox.string;
        DebugLog.instance.log("onInputFinished", this.user_name)
    }
    start() {
        EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.initUserInfoPanel, this,true);
        PersonalCenterManager.getInstance().requestUserInfo();
    }
    initUserInfoPanel() {
        let userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData.full_name || !userData.birthday || !userData.education || !userData.gender) { return; }
        this.nickNameEditBox.string=userData.nickname;
        this.user_nick_name=userData.nickname.toString();
        this.nameEditBox.string=userData.full_name;
        this.user_name=userData.full_name.toString();
        this.setSex(userData.gender == 1 ? "男" : "女");
        this.updateTouXiangIcon(userData.gender == 1 ? "男" : "女");
        this.setBirthday(userData.birthday);
        this.setEducationById(userData.education); 
    }
     setEducationById(data) {
        let education;

        if (data == "1") {
            education = "初中及以下";
        } else if (data == " 2") {
            education = "高中";
        } else if (data == "3") {
            education = "大专";
        } else if (data == "4") {
            education = "本科";
        } else if (data == "5") {
            education = "硕士及以上";
        }
        this.setEducationId(education);
        this.educationLabel.color = new Color(0, 0, 0);
        this.educationLabel.string = education;
    }
    onBirthdayChanged(year: string, month: string, day: string): void {
        this.setBirthday(year + '-' + month + '-' + day)
        this.user_birthday = year + "-" + month + "-" + day;
    }
    onSexChanged(sex: string): void {
        this.setSex(sex);
        this.updateTouXiangIcon(sex);
    }
    async updateTouXiangIcon(sex){
        this.touXiangIcon.spriteFrame = await (sex == "男" ? this.loadTaskSprite('textureV2/indexPage/male/spriteFrame') : this.loadTaskSprite('textureV2/indexPage/female/spriteFrame'));
    }
    async loadTaskSprite(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    DebugLog.instance.error(`Failed to load sprite: ${path}`, err);
                    reject(err);
                    return;
                }

                if (!spriteFrame) {
                    DebugLog.instance.error(`Loaded sprite frame is null: ${path}`);
                    reject(new Error('Loaded sprite frame is null'));
                    return;
                }
                resolve(spriteFrame);
            });
        })
    }
    setSex(data) {
        this.user_sex = data == "男" ? 1 : 2;
        this.sexLabel.color = new Color(0, 0, 0);
        this.sexLabel.string = data;
    }
    setBirthday(data) {
        this.birthdayLabel.color = new Color(0, 0, 0);
        this.birthdayLabel.string = data;
        this.user_birthday = data;
    }
    clickSelectBirthday() {
        if (this.user_birthday) {
            const arr = this.user_birthday.split('-');
            if (arr.length === 3) {
                this.comDateSelect.setOptions(arr[0], arr[1], arr[2]);
            }
        }
        this.comDateSelect.callback = this.onBirthdayChanged.bind(this);
        this.comDataNode.active = true;
        this.comDateSelect.scrollToSelection(this.user_birthday);
    }
    clickSelectSex() {
        let sexStr = this.sexLabel.string;
        this.commonSelector.setOptions(["男","女"], sexStr);
        this.commonSelector.callback = this.onSexChanged.bind(this);
        this.comSexNode.active = true;
        this.commonSelector.scrollToSelection(sexStr);
    }
    clickEducation(){
        let educationStr = this.educationLabel.string;
        this.comEducationSelect.setOptions(["初中及以下","高中","大专","本科","硕士及以上"], educationStr);
        this.comEducationSelect.callback = this.onEducationChanged.bind(this);
        this.comEducationNode.active = true;
        this.comEducationSelect.scrollToSelection(educationStr);
    }
    onEducationChanged(education): void {
        this.setEducation(education);
        this.setEducationId(education);
    }
    setEducation(data) {
        this.educationLabel.color = new Color(0, 0, 0);
        this.educationLabel.string = data;
    }
    setEducationId(education) {
        if (education == "初中及以下") {    
            this.user_education = 1;
        } else if (education == "高中") {
            this.user_education = 2;
        } else if (education == "大专") {
            this.user_education = 3;
        } else if (education == "本科") {
            this.user_education = 4;
        } else if (education == "硕士及以上") {
            this.user_education = 5;
        }
    }
    commitUserInfo() {
        // console.log('发送个人信息',this.user_nick_name, this.user_name, this.user_sex, this.user_birthday,this.user_education)
        if (this.user_nick_name == "" || this.user_name == "" || this.user_sex == 0 || this.user_birthday == "" ) { this.errorAlert(); return; }
        const alertData: AlertData = new AlertData();
        alertData.title = "确定要修改个人信息吗？";
        alertData.cancelButtonVisible = true;
        alertData.cancelButtonText = "取消"
        alertData.confirmCb = function () {
            this.cofirmUpdateUserInfo();
        }.bind(this);
        alertData.cancelCb = function () {
            this.cancleAlert();
        }.bind(this);
        AlertManager.getInstance().showAlert(alertData);
    }
    errorAlert() {
        const alertData: AlertData = new AlertData();
        alertData.title = "个人信息不完整，请完善个人信息";
        alertData.confirmCb = function () {
            this.cancleAlert()
        }.bind(this);
        AlertManager.getInstance().showAlert(alertData);
    }

    cancleAlert() {
        AlertManager.getInstance().closeCurrentAlert();
    }

    cofirmUpdateUserInfo() {
        PersonalCenterManager.getInstance().updateUserInfo(this.user_nick_name, this.user_name, this.user_sex, this.user_birthday, this.user_education);
        this.backToParent();
    }
    backToParent() {
        UIManager.getInstance().hidePanel(AlterUserInfoView.NAME);
        if(this.loginEmitboo) {
            // 主动弹出邀请码界面
            UIManager.getInstance().showPanel(VerifyPanel.NAME);
        }
    }
}


