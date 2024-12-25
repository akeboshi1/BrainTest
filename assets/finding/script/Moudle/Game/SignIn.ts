// import {_decorator,Node,Label,tween,Vec3} from "cc";
// import LayerUI from "../../Common/manage/Layer/LayerUI";
// import CacheMgr from "../../Common/manage/CacheMgr";
// import Tools from "../../Common/Tools";
// import Constant from "../../Common/Constant";
// import GameConfig from "./GameConfig";
//
// const {ccclass, property} = _decorator;
//
// @ccclass
// export default class NewClass extends LayerUI {
//     private closeNode: Node = null;
//
//     private layoutNode: Node = null;
//
//     private getAwardNode: Node = null;
//
//     private doubleNode: Node = null;
//
//     private bodyNode: Node = null;
//
//     onLoad() {
//         this.bodyNode = this.getNode("body")
//         this.closeNode = this.getNode("body/close");
//         this.layoutNode = this.getNode("body/layout");
//         this.getAwardNode = this.getNode("body/get");
//         this.doubleNode = this.getNode("body/double");
//         this.getAwardNode.active = false;
//         this.doubleNode.active = false;
//     }
//
//     start() {
//         this.initUI();
//         this.startAnimation();
//         this.onTouch(this.closeNode, this.closeSignIn);
//         this.onTouch(this.getAwardNode, this.handler_get);
//         this.onTouch(this.doubleNode, this.handler_double);
//     }
//
//     public initUI() {
//         //当前签到第几天
//         let currDay = CacheMgr.signInCount;
//         let lastTimeStamp = CacheMgr.currTimestamp;
//         let currTimeStamp = new Date(new Date().toLocaleDateString()).getTime();
//         this.layoutNode.children.forEach((node, index) => {
//             if (index <= GameConfig.signInData.length - 1) {
//                 let countLabel: Label = node.getChildByName("count").getComponent(Label);
//                 countLabel.string = "X"+GameConfig.signInData[index];
//             }
//             let canNode: Node = node.getChildByName("can");
//             canNode.active = false;
//             let overNode: Node = node.getChildByName("over");
//             if (currDay <= index) {
//                 overNode.active = false;
//             } else {
//                 overNode.active = true;
//             }
//             if (lastTimeStamp == currTimeStamp) {
//                 canNode.active = false;
//             } else {
//                 if (currDay == index) {
//                     canNode.active = true;
//                 }
//             }
//         })
//         if (currDay == 0) {
//             this.getAwardNode.active = true;
//             this.doubleNode.active = true;
//         } else {
//             //存的时间戳
//             if (currTimeStamp == lastTimeStamp) {
//                 this.getAwardNode.active = false;
//                 this.doubleNode.active = false;
//             } else {
//                 this.getAwardNode.active = true;
//                 this.doubleNode.active = true;
//             }
//         }
//         if (currDay >= 7) {
//             this.getAwardNode.active = false;
//             this.doubleNode.active = false;
//         }
//     }
//
//     public handler_get() {
//         this.getHandler(false);
//     }
//
//     public handler_double() {
//         //双倍领取
//         Tools.handleVideo(Constant.VIDEO_TYPE.GET_DOUBLE).then((res) =>{
//             if (res){
//                 this.getHandler(true);
//             }
//         })
//     }
//
//     public getHandler(isDouble: boolean){
//         let currCount = CacheMgr.signInCount;
//         if (currCount <= GameConfig.signInData.length - 1) {
//             let gold = GameConfig.signInData[currCount];
//             if (isDouble){
//                 Tools.changeGold(gold * 2);
//             }else{
//                 Tools.changeGold(gold);
//             }
//             Tools.showToast("恭喜获得金币" + gold)
//         }else {
//             let getData = GameConfig.prize;
//             let count: number = 0;
//             if (isDouble){
//                 count = getData.count * 2
//             }else{
//                 count = getData.count;
//             }
//             if (getData.type == "hint"){
//                 CacheMgr.hint = CacheMgr.hint + count;
//                 Tools.showToast("神秘大礼包获得提示机会" + count + "次")
//             }
//         }
//         CacheMgr.signInCount = currCount + 1;
//         CacheMgr.currTimestamp = new Date(new Date().toLocaleDateString()).getTime();
//         this.initUI();
//     }
//
//     public startAnimation() {
//         this.bodyNode.setScale(0,0);
//         tween(this.bodyNode)
//             .to(0.5, {scale: new Vec3(1,1,1)}, {easing: "backInOut"})
//             .start()
//     }
//
//     public closeSignIn() {
//         tween(this.bodyNode)
//             .to(0.5, {scale: new Vec3(0,0,0)}, {easing: "backInOut"})
//             .call(() => {
//                 this.node.destroy();
//             })
//             .start()
//     }
//
// }
