import { _decorator, Node, Label, EditBox, Color } from 'cc';
import { SelectDate } from '../../PersonalCenterManager/SelectDate';
import { Selector } from '../../PersonalCenterManager/Selector';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import AlertManager, { AlertData } from '../../../Core/Manager/Alert/AlertManager';



const { ccclass, property } = _decorator;

@ccclass('UserInfoPanel')
export class UserInfoPanel extends BasePanel {
    static NAME: string = "UserInfoPanel";
    @property(SelectDate)
    comDateSelect: SelectDate = null;

    @property(Selector)
    comSexSelect: Selector = null;

    @property(Selector)
    comEducatSelect: Selector = null;

    @property(Node)
    nameNode: Node = null;

    @property(Node)
    selectorSex: Node = null;

    @property(Node)
    selectorBirthday: Node = null;

    @property(Node)
    selectorEducation: Node = null;

    @property(Node)
    sexContentNode: Node = null;

    @property(Node)
    birthdayContentNode: Node = null;

    @property(Node)
    educationContentNode: Node = null;

    @property(EditBox)
    editBox: EditBox = null;

    private user_name: string = "";
    private user_birthday: string = "";
    private user_sex: number = 0;
    private user_education: number = 0;

    onLoad(): void {
        this.editBox.node.on('editing-did-ended', this.onInputFinished, this);
    }
    onInputFinished(event) {
        this.user_name = this.user_name+ this.editBox.string;
        this.nameNode.getComponent(Label).string = this.editBox.string;
    }
    start() {
        this.initUserInfoPanel();
       
    }
    initUserInfoPanel() {
        let userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData.full_name||!userData.birthday||!userData.education||!userData.gender) {return;}
            this.setName(userData.full_name);
            this.setSex(userData.gender == 1 ? "男" : "女");
            this.setBirthday(userData.birthday);
            this.setEducationById(userData.education);
        
    }
    setName(data) {
        this.user_name = data;
        this.nameNode.getComponent(Label).string = data;
        this.nameNode.getComponent(Label).color = new Color(0, 0, 0);
    }

    backToParent() {
        UIManager.getInstance().hidePanel(UserInfoPanel.NAME);
    }

    setSex(data) {
        this.user_sex = data == "男" ? 1 : 2;
        this.sexContentNode.getComponent(Label).color = new Color(0, 0, 0);
        this.sexContentNode.getComponent(Label).string = data;
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
        this.educationContentNode.getComponent(Label).color = new Color(0, 0, 0);
        this.educationContentNode.getComponent(Label).string = education;
    }
    setBirthday(data) {
        this.user_birthday = data;
        this.birthdayContentNode.getComponent(Label).color = new Color(0, 0, 0);
        this.birthdayContentNode.getComponent(Label).string = data;
    }

    setEducation(data) {
        this.educationContentNode.getComponent(Label).color = new Color(0, 0, 0);
        this.educationContentNode.getComponent(Label).string = data;
    }

    clickSelectSex() {
        this.selectorSex.active = true;
        this.comSexSelect.callback = (sex: string) => {
            this.setSex(sex);
            if (sex == "男") {
                this.user_sex = 1;
            } else {
                this.user_sex = 2;
            }

        }
    }

    clickSelectBirthday() {
        this.selectorBirthday.active = true;
        this.comDateSelect.callback = (year: string, month: string, day: string) => {
            this.setBirthday(year + '-' + month + '-' + day)
            this.user_birthday = year + "-" + month + "-" + day;
        }
    }

    clickSelectEducation() {
        this.selectorEducation.active = true;
        this.comEducatSelect.callback = (education) => {
            this.setEducation(education)
            this.setEducationId(education);

        }
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

        console.log(education,this.user_education);
    }

    errorAlert() {
        const alertData: AlertData = new AlertData();
        alertData.title = "个人信息不完整，请完善个人信息";
        alertData.confirmCb = function () {
            this.cancleAlert()
        }.bind(this);
        AlertManager.getInstance().showAlert(alertData);
    }
    commitUserInfo() {
        console.log('发送个人信息',this.user_name, this.user_sex, this.user_birthday, this.user_education)
        if(this.user_name==""||this.user_sex==0||this.user_birthday==""||this.user_education==0){this.errorAlert();  return;}
        const alertData: AlertData = new AlertData();
        alertData.title = "确定要修改个人信息吗？";
        alertData.cancelButtonVisible=true;
        alertData.cancelButtonText="取消"
        alertData.confirmCb = function () {
            this.cofirmUpdateUserInfo();
        }.bind(this);
        alertData.cancelCb = function () {
            this.cancleAlert();
        }.bind(this);
        AlertManager.getInstance().showAlert(alertData);
    }
    cancleAlert() {
        AlertManager.getInstance().closeCurrentAlert();
    }
    cofirmUpdateUserInfo() {
        PersonalCenterManager.getInstance().updateUserInfo(this.user_name, this.user_sex, this.user_birthday, this.user_education);
        this.backToParent();
    }
}


