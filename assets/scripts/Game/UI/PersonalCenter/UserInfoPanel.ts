import { _decorator, Component, Node,Label,EditBox ,Color} from 'cc';
import { SelectDate } from '../../PersonalCenterManager/SelectDate';
import { SelectSex } from '../../PersonalCenterManager/SelectSex';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';


const { ccclass, property } = _decorator;

@ccclass('UserInfoPanel')
export class UserInfoPanel extends Component {
 
    @property(SelectDate)
    comDateSelect:SelectDate = null;

    @property(SelectSex)
    comSexSelect:SelectSex = null;

    @property(SelectSex)
    comEducatSelect:SelectSex = null;

    @property(Node)
    selectorSex:Node = null;

    @property(Node)
    selectorBirthday:Node = null;

    @property(Node)
    selectorEducation:Node = null;

    @property(Node)
    sexContentNode:Node = null;

    @property(Node)
    birthdayContentNode:Node = null;

    @property(Node)
    educationContentNode:Node = null;

    @property(EditBox)
    editBox:EditBox = null;

    private user_name:string = "";
    private user_birthday:string = "";
    private user_sex:number = 1;
    private user_education:number =1;

    onLoad(): void {
        this.editBox.node.on('editing-did-ended', this.onInputFinished, this); 
    }
    onInputFinished(event) {
        this.user_name = this.editBox.string;
    }
    start() {

    }

    update(deltaTime: number) {
        
    }
    backToParent() {
        this.node.active =false;
        this.node.parent.getChildByName("PersonalCenter").active = true;
    }
   
    setSex(data) {
        this.sexContentNode.getComponent(Label).color = new Color(0, 0, 0);
        this.sexContentNode.getComponent(Label).string = data;
    }
    setBirthday(year, month, day) {
        this.birthdayContentNode.getComponent(Label).color = new Color(0, 0, 0);
        this.birthdayContentNode.getComponent(Label).string = year + "-" + month + "-" + day;
    }
    // formatDate(birthday) {
    //     const date = new Date(birthday);
    //     const year = date.getFullYear();
    //     const month = this.padZero(date.getMonth() + 1); 
    //     const day = this.padZero(date.getDate());
        
    //     return `${year}-${month}-${day}`;
    // }
    // padZero(value) {
    //     return value.toString().padStart(2, '0'); 
    // }
    setEducation(data) {
        this.educationContentNode.getComponent(Label).color = new Color(0, 0, 0);
        this.educationContentNode.getComponent(Label).string = data;
    }
    clickSelectSex() {
        this.selectorSex.active = true;
        this.comSexSelect.callback = (sex: string) => {
         this.setSex(sex);
         if(sex == "男") {
            this.user_sex= 1;
         }else {
            this.user_sex= 2;
         }
         
        }
    }
    clickSelectBirthday() {
        console.log("clickSelectBirthday");
        this.selectorBirthday.active = true;
        this.comDateSelect.callback = (year:string, month:string, day:string) => {
            this.setBirthday(year, month, day)
            this.user_birthday = year + "-" + month + "-" + day;
        }
    }
    clickSelectEducation() {
        this.selectorEducation.active = true;
        this.comEducatSelect.callback = (education) => {
            this.setEducation(education)
            if(education == "初中及以下") {
                this.user_education = 1;
            }else if(education == "高中") {
                this.user_education = 2;
            }else if(education == "大专") {
                this.user_education = 3;
            }else if(education == "本科") {
                this.user_education = 4;
            }else if(education == "硕士及以上") {
                this.user_education = 5;
            }
        }
    }
    commitUserInfo() {
        console.log("this.user_name",this.user_name);
        console.log("this.user_sex",this.user_sex);
        console.log("this.user_birthday",this.user_birthday);
        console.log("this.user_education",this.user_education);

        PersonalCenterManager.getInstance().updateUserInfo(this.user_name, this.user_sex, this.user_birthday, this.user_education);
    }
}


