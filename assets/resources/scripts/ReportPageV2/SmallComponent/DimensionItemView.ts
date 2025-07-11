import { _decorator, Component, Label, Node, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DimensionItemView')
export class DimensionItemView extends Component {
  @property(Node)
  private iconNode: Node = null;
  @property(Label)
  private titleLabel: Label = null;
  @property(Label)
  private textLabel: Label = null;
  @property(Label)
  private text2Label: Label = null;
  start() {

  }
  showText2(isShow:boolean){
    this.text2Label.node.active = isShow;
  }

  setIcon(icon: SpriteFrame) {
    this.iconNode.getComponent(Sprite).spriteFrame = icon;
  }
  setName(name: string) {
    this.titleLabel.string = name;
  }
  setText(text: string) {
    this.textLabel.string = text;
  }
  setText2(text: string) {
    this.text2Label.string = text;
  }

}


