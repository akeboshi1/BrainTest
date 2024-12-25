// import {_decorator,Node,Label,tween,Vec3} from "cc";
// import LayerUI from "../../Common/manage/Layer/LayerUI";
// import Tools from "../../Common/Tools";
// import CacheMgr from "../../Common/manage/CacheMgr";
// import GameConfig from "./GameConfig";
//
// const {ccclass, property} = _decorator;
//
// @ccclass
// export default class Shop extends LayerUI {
//     private contentNode: Node = null;
//
//     private closeNode: Node = null;
//
//     onLoad() {
//         this.contentNode = this.getNode("content");
//         this.closeNode = this.getNode("close");
//     }
//
//     start() {
//         this.initShop();
//         this.startAnimation();
//         this.onTouch(this.closeNode, this.closeShop)
//     }
//
//     public initShop() {
//         this.contentNode.children.forEach((node, index) => {
//             let btn_buy: Node = node.getChildByName("btn_buy")
//             let butCount: Label = btn_buy.getChildByName("count").getComponent(Label);
//             butCount.string = GameConfig.shop_price[index] + "";
//             this.onTouch(btn_buy, () => {
//                 this.handler_buy(index)
//             });
//         })
//     }
//
//     public handler_buy(index) {
//         let money = GameConfig.shop_price[index];
//         let data = GameConfig.shop_propCount[index];
//         let isSucceed = Tools.changeGold(-money);
//         if (isSucceed) {
//             Tools.showToast("购买成功")
//             switch (data.title) {
//                 case "time":
//                     let recall = CacheMgr.addTime;
//                     let tempRecall = data.count;
//                     CacheMgr.addTime = recall + tempRecall;
//                     break;
//                 case "hint" :
//                     let hint = CacheMgr.hint;
//                     let tempHint = data.count;
//                     CacheMgr.hint = hint + tempHint;
//                     break;
//                 default:
//                     return;
//             }
//         }
//     }
//
//     public startAnimation() {
//         this.node.setScale(0,0);
//         tween(this.node)
//             .to(0.5, {scale: new Vec3(1,1,1)}, {easing: "backInOut"})
//             .start()
//     }
//
//     public closeShop() {
//         tween(this.node)
//             .to(0.5, {scale: new Vec3(0,0,0)}, {easing: "backInOut"})
//             .call(() => {
//                 this.node.destroy();
//             })
//             .start()
//     }
// }
