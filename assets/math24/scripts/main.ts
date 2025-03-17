import { _decorator, Button, Label, Node, Sprite, SpriteFrame, Texture2D,Vec3,tween } from 'cc';
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
const { ccclass, property } = _decorator;
@ccclass('Main')
export class Main extends BaseScene<IBaseGameChild> {

    @property(Node)
    viewNode: Node;

    @property(Node)
    successView: Node;

    @property(Node)
    failView: Node;

    @property(Node)
    bigWin: Node;

    @property(Node)
    timeNode: Node;

    start() {
        super.start();
    }
}