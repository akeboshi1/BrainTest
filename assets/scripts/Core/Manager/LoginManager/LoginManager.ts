import {UIManager} from "db://assets/scripts/Core/Manager/UI/UIManager";
import {Node,instantiate} from "cc"
import {LoaderManager} from "db://assets/scripts/Core/Manager/Load/LoaderManager";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {LoginPanel} from "db://assets/scripts/Game/UI/Login/LoginPanel";
import {LoginPopUpPanel} from "db://assets/scripts/Game/UI/Login/LoginPopUpPanel";

export class LoginManager {
    private static _instance: LoginManager;

    public static getInstance():LoginManager {
        if(!LoginManager._instance) {
            LoginManager._instance = new LoginManager();
        }
        return LoginManager._instance;
    }

    init(){

    }


    start(parentNode:Node){
        LoaderManager.getInstance().resourcesLoadPrefab(Global.RES_Root+"prefab/LoginPanel").then((resource)=>{
            const node = instantiate(resource);
            UIManager.getInstance().registerView(LoginPanel.NAME,node);
            UIManager.getInstance().showView(LoginPanel.NAME,parentNode);
            node.setPosition(0,0,0);
        });
    }

    showXieyi(parentNode:Node){
        LoaderManager.getInstance().resourcesLoad(Global.RES_Root+"prefab/LoginPopUpPanel").then((resource)=>{
            const node = instantiate(resource);
            UIManager.getInstance().registerView(LoginPopUpPanel.NAME,node);
            const parendNode = parentNode.parent;
            UIManager.getInstance().showView(LoginPopUpPanel.NAME,parendNode);
            UIManager.getInstance().hideView(LoginPanel.NAME);
            const logingpopupPanel:LoginPopUpPanel = UIManager.getInstance().getView(LoginPopUpPanel.NAME)as LoginPopUpPanel;
            if(logingpopupPanel)logingpopupPanel.switchView();

        });
    }

    showPhoneView(parentNode:Node){
        LoaderManager.getInstance().resourcesLoad(Global.RES_Root+"prefab/LoginPopUpPanel").then((resource)=>{
            const node = instantiate(resource);
            UIManager.getInstance().registerView(LoginPopUpPanel.NAME,node);
            const parendNode = parentNode.parent;
            UIManager.getInstance().showView(LoginPopUpPanel.NAME,parendNode);
            UIManager.getInstance().hideView(LoginPanel.NAME);
            const logingpopupPanel = UIManager.getInstance().getView(LoginPopUpPanel.NAME)as LoginPopUpPanel;
            if(logingpopupPanel)logingpopupPanel.switchView();
        });
    }

    login(parentNode:Node){

    }

}