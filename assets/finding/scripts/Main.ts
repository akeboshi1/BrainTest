import {Component,_decorator,Node,Button} from "cc";
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Component{
    @property(Node)
    public loading:Node;

    @property(Button)
    public loginBtn:Button

    @property(Node)
    public progressBar:Node;

    onLoad(){

    }

    start(){

    }

    onEnable(){

    }

    onDisable(){

    }




}