
/**
 * 常量配置
 */
export default class Constant {

    public static REWARDED_VIDEO_END_TYPE = {
        END: 1, // 播放完整
        NOT_END: 2, // 未播放完整
        ERROR: 3, // 报错
        INSERT_SCREEN: 4, //插屏代替
        SHARE: 5, //分享代替
    };

    // 分享类型
    public static UNLOCK_TYPE = {
        PASS_GAME: 1, // 跳过
        TIPS: 2, // 双倍金币
        GET_STRENGTH: 3, // 获取体力
        DOUBLE_STRENGTH: 4, // 双倍体力
        NEXT_LEVEL: 5, // 下一关卡
        GET_GOLD: 6, // 获取体力
        DOUBLE: 7, //
        TRY_SKIN: 8
    };

    public static GAME_BOX_TWEEN_TYPE = {
        SHAKE_STOP: 1,
        SHAKE_FOREVER: 2,
        SCALE_MOVE: 3
    };

    //?
    public static LOGIN_CODE = {
        1: '本地环境不予后台进行交互;',
        2: '微信接口调用失败;',
        3: '微信登录接口调用成功，但 Code 为空;',
        4: "用户后台登录失败 code != 200;",
        5: '用户后台登录失败！',
        6: '更新用户数据失败, Code != 200;',
        7: '更新用户数据失败;',
        8: '获取游戏配置失败, Code != 200;',
        9: '获取游戏配置失败;',
        10: '获取游戏导出失败, Code != 200;',
        11: '获取游戏导出失败;',
        12: '上报游戏导出失败, Code != 200;',
        13: '上报游戏导出失败;',
    }

    public static VIDEO_TYPE = {
        POP: 1, // 弹窗型试用广告，
        GET_PROPS: 2, // 获取道具,
        GET_POWER: 3, // 获取体力,
        GET_GOLD: 4, // 获取金币，
        GET_DOUBLE: 5, // 双倍领取，
        UNLOCK: 6, //解锁关卡，
        GET_SKIN: 7, // 获取皮肤
        ENFORCE: 8, // 强拉视频
        PLAY_END: 9, //播放完成
        PLAY_CLOSE: 10, //播放到一半没了
    }
    //4
    public static BOTTOM_TYPE = {
        NEW_BANNER_SHOW: 1, //新banner展示完成
        OLD_BANNER_SHOW: 2, //旧banner展示完成
        NEW_CUSTOM_SHOW: 3, //新自定义广告展示完成
        OLD_CUSTOM_SHOW: 4, //旧自定义广告展示完成
    }

    //5  导出成功记录
    public static EXPORT_TYPE = {
        FORCE: 1,      //强制导出
        RAND_FORCE: 2, //随机一个
        GAME_BOX_ONE: 3,   //ONE BOX
        GAME_BOX_TWO: 5,  //TWO BOX
        GAME_BOX_THREE: 6, //THREE BOX
        GAME_BOX_SLIDER: 7,// SLIDER BOX  侧边栏导出
        OPEN_DATA: 8,  //开放数据域
        VIEW_BOX: 9, //页面导出
        BANNER_BOX: 10, //banner导出
    }


}
