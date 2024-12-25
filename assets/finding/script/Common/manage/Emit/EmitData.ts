/**
 * 事件数据
 */
export default class EmitData {
    public static VIEW_CLOSE: string = "view_close";
    public static BANNER_GRID_INIT_OK: string = "banner_grid_init_ok"
    public static VIEW_OPEN: string = "view_open";
    public static GAME_INFO: string = "game_info"
}

export enum EventCode {
    GetConfigOver, //获取配置信息成功
    PanelMgrInitOK, //panel管理器初始化完成
    BannerBoxInitOver, //bannerBox初始化成功
    BannerOrGridInitOK, // banner或者格子初始化成功
}
