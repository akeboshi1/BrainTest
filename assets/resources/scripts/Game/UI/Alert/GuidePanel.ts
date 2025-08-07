import {  _decorator,Button,Node,Color,Label,Sprite,VideoPlayer,resources,VideoClip,UITransform } from "cc";
import {BasePanel} from "db://assets/resources/scripts/Core/UI/BasePanel";
import {UIManager} from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import {GameCenterManager} from "db://assets/resources/scripts/Game/GameCenter/GameCenterManager";
import {BundleName} from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import {VideoControlPanel} from "./VideoControlPanel";
import { ScreenSizeUtil } from "../../../Adapter/ScreenSizeUtil";
import { ScreenAdapter } from "../../../Adapter/ScreenAdapter";
const { ccclass, property } = _decorator;

enum OptionButtonColor {
    SELECT = 0,
    NORMAL = 1
}

// 将枚举转换为Color类型
const OptionButtonColorMap = {//rgb(209, 95, 128)
    [OptionButtonColor.SELECT]: new Color(55, 194, 109, 255), //rgb(55, 194, 96)
    [OptionButtonColor.NORMAL]: new Color(61, 21, 127, 255)   //rgb(61, 21, 127)
}

/**
 * 玩法介绍界面
 */
@ccclass('GuidePanel')
export class GuidePanel extends BasePanel {


    @property(Button)
    btn:Button = null;

    @property(Node)
    btnNode:Node = null;

    @property(Node)
    btnNode2:Node = null;

    @property(Node)
    btnNode3:Node = null;

    @property(Label)
    descLabel:Label = null;

    // 可选：直接使用VideoPlayer（如果不需要完整的控制面板）
    @property(VideoPlayer)
    videoPlayer: VideoPlayer = null;

    // 添加视频播放器节点引用，用于变色
    @property(Node)
    videoPlayerNode: Node = null;


    public static NAME: string = 'GuidePanel';

    private gameName:BundleName= undefined;

    private callback:Function = undefined;

    private exitcallback:Function = undefined;

    restore(data){
        if(data !=null){
            this.gameName = data.name
            this.callback = data.callback;
            this.exitcallback = data.exitCallback;
            let descStr = "";
            switch(this.gameName){
                case BundleName.FINGING:
                    descStr = "找茬游戏:对比两幅高度相似的图片，找出细微差异（如颜色、形状、数量），锻炼细节观察力与专注度"
                    break;
                case BundleName.FANPAI:
                    descStr = "翻牌游戏:玩家通过记忆卡牌位置寻找相同图案或数字的配对牌，考验短期记忆力与空间定位能力"
                    break;
                case BundleName.PUZZLE:
                    descStr = "拼图游戏:将碎片拼接为完整图案，训练空间想象力与耐心，锻炼人的执行力"
                    break;
                case BundleName.CATCHFISH:
                    descStr = "捕鱼游戏:将数学运算（加减法）融入捕鱼情境，玩家通过计算捕获目标鱼群，兼具趣味性与知识性，锻炼人的计算能力"
                    break;
                case BundleName.GUESSINGGAME:
                    descStr = "猜谜游戏:通过线索推断答案，涵盖文字谜、动作谜、逻辑谜等多种形式，锻炼人的推理能力"
                    break;
                case BundleName.SENTENCEMAKING:
                    descStr = "组词造句:以麻将牌形式的文字游戏，牌面上是单个汉字或词语，玩家通过组合这些牌来形成词语或句子，锻炼人的语言能力"
                    break;
                case BundleName.SMALLTHEATER:
                    descStr = "小剧场"
                    break;

            }
            this.descLabel.string = descStr;
            this.btnNode2.active= this.btnNode3.active = this.gameName != BundleName.GUESSINGGAME;
            this.selectHard(null,"0");

            // 初始化视频（如果有的话）
            this.initVideo();
        }
    }

    /**
     * 初始化视频
     */
    private initVideo() {
        // 确保VideoPlayer不会自动播放
        if (this.videoPlayer) {
            this.videoPlayer.playOnAwake = false;
        }

        this.loadLocalVideo();
    }

    /**
     * 初始化视频颜色
     */
    private initVideoColor() {
        if (this.videoPlayerNode) {
            // 获取视频播放器节点的Sprite组件
            const sprite = this.videoPlayerNode.getComponent(Sprite);
            if (sprite) {
                // 设置初始颜色为正常白色
                sprite.color = new Color(255, 255, 255, 255);
            }
        }
    }

    /**
     * 设置视频为灰色（暂停状态）
     */
    private setVideoGray() {
        if (this.videoPlayerNode) {
            const sprite = this.videoPlayerNode.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(128, 128, 128, 255);
            }
        }
    }

    /**
     * 设置视频为正常颜色（播放状态）
     */
    private setVideoNormal() {
        if (this.videoPlayerNode) {
            const sprite = this.videoPlayerNode.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(255, 255, 255, 255);
            }
        }
    }

    /**
     * 视频点击事件处理
     */
    public onVideoClick(data,event) {
        if (!this.videoPlayer || !this.videoPlayer.clip) {
            console.warn("视频未加载完成");
            return;
        }
        if(event === VideoPlayer.EventType.COMPLETED){
        }else if(event === VideoPlayer.EventType.CLICKED){
            if (this.videoPlayer.isPlaying) {
                // 如果正在播放，则暂停并设置为灰色
                this.pauseVideo();
            } else {
                // 如果没有播放，则开始播放并设置为正常颜色
                this.playVideo();
            }
        }else if(event === VideoPlayer.EventType.PAUSED){
        }
    }

    /**
     * 视频播放完成事件
     */
    private onVideoCompleted() {
        console.log("视频播放完成");
        // 播放完成后自动停止
        this.stopVideo();
    }

    /**
     * 视频开始播放事件
     */
    private onVideoPlaying() {
        console.log("视频开始播放");
    }

    /**
     * 视频暂停事件
     */
    private onVideoPaused() {
        console.log("视频已暂停");
    }

    /**
     * 加载本地视频文件
     */
    private loadLocalVideo() {
        let videoPath = "";

        // 根据游戏类型设置对应的视频路径
        switch(this.gameName) {
            case BundleName.FINGING:
                videoPath = "video/findguide"; // 找茬游戏教程视频
                break;
            case BundleName.FANPAI:
                videoPath = "video/fanpaiguide"; // 翻牌游戏教程视频
                break;
            case BundleName.PUZZLE:
                videoPath = "video/puzzleguide"; // 拼图游戏教程视频
                break;
            case BundleName.CATCHFISH:
                videoPath = "video/fishguide"; // 捕鱼游戏教程视频（已存在）
                break;
            case BundleName.GUESSINGGAME:
                videoPath = "video/guessguide"; // 猜谜游戏教程视频
                break;
            case BundleName.SENTENCEMAKING:
                videoPath = "video/majiangguide"; // 造句游戏教程视频
                break;
        }

        if (videoPath) {
            // 从resources目录加载视频文件
            resources.load(videoPath, VideoClip, (err, videoClip) => {
                if (err) {
                    console.warn(`加载视频失败: ${videoPath}`, err);
                    return;
                }

                console.log(`视频加载成功: ${videoPath}`);

                // 设置视频到播放器，但不自动播放
                this.videoPlayer.clip = videoClip;
                this.videoPlayer.playOnAwake = false; // 确保不会自动播放

                this.adaptVideoPlayer();

            });
        }
    }

    adaptVideoPlayer() {
        if (!this.videoPlayer) {
            return;
        }

        let scaleFactor = ScreenSizeUtil.getDevicePixelRatio()+1;


        // 适配宽度
        this.videoPlayer.node.setScale(scaleFactor, scaleFactor);
    }

    

    /**
     * 播放视频（外部调用接口）
     */
    playVideo() {
        if (this.videoPlayer) {
            // 直接使用VideoPlayer播放
            this.videoPlayer.play();
            // 播放时设置为正常颜色
            this.setVideoNormal();
            // this.videoPlayer.node.active =true;
        }
    }

    /**
     * 暂停视频（外部调用接口）
     */
    pauseVideo() {
        if (this.videoPlayer && this.videoPlayer.isPlaying) {
            this.videoPlayer.pause();
            // 暂停时设置为灰色
            this.setVideoGray();
            // this.videoPlayer.node.active =false;
        }
    }

    /**
     * 停止视频（外部调用接口）
     */
    stopVideo() {
        if (this.videoPlayer) {
            this.videoPlayer.stop();
        }
    }

    selectHard(event,data){
        let btnSprite1:Sprite = this.btnNode.getComponent(Sprite);
        let btnSprite2:Sprite = this.btnNode2.getComponent(Sprite);
        let btnSprite3:Sprite = this.btnNode3.getComponent(Sprite);
        switch(data){
            case "0":
                btnSprite1.color = OptionButtonColorMap[OptionButtonColor.SELECT];
                btnSprite2.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                btnSprite3.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                break;
            case "1":
                btnSprite2.color = OptionButtonColorMap[OptionButtonColor.SELECT];
                btnSprite1.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                btnSprite3.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                break;
            case "2":
                btnSprite3.color = OptionButtonColorMap[OptionButtonColor.SELECT];
                btnSprite2.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                btnSprite1.color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                break;
        }
        GameCenterManager.getInstance().setDifficulty(Number(data)+1);
    }

    startGame(){
        if(this.callback != undefined){
            this.callback();
        }
        this._closePanel();
    }

    closePanel(){
        if(this.exitcallback != undefined){
            this.exitcallback();
        }
        this._closePanel();
    }

    _closePanel(){
        // 停止视频播放
        this.stopVideo();
        
        // 重置视频颜色为正常
        this.setVideoNormal();

        this.videoPlayerNode.active = false;

        this.callback = undefined;
        this.gameName = undefined;
        this.exitcallback = undefined;
        UIManager.getInstance().hidePanel(GuidePanel.NAME);
    }

}