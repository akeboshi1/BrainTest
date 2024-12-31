import { _decorator, AnimationComponent, Color, Component, Label, Node, Sprite, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CardCtrl')
export class CardCtrl extends Component {
    @property(Node)
    showNode: Node;

    @property(Label)
    label: Label;

    @property(Sprite)
    sp: Sprite;

    @property(Node)
    cardBack: Node;

    @property(AnimationComponent)
    anim: AnimationComponent;

    private id: number;
    private locked: boolean = false;

    start() {

    }

    update(deltaTime: number) {

    }

    setLabel(v: string) {
        this.label.string = v;
    }

    setid(id: number) {
        this.id = id;
    }

    getid(): number {
        return this.id;
    }

    lock() {
        this.locked = true;
        this.label.color = new Color(162, 2, 2);
    }

    unlock() {
        this.locked = false;
        this.label.color = new Color(0, 0, 0);
    }

    isLocked(): boolean {
        return this.locked;
    }

    setWrong() {
        this.sp.color = new Color(255, 139, 139);
    }

    setNormal() {
        this.sp.color = new Color(255, 255, 255);
    }

    playFlip() {
        this.anim.play();
    }

    resetAnim() {
        this.cardBack.active = true;
        this.cardBack.setScale(1, 1);
        this.cardBack.setPosition(0, 0);
    }
}


