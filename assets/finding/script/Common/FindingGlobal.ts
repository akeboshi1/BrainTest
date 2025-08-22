import { EventManager } from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import CacheMgr from "./manage/CacheMgr";

/**
 * 全局变量
 */
export default class FindingGlobal {
    public static skewersGameList = [];
    public static curSkewersGameIndex: number = 0;
    public static skewersGameLevel:number = 0;
    public static gameCenterGameLevel:number = 0;

    public static reset(){
        FindingGlobal.curSkewersGameIndex = 0;
        FindingGlobal.gameCenterGameLevel = 0;
        FindingGlobal.skewersGameList = [];
    }

    /**
     * 初始化事件监听器，监听训练大厅进度更新事件
     */
    public static initEventListeners() {
        // 监听训练大厅进度更新事件
        EventManager.getInstance().on("GAME_CENTER_LEVEL_UPDATE", (data) => {
            // 更新本地进度变量
            CacheMgr.checkpoint = data.level;
            FindingGlobal.gameCenterGameLevel = data.level;
            console.log("训练大厅进度已更新:", data.level);
        }, FindingGlobal);
    }

    public static config: any =
        {
            isReportAction: false, //是否上报用户行为   //一旦上线  ，设置为true
            isCheat: 100,   //是否骗点总开关
            exportScrollSpeed: 150,  //导出框 每秒移动速度  用不到了
            gameBoxMoveInterval: 1.5, //导出框 每秒移动间隔
            exportConfig: [
                {
                    //oneBox 配置
                    cheat_probability: 100, //进行骗点概率 , 建议不要设置成为百分之百 , 50 左右
                    force_export: 100,  //强制导出概率
                    return_show: 3, // 返回按钮显示的时间
                    show_banner: 1, //如果需要骗点的话， banner在什么时候显示
                },
                {
                    cheat_probability: 100, //进行骗点概率 , 建议不要设置成为百分之百 , 50 左右
                    force_export: 100,  //强制导出概率
                    return_show: 3, // 返回按钮显示的时间
                    show_banner: 1, //如果需要骗点的话， banner在什么时候显示
                },
                {
                    // three 配置
                    buttonMoveUp: 1,   //继续按钮向上移动 动画时间
                    cheat_probability: 100, //进行骗点概率
                    force_export: 0,  //强制导出概率
                    noCheat: {
                        btnShowTime: 1.5, //无骗点按钮显示时间
                    },  //进行骗点配置
                    cheat: {
                        btnShowTime: 1, //按钮显示时间，该时间过后直接显示banner
                        showBannerTime: 2, //banner 展示时间
                        randShowBannerIntervalSection: {
                            min: 0.5,
                            max: 2,
                        },  //banner 第一个banner 展示完成之后，根据这个间隔，随机再次显示banner
                        randShowBannerTimeSection: {
                            min: 0.5,
                            max: 1,
                        },//随机显示banner ,banner 出现的时长，根据这个区间取
                        randShowBannerCountSection: {
                            min: 1,
                            max: 3,
                        },//随机显示banner的次数，根据这个区间取
                    },  //不进行骗点配置
                },
                {
                    // four 配置
                    buttonMoveUp: 1,   //继续按钮向上移动 动画时间
                    cheat_probability: 100, //进行骗点概率
                    force_export: 0,  //强制导出概率
                    noCheat: {
                        btnShowTime: 1.5, //无骗点按钮显示时间
                    },  //进行骗点配置
                    cheat: {
                        btnShowTime: 1, //按钮显示时间，该时间过后直接显示banner
                        showBannerTime: 2, //banner 展示时间
                        randShowBannerIntervalSection: {
                            min: 0.5,
                            max: 2,
                        },  //banner 第一个banner 展示完成之后，根据这个间隔，随机再次显示banner
                        randShowBannerTimeSection: {
                            min: 0.5,
                            max: 1,
                        },//随机显示banner ,banner 出现的时长，根据这个区间取
                        randShowBannerCountSection: {
                            min: 1,
                            max: 3,
                        },//随机显示banner的次数，根据这个区间取
                    },  //不进行骗点配置
                },
            ], //每一个导出的配置
            //狂点宝箱配置
            chest_Config: {
                force: true,  //是否强制骗点
                interval: 10,  //10帧
                continue_click: {
                    max: 5,
                    min: 3,
                },     // 连续点击多少次 显示banner 配置 ，此配置为一个区间
                width: 1,   //玩家最多只能点到整个进度条的多少  ， 0 - 1 之间取值
            },
            panel_config: {
                loginView: { //这个是第一次登录的时候， 从loading 到 home的配置
                    banner_probability: 100,    //banner 显示概率
                    gameBox_probability: 100,  //gameBox 显示概率
                    chest_probability: 0,   //误触宝箱
                    video_probability: 0, //强拉视频 需要配合模式为非自动强拉
                    more_game: [], //更多训练导出列表
                    export_show: [],      //显示时候的导出
                    slider: 0, //0 不显示   1 显示  2 显示并且自动拉出
                },
                homeView: { //这个是第一次登录的时候， 从loading 到 home的配置
                    banner_probability: 0,    //banner 显示概率
                    gameBox_probability: 0,  //gameBox 显示概率
                    chest_probability: 0,   //误触宝箱
                    video_probability: 0, //强拉视频
                    more_game: [], //更多训练导出列表
                    export_show: [],      //显示时候的导出
                    slider: 0, //0 不显示   1 显示  2 显示并且自动拉出
                },
                gameView: { //这个是第一次登录的时候， 从loading 到 home的配置
                    banner_probability: 0,    //banner 显示概率
                    gameBox_probability: 100,  //gameBox 显示概率
                    chest_probability: 0,   //误触宝箱
                    video_probability: 0, //强拉视频
                    export_show: [],      //显示时候的导出
                    slider: 0, //0 不显示   1 显示  2 显示并且自动拉出
                },
                endView: { //这个是第一次登录的时候， 从loading 到 home的配置
                    banner_probability: 0,    //banner 显示概率
                    gameBox_probability: 0,  //gameBox 显示概率
                    chest_probability: 0,   //误触宝箱
                    video_probability: 0, //强拉视频
                    export_show: [],      //显示时候的导出
                    slider: 0, //0 不显示   1 显示  2 显示并且自动拉出
                },
            },
            /**
             * 分享配置
             *  title: 分享标题
             *  img: 分享图片路劲
             */
            share: {
                title: '超难关卡，等你来战！！！',
                img: ''
            },
            //以上为新增
            box_conf: {
                force_Id: [],
            },
            adv_unit_conf: {
                bannerBeClick_Refresh: false, //banner 被点击刷新
                bottomReconnectInterval: 3, //底部广告 刷新失败重连间隔

                showBottomAdOrder: [0, 1, 2],  //暂时banner 优先级顺序  0 banner   1 格子  2 导出
                customSize: {
                    width: 360,
                    height: 106,
                },

                banner: [
                    "adunit-a865642381d291fb",
                    "adunit-d07ac8117d5a02b5"
                ],
                banner_freshTime: 10,    // banner刷新时间

                rewarded_video: [
                    "adunit-7d982191e"
                ],

                video_auto_play: true, //视频是否自动播放  ,true 的话， 视频为自动播放模式， 如果为false 则根据自动跳场景来配置视频播放
                video_play_on_login: true,  //一进入训练是否强拉视频
                video_reconnect_interval: 5,  //视频重新拉取间隔
                video_play_interval: 10, //视频播放间隔 0 不自动播放
                grid: [],
                grid_count: 5,
                custom: [
                    "adunit-db5a2d55b1128369"
                ],
                screen: 'adunit-',   //插屏 广告 id
                screen_reconnect_interval: 5, //插屏广告重新拉取间隔
            },

            //玩家属性面板配置
            gameInfo: {
                animation: 0.5,  //加减动画 秒数
                maxStamina: 10,   //最大体力值
                autoAddStaminaTime: 1,  //每隔多少时间恢复一次体力值
                autoAddStaminaNum: 1, //每次自动恢复体力值
            },
            addInfo: {
                gold: 100,
                diamond: 2,
                stamina: 2,
            }
        };

    public static isShowBanner: boolean = false
    // 导出信息
    public static exportInfo: ExportData [] = [];

    // 好友推荐训练盒子信息
    public static shareGameBox: ExportData[] = [];

    // 世界前二十排行榜信息
    public static Ranking = [];

    public static IS_LOG: boolean = false;
    // 首屏
    public static LoginFlag: boolean = true;

    public static LoginType: number = 3;
    /**
     * 具体训练配置
     */
}

/**
 * 导出数据
 */
export interface ExportData {
    appId: string // appID
    id: number // 后台导出ID
    adImg: string // 广告图URL
    exportSrc: string // 导出路劲
    gameOriginId: number // 原训练ID
    gameTargetId: number
    gameTargetName: string // 分享训练名称
    iconImg: string
    isLike: number
    isOffline: number
    isPopular: number
    sort: number
}

export interface UIConfig {
    banner_probability: number,    //banner 显示概率
    gameBox_probability: number,  //gameBox 显示概率
    chest_probability: number,   //误触宝箱
    insert_probability: number,  //插屏
    video_probability: number,   // 强拉视频
    export_show: number[],      //显示时候的导出
}
