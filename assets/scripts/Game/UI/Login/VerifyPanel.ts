import { _decorator, Component, instantiate, Node ,Prefab,Label} from 'cc';
import {SceneManager} from "../../../Core/Manager/Scene/SceneManager";
const { ccclass, property } = _decorator;

@ccclass('VerifyPanel')
export class VerifyPanel extends Component{

    @property(Node)
    private loadNode:Node;

    @property(Node)
    private verifyNode:Node;

    public static NAME:string = "VerifyPanel";

    start(){

    }


    submit(){

    }

    useCamera(){
        // todo use camera

        this.node.removeFromParent();
        SceneManager.getInstance().backToHall();
    }

}