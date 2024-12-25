// import {_decorator,Node,tween,Vec3} from "cc";
// import CacheMgr from "../../Common/manage/CacheMgr";
// import AudioMgr from "../../Common/manage/AudioMgr";
// import LayerUI from "../../Common/manage/Layer/LayerUI";
//
// const {ccclass} = _decorator;
//
// @ccclass
// export default class SettingBox extends LayerUI {
//
//     private music: Node = null;
//     private audio: Node = null;
//     private data: any = null;
//
//     onLoad(): void {
//         this.music = this.getNode("container/music");
//         this.audio = this.getNode("container/audio");
//         this.data = CacheMgr.setting.setting;
//         this.startAnimation();
//     }
//
//     public startAnimation(){
//         this.node.setScale(0,0);
//         tween(this.node)
//             .to(0.5, {scale: new Vec3(1,1,1)}, {easing: "backInOut"})
//             .start()
//     }
//
//     start() {
//         this.getNode('container').children.forEach((node: Node) => {
//             let name = node.name;
//             let value = this.data[name];
//
//             node.getChildByName('off').active = value === 0;
//             node.getChildByName('no').active = value !== 0;
//             this.onTouch(node, () => {
//                 let is_no = node.getChildByName('no').active;
//                 if (!is_no) {
//                     // 打开
//                     node.getChildByName('off').active = false;
//                     node.getChildByName('no').active = true;
//                     this.data[name] = 1;
//                     if (name == "music") {
//                         AudioMgr.backMusic()
//                     }
//                 } else {
//                     // 关闭
//                     node.getChildByName('off').active = true;
//                     node.getChildByName('no').active = false;
//                     this.data[name] = 0;
//
//                     if (name == "music") {
//                         AudioMgr.backMusic(false)
//                     }
//                 }
//                 CacheMgr.setting.setting = this.data
//                 CacheMgr.setting =  CacheMgr.setting
//             });
//         });
//
//         this.onTouch(this.getNode('close'), () => {
//             tween(this.node)
//                 .to(0.5, {scale: new Vec3(0,0,0)}, {easing: "backInOut"})
//                 .call(() => {
//                     this.node.destroy()
//                 })
//                 .start()
//         });
//     }
// }
