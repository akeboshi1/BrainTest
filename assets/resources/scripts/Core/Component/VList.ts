import { _decorator, CCObject, CCString, clamp, clamp01, Component, easing, Enum, error, instantiate, Layout, log, Mask, Node, NodeEventType, Prefab, Rect, Size, TransformBit, Tween, tween, UIOpacity, UIRenderer, UITransform, v2, v3, Vec2, Vec3, warn, Widget } from 'cc';
import { EDITOR_NOT_IN_PREVIEW } from 'cc/env';
import { FixedScrollView } from './FixedScrollView';
import { VListLayerCom } from './VListLayerCom';
import { WidgetUtils } from './WidgetUtils';
import { ScreenSizeUtil } from '../../Adapter/ScreenSizeUtil';
import { ScreenAdapter } from '../../Adapter/ScreenAdapter';
const { ccclass, property, executeInEditMode } = _decorator;
// -*- coding: utf-8 -*-
export enum VListEvent {
    /**滚动和定位时触发 */
    OnScrolling = "scrolling",
    /**元素重新布局时触发 */
    OnLayout = "layout",
    /**该节点尺寸更改时触发 */
    OnResize = "size-changed",
    /**页面变更时触发（仅page模式下有效） */
    OnTurnPage = "turn-page",
    /**页面吸附完毕（仅page模式下有效） */
    OnFinishPage = "finish-page",
}
function V3(v: Vec2, z = 0) {
    return v3(v.x, v.y, z);
}
const RecycleNodeName = "v_recycle";
const ScrollNodeName = "v_scrollView";
const ContentNodeName = "v_content";
const PageNodeName = "v_page";
const ViewNodeName = "v_view";
const ItemRectNodeName = "v_itemRect"
interface IRegisterInfo {
    uniKey: string,
    evtId: string,
    callback: (info: IVListItemInfo<any>) => void,
    key: string,
}
const isInEditorMode = EDITOR_NOT_IN_PREVIEW;
/**滑动的目标位置（方位或索引） */
type Location = number | "Top" | "Bottom" | "Left" | "Right" | "Start" | "End";
/**列表实时布局信息 */
export interface ILayoutInfo {
    /**实际列数 */
    col: number,
    /**实际行数 */
    row: number,
    /**布局尺寸（即包括留白） */
    size: Size,
    /**最小包围盒尺寸（即不包括留白） */
    boundSize: Size,
    /**实际横向间隔 */
    spaceX: number,
    /**实际纵向间隔 */
    spaceY: number,
    /**条目总数 */
    num: number,
}
export type VCallback<T> = (info: IVListItemInfo<T>, renderItem?: IRenderItemInfo) => void;
export type NodeCapture = (key: string) => Node;
export type ComCapture = <K extends Component>(key: string, ctor: new () => K) => K
export type VInitback<T> = (info: { get: ComCapture, getNode: NodeCapture, node: Node, list: VList<T>, parent: IVListItemInfo<any> }) => void
/**列表项生命周期函数 */
export interface IVListItemHooks<T> {
    /**当子项节点首次被实例化时调用*/
    onInstantiate?: VInitback<T>;
    /**当子项节点被清理时调用*/
    onDestroy?: VInitback<T>;
    /**当子项数据刷新时调用 */
    onData?: VCallback<T>;
    /**当子项节点移入视口时调用 */
    onShow?: VCallback<T>;
    /**当子项节点移出视口时调用 */
    onHide?: VCallback<T>;
    /**每帧调用 */
    onUpdate?: (info: IVListItemInfo<T>, dt: number, renderItem?: IRenderItemInfo) => void;
    /**子项节点被点击时调用 */
    onClick?: VCallback<T>;
}
export interface IRenderItemInfo<T = any> {
    /**实际的idx可能为负 */
    realIdx: number;
    /**实际渲染的node（必不为空） */
    node: Node;
    /**循环轮数 */
    loopIdx: number;
    /**通过key速查带有comPrefix的子组件，仅在node不为空时可用 */
    get: ComCapture;
    /**通过key速查带有comPrefix的子节点，仅在node不为空时可用 */
    getNode: NodeCapture;
    /**是否有效，当此渲染项从renderItems中移除时，将设置为false */
    isValid: boolean;
    /**当前渲染项所属的IVListItemInfo */
    info: IVListItemInfo<T>;
}
/**列表数据单位 */
export interface IVListItemInfo<T = any> {
    /**当前索引 */
    idx: number,
    /**分配数据 */
    data: T,
    /**显示节点（分层状态下节点树结构可能会更改，请为子节点名添加前缀并使用get或getNode方法代替node.getChildByPath）
     * 当节点超出视窗时，node可能为null，此时可以用VList.execute()方法安全操作
     * 当勾选isLoop后，该node始终保持为最近更新的渲染项节点
     */
    node: Node,
    /**是否可见，即是否处于视窗内，在循环列表模式下，当renderItems不为空数组时即为true */
    isVisible: boolean;
    /**通过key速查带有comPrefix的子组件，仅在node不为空时可用 */
    get: ComCapture;
    /**通过key速查带有comPrefix的子节点，仅在node不为空时可用 */
    getNode: NodeCapture;
    /**安全对此列表项进行操作,如果指定 realIdx，则只对 realIdx指定的渲染项调用，否则对所有的渲染项调用
    */
    call(cb: VCallback<T>, realIdx?: number): void;
    /**当勾选isLoop后，一条数据项可能对应的多个节点的渲染信息按照刷新顺序排序，越新的渲染项越靠后 */
    renderItems: IRenderItemInfo<T>[]
    /**数据所在的列表组件 */
    list: VList<T>;
    /**当所处列表为其他列表的列表项时，则此字段为当前所处列表在父列表中的列表项信息 */
    parent: IVListItemInfo<any>
}
export enum EListType {
    /**布局模式（没有滚动和视窗限制） */
    Layout,
    /**滚动模式 */
    ScrollList,
    /**分页模式（即以元素为单位进行滚动） */
    Page,
}
export enum EAlignType_Hor {
    /**居中对齐 */
    Center,
    /**左对齐 */
    Left,
    /**右对齐 */
    Right,
}
export enum EAlignType_Ver {
    /**居中对齐 */
    Center,
    /**顶部对齐 */
    Top,
    /**底部对齐 */
    Bottom,
}
export enum EDir {
    Horizontal = 1,
    Vertical = 2,
}
export enum EScrollDir {
    Horizontal = 1,
    Vertical = 2,
    Both = 3,
}
export enum EOverflowDir {
    None = 0,
    Horizontal = 1,
    Vertical = 2,
    Both = 3,
}
export enum EStrechType {
    /**固定行列 */
    Fixed,
    /**固定行列并铺满长宽 */
    ExpandFixed,
    /**超框强制换行 */
    Clamp,
    /**超框强制换行，但铺满长宽 */
    Expand,
    /**溢出无限制 */
    Overflow,
}
@ccclass('VList')
@executeInEditMode
export class VList<T = any> extends Component {
    //#region  vlist args
    @property({ type: Enum(EListType) })
    private _listType: EListType = EListType.ScrollList;
    @property({
        displayName: "列表类型",
        tooltip: "Layout固定视口，ScrollList滑动视口，Page分页视口",
        type: Enum(EListType)
    })
    /**【只读】列表类型 */
    get listType() { return this._listType; }
    private set listType(val) {
        this._listType = val;
        this.onChangeParams();
    }
    @property({ type: Enum(EScrollDir) })
    private _scrollDir: EScrollDir = EScrollDir.Vertical;
    @property({
        displayName: "滚动方向",
        tooltip: "Horizontal水平滚动，Vertical垂直滚动，Both二维全方向滚动",
        type: Enum(EScrollDir),
        visible() { return this.listType != EListType.Layout }
    })
    /**【只读】滚动方向 */
    get scrollDir() { return this._scrollDir; }
    private set scrollDir(val) {
        this._scrollDir = val;
        if (this._listType != EListType.Layout) {
            if (this.scrollDir == EScrollDir.Vertical) {
                this._layoutDir = EDir.Horizontal;
                this._strech_hor = EStrechType.Fixed;
                this._alignType_hor = EAlignType_Hor.Center;
            }
            else if (this.scrollDir == EScrollDir.Horizontal) {
                this._layoutDir = EDir.Vertical;
                this._strech_ver = EStrechType.Fixed;
                this._alignType_ver = EAlignType_Ver.Center;
            }
            else {
                this._strech_hor = EStrechType.Expand;
                this._strech_ver = EStrechType.Expand;
                this._alignType_ver = EAlignType_Ver.Center;
                this._alignType_hor = EAlignType_Hor.Center;
            }
        }
        this.onChangeParams();
        let scrollNode = this.scrollRect;
        let scrollView = scrollNode.getComponent(FixedScrollView);
        scrollView.horizontal = !!(val & 1);
        scrollView.vertical = !!(val & 2);
    }
    @property
    private _showMask: boolean = true;
    @property({ displayName: "预览遮罩", tooltip: "默认在编辑器中应用mask效果，取消勾选则不展示mask效果（不影响运行时开启）", visible() { return !!this.view } })
    private get showMask() { return this._showMask }
    private set showMask(val: boolean) {
        this._showMask = val;
        if (this.view)
            this.view.getComponent(Mask).enabled = this.showMask;
    }
    // @property({ group: { name: "Layout Info", style: "section" } })
    @property
    private _preItemNum: number = 0;
    @property({ displayName: "预览数量", step: 1, min: 0, tooltip: "自动在编辑器中创建指定数量的预览子项，所有预览子项在运行时将被销毁" })
    private get preItemNum() { return this._preItemNum; }
    private set preItemNum(val) { this._preItemNum = val; this.onChangeParams(); }
    @property(Prefab)
    private _itemPrefab: Prefab;
    @property({ displayName: "列表项预制体", tooltip: "子项预制体引用", type: Prefab, group: { name: "列表项设置", style: "tab", id: '0' } })
    /**【只读】列表项预制体 */
    get itemPrefab(): Prefab { return this._itemPrefab; }
    private set itemPrefab(val) {
        this._itemPrefab = val;
        if (val) {
            this.refreshItemCom();
        }
        else {
            this.preItemNum = 0;
            this.comKeyList = [];
            this.comPathList = [];
            this.comShowList = [];
        }
    }


    @property({ displayName: "列表项尺寸", tooltip: "要修改尺寸请在预制体内进行更改", type: Size, group: { name: "列表项设置", style: "tab", id: '0' } })
    /**【只读】列表项预制体原尺寸（要获取运行时实际的列表项尺寸请参考realItemSize） */
    get itemSize(): Size { return this.itemPrefab == null ? new Size(0, 0) : (this.itemPrefab.data as Node).getComponent(UITransform).contentSize; };
    /**根据索引获取列表项的实际尺寸，如果该索引没有记录则返回默认的realItemSize */
    private getItemSize(idx: number): Size {
        if (idx >= 0 && idx < this.itemSizes.length && this.itemSizes[idx]) {
            return this.itemSizes[idx];
        }
        return this.realItemSize;
    }

    @property
    private _comPrefix: string = "_";
    @property({ displayName: "列表项组件前缀", tooltip: "子项中所有节点名称带有此前缀的子节点在运行时都将写入速查表，以供get和getNode方法速查", group: { name: "列表项设置", style: "tab", id: '0' } })
    private get comPrefix() { return this._comPrefix; }
    private set comPrefix(val: string) { if (val != "") { this._comPrefix = val; this.refreshItemCom(); } }
    @property
    private _refreshComList = false;
    @property({ displayName: "刷新列表项组件", tooltip: "列表预制体进行更改后，需要进行此操作以重新扫描和写入子项组件速查表", visible() { return !!this.itemPrefab }, group: { name: "列表项设置", style: "tab", id: '0' } })
    private get refreshComList() { return this._refreshComList };
    private set refreshComList(val: boolean) {
        if (val) {
            this.refreshItemCom();
            log("列表项组件已刷新")
        }
    }
    @property({ readonly: true, displayName: "列表项组件全览", tooltip: "展示该列表以及子项中列表的所有可速查节点，若预制体结构变更，请进行【刷新列表项组件】操作", group: { name: "列表项设置", style: "tab", id: '0' }, visible() { return this.itemPrefab != null }, type: CCString })
    private comShowList: string[] = [];
    @property({ visible() { return false }, type: CCString })
    private comKeyList: string[] = [];
    @property({ visible() { return false }, type: CCString })
    private comPathList: string[] = [];
    @property
    private _isRevertSiblingOrder: boolean = false;
    @property({
        displayName: "反转渲染层级", tooltip: "默认下方子项遮挡上方子项，勾选则相反",
        group: { name: "渲染与循环", style: "tab", id: '0' },
    })
    private get isRevertSiblingOrder() { return this._isRevertSiblingOrder; }
    private set isRevertSiblingOrder(val: boolean) { this._isRevertSiblingOrder = val; this.onChangeParams() }
    @property({
        displayName: "是否分层渲染",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        tooltip: "默认在运行时子项结构被拆散并行渲染便于合批，但重叠时可能导致子节点穿插，取消勾选则运行时保持子项的树状结构"
    })
    private isRenderByLayer: boolean = true;
    /**分层渲染所需要忽略的节点组件 */
    private ignoreComList: (new (...args: any[]) => Component)[] = [Mask, Layout, VListLayerCom, VList];
    @property
    private _isLoop: boolean = false;
    @property({
        displayName: "是否循环",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        visible() { return this.listType != EListType.Layout && this.scrollDir != EScrollDir.Both && (this.scrollDir as number) != (this.layoutDir as number) },
        tooltip: "默认列表滚动超过内容范围时将回弹，勾选后将允许无限滚动并循环显示列表内容",
    })
    private set isLoop(val) {
        this._isLoop = val;
        if (this.scrollDir == EScrollDir.Both)
            this.scrollDir = EScrollDir.Horizontal;
        else
            this.onChangeParams();
    }
    get isLoop() { return this._isLoop && this.listType != EListType.Layout && this.scrollDir != EScrollDir.Both && (this.scrollDir as number) != (this.layoutDir as number); }
    @property({
        displayName: "是否循环",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        visible() { return this.listType != EListType.Layout && this.scrollDir == EScrollDir.Both },
    })
    get banLoopTips() { return "二维列表无法启用循环" }
    @property({
        displayName: "是否循环",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        visible() { return this.listType != EListType.Layout && (this.scrollDir as number) == (this.layoutDir as number) },
    })
    get banLoopTips2() { return "布局方向和滚动方向一致时无法启用循环" }
    @property({
        displayName: "是否循环",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        visible() { return this.listType == EListType.Layout },
    })
    get banLoopTips3() { return "循环仅在列表模式或页面模式下可用" }
    @property
    private _autoFlowSpeed: Vec2 = v2();
    @property({
        displayName: "循环流速",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        visible() { return this.isLoop && this.scrollDir == EScrollDir.Horizontal; },
        tooltip: "循环列表水平方向上自动流动的速度（像素/秒）",
        step: 0.1
    })
    private get autoFlowSpeedX() {
        return this._autoFlowSpeed.x;
    }
    private set autoFlowSpeedX(val: number) {
        this._autoFlowSpeed.x = val;
    }
    @property({
        displayName: "循环流速",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        visible() { return this.isLoop && this.scrollDir == EScrollDir.Vertical; },
        tooltip: "循环列表垂直方向上自动流动的速度（像素/秒）",
        step: 0.1
    })
    private get autoFlowSpeedY() {
        return this._autoFlowSpeed.y;
    }
    private set autoFlowSpeedY(val: number) {
        this._autoFlowSpeed.y = val;
    }
    @property({
        type: Vec2,
        displayName: "循环流速",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        visible() { return this.isLoop && this.scrollDir == EScrollDir.Both; },
        tooltip: "循环列表自动流动的速度（像素/秒）",
        step: 0.1
    })
    private get autoFlowSpeed() {
        return this._autoFlowSpeed;
    }
    private set autoFlowSpeed(val: Vec2) {
        this._autoFlowSpeed = val;
    }
    @property({
        displayName: "循环流动等待时间",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        visible() { return this.isLoop && this.allowTouchScroll && this.autoFlowSpeed.length() > 0.01 },
        tooltip: "触摸滑动后暂停流动的时间",
    })
    flowWaitTime: number = 1;
    @property({
        displayName: "循环流动恢复时间",
        group: { name: "渲染与循环", style: "tab", id: '0' },
        visible() { return this.isLoop && this.allowTouchScroll && this.autoFlowSpeed.length() > 0.01 },
        tooltip: "触摸滑动后恢复流速的时间",
    })
    flowResumeTime: number = 0.5;
    @property
    private _allowTouchScroll: boolean = true;
    @property({
        displayName: "允许触摸滑动",
        tooltip: "默认允许用户滑动列表进行滚动或翻页操作，取消勾选则只可通过代码调用进行滚动或翻页",
        group: { name: "滚动与分页", style: "tab", id: '0' },
        visible() { return this.listType != EListType.Layout }
    })
    /**是否允许滑动翻页 */
    get allowTouchScroll() { return this._allowTouchScroll; }
    set allowTouchScroll(val) { this._allowTouchScroll = val; this.scrollRect && (this.scrollRect.getComponent(FixedScrollView).allowTouch = val); }

    /**当此列表的滚动组件滑动时，所有关联的列表组件将同步滑动进度 */
    @property(Node)
    private _relativeList: Node[] = [];
    @property({
        displayName: "关联列表",
        tooltip: "指定其他VList后，当此列表滑动时，其他VList将同步进行同等比例的滑动",
        type: Node, group: { name: "滚动与分页", style: "tab", id: '0' },
        visible() { return this.listType != EListType.Layout }
    })
    /**【只读】关联列表节点数组 */
    get relativeList() { return this._relativeList; }
    private set relativeList(value: Node[]) {
        let res: Node[] = [];
        for (let i = 0; i < value.length; i++) {
            if (value[i] && !value[i].getComponent(VList)) {
                warn(`节点${value[i].name}没有VList组件`)
            }
            else {
                res.push(value[i]);
            }
        }
        this._relativeList = res;
    }
    @property
    private _uniformRelativeSizeTrigger = false;
    @property({
        displayName: "统一关联尺寸",
        tooltip: "将【关联列表】中所有引用的VList的尺寸设为与此列表相同",
        group: { name: "滚动与分页", style: "tab", id: '0' },
        visible() { return this.listType != EListType.Layout }
    })
    private get uniformRelativeSizeTrigger() { return this._uniformRelativeSizeTrigger; }
    private set uniformRelativeSizeTrigger(value: boolean) {
        if (value) {
            for (let i = 0; i < this.relativeList.length; i++) {
                this.relativeList[i] && this.relativeList[i].getComponent(UITransform).setContentSize(this.trans.contentSize);
            }
            log("所有关联列表已重设为被关联列表的尺寸!");
        }
    }
    @property({
        displayName: "滚动关联",
        group: { name: "滚动与分页", style: "tab", id: '0' },
        visible() { return this.listType == EListType.Layout }
    })
    private get relaticeScrollTips() { return "仅ScrollList和Page模式下有效"; } @property({
        displayName: "页面吸附时间（秒）",
        tooltip: "用户滑动列表时松开后，列表吸附到页面所需要的时间",
        group: { name: "滚动与分页", style: "tab", id: '0' },
        visible() { return this._listType == EListType.Page && this.allowTouchScroll }
    })
    /**（页面模式）页面的吸附时间 */
    snapTime: number = 0.5;
    @property({
        displayName: "翻页速度阈值",
        tooltip: "用户滑动列表时松开时，若此时页面滚动速率大于此值，将直接判定为翻页",
        group: { name: "滚动与分页", style: "tab", id: '0' },
        visible() { return this._listType == EListType.Page && this.allowTouchScroll }
    })
    /**（页面模式）翻页速度阈值 */
    turnSpeedThreshold: number = 200;
    @property({
        displayName: "翻页滚动阈值",
        tooltip: "用户滑动列表时松开且此时页面滚动速率小于【翻页速度阈值】时，若列表位移相对于子项尺寸的比例超过此值，则判定为翻页",
        group: { name: "滚动与分页", style: "tab", id: '0' }, visible() { return this._listType == EListType.Page && this.allowTouchScroll },
        min: 0, max: 1, step: 0.1, slide: true
    })
    /**（页面模式）翻页滚动阈值 */
    scrollThreshold: number = 0.4;
    @property
    private _resizeToItem = false;
    @property({
        displayName: "贴合页面尺寸",
        tooltip: "将此列表的尺寸设为子项根节点的尺寸，即单页的尺寸",
        group: { name: "滚动与分页", style: "tab", id: '0' },
        visible() { return this._listType == EListType.Page }
    })
    private get resizeToItem() { return this._resizeToItem; }
    private set resizeToItem(val) {
        if (val) {
            this.itemPrefab && this.trans.setContentSize(this.itemSize);
        }
    }
    @property
    private _fullPage: boolean = false;
    @property({
        displayName: "单页铺满",
        tooltip: "默认运行时不更改子项的尺寸，勾选则保持在运行时子项尺寸始终与此列表的尺寸一致，主要用于适配",
        group: { name: "滚动与分页", style: "tab", id: '0' },
        visible() { return this.listType == EListType.Page }
    })
    /**【只读】（页面模式）是否单页铺满 */
    get fullPage() { return this._fullPage; }
    private set fullPage(val) { this._fullPage = val; this.onChangeParams(); }
    @property({
        displayName: "页面参数",
        group: { name: "滚动与分页", style: "tab", id: '0' },
        visible() { return this._listType != EListType.Page }
    })
    private get pageParamsTipe() { return "仅在列表类型为Page时可用"; }
    @property
    private _strech_hor = EStrechType.Fixed;
    @property({
        displayName: "水平伸展模式",
        type: Enum(EStrechType),
        tooltip: "Fixed固定列数，ExpandFixed固定列并铺满列表宽度，Clamp逐列布局并自动换行，Expand铺满列表宽度并自动换行，Overflow逐列布局并溢出",
        visible() { return this.listType == EListType.Layout || this.scrollDir != EScrollDir.Horizontal },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**水平伸展模式 */
    get strech_hor() { return this.scrollDir == EScrollDir.Horizontal && this.listType != EListType.Layout ? EStrechType.Overflow : this._strech_hor };
    set strech_hor(val) { this._strech_hor = val; this.onChangeParams(); }
    @property({
        displayName: "水平伸展模式",
        tooltip: "滚动方向为Horizontal时锁定水平伸展模式为OverFlow",
        visible() { return this.listType != EListType.Layout && this.scrollDir == EScrollDir.Horizontal },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**水平伸展模式 */
    get strech_hor_lockTips() { return "Overflow（由滚动方向锁定）" };
    @property
    private _strech_ver = EStrechType.Overflow;
    @property({
        displayName: "垂直伸展模式",
        type: Enum(EStrechType),
        tooltip: "Fixed固定行数，ExpandFixed固定行并铺满列表高度，Clamp逐行布局并自动换列，Expand铺满列表高度并自动换列，Overflow逐行布局并溢出",
        visible() { return this.listType == EListType.Layout || this.scrollDir != EScrollDir.Vertical },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**垂直伸展模式 */
    get strech_ver() { return this.scrollDir == EScrollDir.Vertical && this.listType != EListType.Layout ? EStrechType.Overflow : this._strech_ver };
    set strech_ver(val) { this._strech_ver = val; this.onChangeParams(); }
    @property({
        displayName: "垂直伸展模式",
        tooltip: "滚动方向为Vertical时锁定垂直伸展模式为OverFlow",
        visible() { return this.listType != EListType.Layout && this.scrollDir == EScrollDir.Vertical },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**垂直伸展模式 */
    get strech_ver_lockTips() { return "Overflow（由滚动方向锁定）" };

    @property({ displayName: "水平间距", type: CCString, visible() { return this.strech_hor == EStrechType.ExpandFixed }, group: { name: "伸展", style: "tab", id: '1' } })
    get space_x_tips() { return "ExpandFixed自动计算" }
    @property({ displayName: "垂直间距", type: CCString, visible() { return this.strech_ver == EStrechType.ExpandFixed }, group: { name: "伸展", style: "tab", id: '1' } })
    get space_y_tips() { return "ExpandFixed自动计算" }
    @property
    private _space_x = 0;
    @property({
        displayName: "水平间距",
        tooltip: "子项之间的水平间隔",
        visible() { return this.strech_hor != EStrechType.Expand && this.strech_hor != EStrechType.ExpandFixed },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**水平间距设定值（要获取运行时实际的间距请参考realSpaceX） */
    get space_x() { return this._space_x };
    set space_x(val) { this._space_x = val; this.onChangeParams(); }
    @property
    private _space_y = 0;
    @property({
        displayName: "垂直间距",
        tooltip: "子项之间的垂直间隔",
        visible() { return this.strech_ver != EStrechType.Expand && this.strech_ver != EStrechType.ExpandFixed },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**垂直间距设定值（要获取运行时实际的间距请参考realSpaceY） */
    get space_y() { return this._space_y };
    set space_y(val) { this._space_y = val; this.onChangeParams(); }
    @property
    private _space_min_x = 0;
    @property({
        displayName: "水平最小间距",
        tooltip: "满铺间距小于此值时将换行",
        visible() { return this.strech_hor == EStrechType.Expand },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**列表项并排的水平最小间距（水平伸展模式为Expand时生效） */
    get space_min_x() { return this._space_min_x };
    set space_min_x(val) { this._space_min_x = val; this.onChangeParams(); }
    @property
    private _space_min_y = 0;
    @property({
        displayName: "垂直最小间距",
        tooltip: "满铺间距小于此值时将换列",
        visible() { return this.strech_ver == EStrechType.Expand },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**列表项并列的垂直最小间距（垂直伸展模式为Expand时生效） */
    get space_min_y() { return this._space_min_y };
    set space_min_y(val) {
        this._space_min_y = val;
        this.onChangeParams();
    }

    @property
    private _row: number = 1;
    @property({
        displayName: "行数", step: 1, min: 1,
        tooltip: "子项布局的行数",
        visible() {
            return (this.strech_ver == EStrechType.Fixed || this.strech_ver == EStrechType.ExpandFixed);
        },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**行数设定值（垂直伸展模式为Fixed或ExpandFixed时生效，要获取运行时实际的行数请参考realRow） */
    get row() { return this._row };
    set row(val) { this._row = val; this.onChangeParams(); }
    @property({
        displayName: "行数",
        visible() {
            return (this.strech_ver == EStrechType.Overflow);
        },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    get rowTipsByOverflow() {
        return "垂直伸展overflow时动态变化"
    }
    @property({
        displayName: "行数",
        visible() {
            return (this.strech_ver == EStrechType.Clamp);
        },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    get rowTipsByClamp() {
        return "垂直伸展clamp时换行决定"
    }
    @property
    private _col: number = 1;
    @property({
        displayName: "列数", step: 1, min: 1,
        tooltip: "子项布局的列数",
        visible() {
            return (this.strech_hor == EStrechType.Fixed || this.strech_hor == EStrechType.ExpandFixed);
        },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    /**列数设定值（水平伸展模式为Fixed或ExpandFixed时生效，要获取运行时实际的行数请参考realCol） */
    get col() { return this._col };
    set col(val) { this._col = val; this.onChangeParams(); }
    @property({
        displayName: "列数",
        visible() {
            return (this.strech_hor == EStrechType.Overflow);
        },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    get colTipsByOverflow() {
        return "水平伸展overflow时动态变化"
    }
    @property({
        displayName: "列数",
        visible() {
            return (this.strech_hor == EStrechType.Clamp);
        },
        group: { name: "伸展", style: "tab", id: '1' }
    })
    get colTipsByClamp() {
        return "水平伸展clamp时换列决定"
    }
    @property
    private _layoutDir = EDir.Horizontal;
    @property({
        displayName: "布局方向",
        tooltip: "子项排布时的走向",
        type: Enum(EDir),
        group: { name: "对齐", style: "tab", id: '1' }
    })
    /**列表项布局方向 */
    get layoutDir() { return this._layoutDir };
    set layoutDir(val) { this._layoutDir = val; this.onChangeParams(); }
    @property({
        displayName: "水平对齐",
        type: CCString,
        visible() {
            return this.listType != EListType.Page && this.listType == EListType.ScrollList && !!(this.scrollDir & 1);
        },
        group: { name: "对齐", style: "tab", id: '1' }
    })
    private get alignType_hor_tips() { return "水平滚动列表动态计算" }
    @property
    private _alignType_hor = EAlignType_Hor.Center;
    @property({
        displayName: "水平对齐",
        tooltip: "Left子项整体靠左，Center子项整体居中，Right子项整体靠右",
        type: Enum(EAlignType_Hor),
        visible() {
            return this.listType != EListType.Page && !(this.listType == EListType.ScrollList && this.scrollDir & 1);
        },
        group: { name: "对齐", style: "tab", id: '1' }
    })
    /**水平对齐（页面模式和水平滚动列表不生效） */
    get alignType_hor() { return this._alignType_hor };
    set alignType_hor(val) { this._alignType_hor = val; this.onChangeParams(); }
    @property
    private _isAlignChild_hor: boolean = false;
    @property({
        displayName: "末行对齐",
        tooltip: "最后一行是否单独计算对齐",
        visible() {
            return this.listType != EListType.Page && !(this.listType == EListType.ScrollList && this.scrollDir & 1) && this.layoutDir == EDir.Horizontal;
        },
        group: { name: "对齐", style: "tab", id: '1' }
    })
    /**最后一行是否应用水平对齐（水平对齐有效时生效） */
    get isAlignChild_hor() { return this._isAlignChild_hor; }
    set isAlignChild_hor(val) { this._isAlignChild_hor = val; this.onChangeParams(); }
    @property({
        displayName: "垂直对齐",
        type: CCString,
        visible() {
            return this.listType != EListType.Page && (this.listType == EListType.ScrollList) && !!(this.scrollDir & 2);
        },
        group: { name: "对齐", style: "tab", id: '1' }
    })
    private get alignType_ver_tips() { return "垂直滚动列表动态计算" }
    @property
    private _alignType_ver = EAlignType_Ver.Top;
    @property({
        displayName: "垂直对齐",
        tooltip: "Top子项整体靠上，Center子项整体居中，Bottom子项整体靠下",
        type: Enum(EAlignType_Ver),
        visible() {
            return this.listType != EListType.Page && !(this.listType == EListType.ScrollList && this.scrollDir & 2);
        },
        group: { name: "对齐", style: "tab", id: '1' }
    })
    /**垂直对齐（页面模式和垂直滚动列表不生效） */
    get alignType_ver() { return this._alignType_ver };
    set alignType_ver(val) { this._alignType_ver = val; this.onChangeParams(); }
    @property
    private _isAlignChild_ver: boolean = false;
    @property({
        displayName: "末列对齐",
        tooltip: "最后一列是否单独计算对齐",
        visible() {
            return this.listType != EListType.Page && !(this.listType == EListType.ScrollList && this.scrollDir & 2) && this.layoutDir == EDir.Vertical;
        },
        group: { name: "对齐", style: "tab", id: '1' }
    })
    /**最后一列是否应用垂直对齐（垂直对齐有效时生效） */
    get isAlignChild_ver() { return this._isAlignChild_ver; }
    set isAlignChild_ver(val) { this._isAlignChild_ver = val; this.onChangeParams(); }
    @property({
        displayName: "对齐",
        type: CCString,
        visible() {
            return this.listType == EListType.Page;
        },
        group: { name: "对齐", style: "tab", id: '1' }
    })
    private get banAlignHorTips() { return "Page模式下对齐不可用"; }
    private _layoutInfo: ILayoutInfo = {
        col: 1,
        row: 1,
        size: new Size(1, 1),
        boundSize: new Size(1, 1),
        spaceX: 0,
        spaceY: 0,
        num: 0,
    };
    @property
    private _padding_top: number = 0;
    @property
    private _padding_left: number = 0;
    @property
    private _padding_bottom: number = 0;
    @property
    private _padding_right: number = 0;
    @property({ displayName: "边缘留白", visible() { return this.listType == EListType.Page }, group: { name: "边缘留白", style: "tab", id: "1" } })
    private get tips() { return "页面模式下无法使用边缘留白" }
    @property({
        displayName: "上边留白",
        tooltip: "子项布局时上方预留的空白",
        visible() {
            return this.listType != EListType.Page;
        },
        group: { name: "边缘留白", style: "tab", id: '1' }
    })
    /**上边留白设定值（要获取运行时实际的留白数值请参考realPaddingTop） */
    get padding_top(): number { return this._padding_top };
    set padding_top(val) { this._padding_top = val; this.onChangeParams(); }
    @property({
        displayName: "左边留白",
        tooltip: "子项布局时左边预留的空白",
        visible() {
            return this.listType != EListType.Page;
        },
        group: { name: "边缘留白", style: "tab", id: '1' }
    })
    /**左边留白设定值（要获取运行时实际的留白数值请参考realPaddingLeft） */
    get padding_left() { return this._padding_left };
    set padding_left(val) { this._padding_left = val; this.onChangeParams(); }
    @property({
        displayName: "下边留白",
        tooltip: "子项布局时下方预留的空白",
        visible() {
            return this.listType != EListType.Page;
        },
        group: { name: "边缘留白", style: "tab", id: '1' }
    })
    get padding_bottom() { return this._padding_bottom };
    set padding_bottom(val) { this._padding_bottom = val; this.onChangeParams(); }
    @property({
        displayName: "右边留白",
        tooltip: "子项布局时右边预留的空白",
        visible() {
            return this.listType != EListType.Page;
        },
        group: { name: "边缘留白", style: "tab", id: '1' }
    })
    /**右边留白设定值（要获取运行时实际的留白数值请参考realPaddingRight） */
    get padding_right() { return this._padding_right };
    set padding_right(val) { this._padding_right = val; this.onChangeParams(); }

    /**【只读】运行时实际的布局信息，包括行，列，尺寸，包围盒，间隔 */
    get layoutInfo() { return this._layoutInfo; }
    private _trans: UITransform;
    get trans() {
        if (!this._trans)
            this._trans = this.getComponent(UITransform);
        return this._trans;
    }
    get loopDir() {
        return this.listType == EListType.Layout ? EOverflowDir.None :
            (this.scrollDir as number as EOverflowDir)
    }
    get overflowDir() {
        let hor = this.strech_hor == EStrechType.Overflow ? 1 : 0;
        let ver = this.strech_ver == EStrechType.Overflow ? 2 : 0;
        return (hor + ver) as EOverflowDir;
    }
    @property({ group: { name: "【Readonly】Content Info", style: "section" }, readonly: true, displayName: "滚动偏移" })
    get contentOffset() { return !this.content ? v2() : v2(this.content.position.x, this.content.position.y) }
    @property({ group: { name: "【Readonly】Content Info", style: "section" }, displayName: "实际列数" })
    get realCol() { return this.layoutInfo == null ? 0 : this.layoutInfo.col; }
    @property({ group: { name: "【Readonly】Content Info", style: "section" }, displayName: "实际行数" })
    get realRow() { return this.layoutInfo == null ? 0 : this.layoutInfo.row; }
    @property({ group: { name: "【Readonly】Content Info", style: "section" }, displayName: "实际水平间隔" })
    get realSpaceX() { return this.layoutInfo == null ? 0 : this.layoutInfo.spaceX; }
    @property({ group: { name: "【Readonly】Content Info", style: "section" }, displayName: "实际垂直间隔" })
    get realSpaceY() { return this.layoutInfo == null ? 0 : this.layoutInfo.spaceY; }
    @property({ group: { name: "【Readonly】Content Info", style: "section" }, displayName: "列表项包围盒大小" })
    get realItemSize() { return this.listType == EListType.Page && this.fullPage ? this.trans.contentSize : this.itemSize }
    get layoutSize() { return this.layoutInfo.size; }
    get viewSize() { return this.trans.contentSize; }
    get realPaddingLeft() { return this.listType == EListType.Page ? 0 : this.padding_left; }
    get realPaddingRight() { return this.listType == EListType.Page ? 0 : this.padding_right; }
    get realPaddingTop() { return this.listType == EListType.Page ? 0 : this.padding_top; }
    get realPaddinBottom() { return this.listType == EListType.Page ? 0 : this.padding_bottom; }
    get childAlign_hor() { return !this.isAlignChild_hor || this.listType == EListType.ScrollList && !!(this.scrollDir & 1) || this.layoutDir != EDir.Horizontal ? EAlignType_Hor.Left : this.alignType_hor; }
    get childAlign_ver() { return !this.isAlignChild_ver || this.listType == EListType.ScrollList && !!(this.scrollDir & 2) || this.layoutDir != EDir.Vertical ? EAlignType_Ver.Top : this.alignType_ver; }

    private onChangeParams() {
        this.refreshStruct();
        if (isInEditorMode) {
            this.updateLayout(this.preItemNum);
            for (let i = 0; i < this.preItemNum; i++) {
                let idx = this.isRevertSiblingOrder ? this.preItemNum - i - 1 : i;
                if (this.content.children.length <= i) {
                    let node = instantiate(this.itemPrefab);
                    node.name = `preview_${this.itemPrefab.name}${i}`;
                    node.setParent(this.content);
                    node.position = V3(this.getPosInfo(idx).center);
                }
                else {
                    this.content.children[i].position = V3(this.getPosInfo(idx).center);
                }
                if (this.listType == EListType.Page) {
                    this.content.children[i].getComponent(UITransform).setContentSize(this.realItemSize);
                    this.content.parent.getComponent(UITransform).setContentSize(this.realItemSize);
                }
                this.content.children[i].hasChangedFlags |= TransformBit.TRS;
                this.content.children[i]._objFlags |= CCObject.Flags.EditorOnly;
            }
            let childrenTmp = [...this.content.children]
            for (let i = this.preItemNum; i < childrenTmp.length; i++) {
                childrenTmp[i].destroy();
            }
            this.alignContentPos(true);

        }
        else {
            this.updateLayout(this.infos.length);
            this.infos.forEach(e => this.refreshNodeTrans(e));
            this.alignContentPos(true);
            this.refreshView();
        }
    }

    //锚点为(0,1)
    @property({ type: Node, group: { name: "【Readonly】Node Reference ", style: "section" }, readonly: true })
    private content: Node = null;
    get contentNode() { return this.content; }
    @property({ type: Node, group: { name: "【Readonly】Node Reference ", style: "section" }, readonly: true })
    private view: Node = null;
    get viewNode() { return this.view; }
    @property({ type: Node, group: { name: "【Readonly】Node Reference ", style: "section" }, readonly: true })
    private recycleFolder: Node = null;
    get recycleFolderNode() { return this.recycleFolder; }
    @property({ type: Node, group: { name: "【Readonly】Node Reference ", style: "section" }, readonly: true })
    private scrollRect: Node = null;
    get scrollRectNode() { return this.scrollRect; }
    //#endregion

    //#region runtime args
    //分层时的节点，仅开启分层渲染有用，value中的child包括key所指的根节点
    private itemChildMap: Map<Node, { child: Node, path: string, skipParent: boolean }[]> = new Map();
    private layerMap: Map<string, Node> = new Map()
    private refreshDelayFuncs: Function[] = [];
    private relativeListCom: VList[] = [];
    private get rootLayer() { return this.itemPrefab ? this.layerMap.get(this.itemPrefab.data.name) : null; }

    private executeLock: boolean = false;//防止在foreach的时候更改数组

    /**每个数据索引对应的自定义位置偏移（单位：content本地坐标系，x 右正，y 上正） */
    private itemOffsetMap: Map<number, Vec2> = new Map();
    /**统一作用于所有 item 的全局偏移（单位：content本地坐标系，x 右正，y 上正） */
    private globalOffset: Vec2 = v2();

    private _infos: IVListItemInfo[] = [];
    private _parentInfo: IVListItemInfo<any> = null;
    /**存储每个列表项的实际尺寸 */
    private itemSizes: Size[] = [];
    /**当该列表为嵌套的内部列表时，此字段则为该列表在父列表中所处的列表项信息 */
    get parentInfo() { return this._parentInfo; }
    /**获取当前列表项信息数组，对列表操作的关键数据对象 */
    get infos() { return this._infos as IVListItemInfo<T>[]; }
    /**【只读】获取当前列表数据数组，元素成员可在刷新前进行修改 */
    get datas() { return this.infos.map(e => e.data as T) }
    /**【只读】横向翻动或纵向翻动总数量，由列表项数量决定，仅适用于一维滚动页面列表，否则返回-1 */
    get pageCnt() {
        if (this.listType != EListType.Page)
            return -1;
        if (this.scrollDir == EScrollDir.Horizontal)
            return this.layoutInfo.col;
        else if (this.scrollDir == EScrollDir.Vertical)
            return this.layoutInfo.row;
        else {
            return -1;
        }
    }
    private _pageIdx: number = 0;
    /**【只读】当前页面索引，仅适用于一维页面列表，二维页面索引请参考getLocation()方法，要定位到页面索引请参考focus()和locate()方法 */
    get pageIdx() {
        if (this.scrollDir == EScrollDir.Both) {
            warn("二维页面请使用getLocation！");
            return -1;
        }
        return this._pageIdx;
    }
    /**当前页面信息，仅适用于一维滚动页面列表 */
    get curPageInfo() {
        if (this.listType != EListType.Page)
            return null;
        return this.infos[this.pageIdx];
    }
    /**滚动标准化进度,赋值将不触发scrolling事件和滚动关联，也无法打断循环流动（仅在scroll和page模式下的一维列表可用，二维请使用scrollAnchor） */
    get progress() {
        if (this.listType == EListType.Layout)
            return -1;
        let info = this.layoutInfo;
        let validOffset = v2(this.viewSize.x / 2, -this.viewSize.y / 2).add(this.contentOffset)
        let validSize = this.isLoop ?
            v2(info.boundSize.x + info.spaceX, info.boundSize.y + info.spaceY) :
            v2(info.size.x - this.viewSize.x, info.size.y - this.viewSize.y);
        let x = -validOffset.x / validSize.x;
        let y = validOffset.y / validSize.y;
        if (this.scrollDir == EScrollDir.Horizontal)
            return x;
        else if (this.scrollDir == EScrollDir.Vertical)
            return y;
        else
            return -1;
    }
    set progress(val: number) {
        if (this.listType == EListType.Layout)
            return;
        let info = this.layoutInfo;
        let com = this.scrollRect.getComponent(FixedScrollView);
        com.stopAutoScroll();
        let validSize = this.isLoop ?
            v2(info.boundSize.x + info.spaceX, info.boundSize.y + info.spaceY) :
            v2(info.size.x - this.viewSize.x, info.size.y - this.viewSize.y);
        let offsetProcess = validSize;
        if (this.scrollDir == EScrollDir.Horizontal)
            offsetProcess.x *= val;
        else if (this.scrollDir == EScrollDir.Vertical)
            offsetProcess.y *= val;
        else
            return;
        let validOffset = v3(-offsetProcess.x - this.viewSize.x / 2, offsetProcess.y + this.viewSize.y / 2, 0);
        this.content.setPosition(validOffset);
        this.alignContentPos();
        this.refreshView();
    }
    /**滚动标准化锚点,赋值将不触发scrolling事件（仅在scroll和page模式下的二维列表可用，一维请使用progress） */
    get scrollAnchor() {
        if (this.listType == EListType.Layout)
            return v2(-1, -1);
        let com = this.scrollRect.getComponent(FixedScrollView);
        return com.scrollAnchor;
    }
    set scrollAnchor(val: Vec2) {
        if (this.listType == EListType.Layout)
            return;
        let com = this.scrollRect.getComponent(FixedScrollView);
        com.scrollTo(val);
        this.refreshView()
    }
    /**当前是否正在自动循环流动 */
    get isInFlow() { return Math.abs(this.autoFlowSpeedX) + Math.abs(this.autoFlowSpeedY) > 0.01 && this.flowTimer <= this.flowResumeTime }
    private flowTimer: number = 0;
    private realFlowSpeed: Vec2 = v2();
    /**当前的自动循环流速（二维方向） */
    get flowSpeed_v() { return this.realFlowSpeed; }
    /**当前的自动循环流速 */
    get flowSpeed() {
        if (this.scrollDir == EScrollDir.Horizontal)
            return this.realFlowSpeed.x;
        else if (this.scrollDir == EScrollDir.Vertical)
            return this.realFlowSpeed.y;
        return 0;
    }
    set flowSpeed(val: number) {
        if (this.scrollDir == EScrollDir.Horizontal)
            this.autoFlowSpeedX = val;
        else if (this.scrollDir == EScrollDir.Vertical)
            this.autoFlowSpeedY = val;
    }


    private nodePools: Node[] = [];
    private registerInfos: IRegisterInfo[] = [];
    /**子项生命周期回调（更改只影响后续调用） */
    cb: IVListItemHooks<T> = {}


    //#endregion
    private refreshItemCom() {
        let trans = this.itemPrefab.data.getComponent(UITransform) as UITransform;
        if (!trans)
            error("itemPrefab没有UITransform组件！");
        else if (trans.anchorPoint.x != 0.5 || trans.anchorPoint.y != 0.5) {
            warn("itemPrefab的anchorPoint不在中心！");
        }
        if (this.listType == EListType.Page && this.content) {
            this.content.parent.getComponent(UITransform).setContentSize(this.realItemSize);
        }
        let node = this.itemPrefab.data as Node;
        this.comKeyList = [];
        this.comPathList = [];
        this.comShowList = [];
        let subLists: VList[] = [];
        let scan = (n: Node, path: string = "") => {
            let subList = n.getComponent(VList);
            if (!subList)
                for (let i = 0; i < n.children.length; i++) {
                    let c = n.children[i]
                    if (c.name.startsWith(this.comPrefix)) {
                        let renderCom = c.getComponent(UIRenderer);
                        if (renderCom)
                            this.comShowList.push(`${renderCom.name}`);
                        else
                            this.comShowList.push(`${c.name}<Node>`)
                        this.comKeyList.push(c.name)
                        this.comPathList.push(`${path}${c.name}`)
                    }
                    scan(c, `${path}${c.name}/`);
                }
            else if (subList.itemPrefab) {
                subLists.push(subList);
                subList.refreshItemCom();
            }
        }
        scan(node);
        while (subLists.length > 0) {
            let list = subLists.shift();
            this.comShowList.push(...list.comShowList.map(e => list.node.name + " / " + e));
        }
    }
    /**将content坐标系下的本地坐标lp转为世界坐标并返回 */
    lp2wp(lp: Vec3) {
        return this.content.getComponent(UITransform).convertToWorldSpaceAR(lp);
    }
    /**将世界坐标wp转为content坐标系下的本地坐标并返回 */
    wp2lp(wp: Vec3) {
        return this.content.getComponent(UITransform).convertToNodeSpaceAR(wp);
    }
    private onInitRegister() {
        log("register")
        // this.node.on(NodeEventType.SIZE_CHANGED, this.onChangeParams, this);
        this.node.on(NodeEventType.SIZE_CHANGED, () => {
            this.waitExecute(() => this.onChangeParams());
        }, this);
        if (this.scrollRect && this.scrollRect.isValid) {
            this.scrollRect.on(FixedScrollView.EventType.SCROLLING, this.onScrolling, this);
            this.scrollRect.on(FixedScrollView.EventType.SCROLL_BEGAN, this.onScrollStart, this);
            this.scrollRect.on(FixedScrollView.EventType.TOUCH_UP, this.onScrollEnd, this);
            this.scrollRect.on(FixedScrollView.FINISH_AUTO_SCROLL, this.onScrollFinish, this);
        }
    }
    private onScrolling() {
        this.refreshView();
        if (this.listType == EListType.Layout)
            return;
        for (let i = 0; i < this.relativeListCom.length; i++) {
            let target = this.relativeListCom[i];
            if (target.listType == EListType.Layout)
                return;
            if (target.scrollDir == EScrollDir.Both || this.scrollDir == EScrollDir.Both)
                target.scrollAnchor = this.scrollAnchor;
            else
                target.progress = this.progress;

        }
        this.node.emit(VListEvent.OnScrolling);

    }
    private onScrollFinish() {
        if (this.listType == EListType.Page) {
            let idx = this.getFocus();
            let posInfo = this.getPosInfo(idx).center;
            this.content.position = v3(-posInfo.x, -posInfo.y, 0);
        }
    }
    private clearPool() {
        if (this.recycleFolder && this.recycleFolder.isValid)
            [...this.recycleFolder.children].forEach(e => {
                this.cb.onDestroy && this.cb.onDestroy({
                    get: <K extends Component>(key: string, ctor: new () => K) => {
                        return this.getItemComByKey(e, key, ctor) as K;
                    },
                    getNode: (key: string) => {
                        return this.getItemComByKey(e, key, null) as Node;
                    },
                    list: this,
                    parent: this.parentInfo,
                    node: e
                })
                e.destroy();
                this.itemChildMap.delete(e);
            });
        this.nodePools = [];
    }
    /**清空列表数据和回调以及注册信息 */
    clearAll() {
        this.clearList();
        this.itemChildMap.clear();
        this.clearPool();
        this.registerInfos = [];
        this.cb = {};
    }
    /**清空列表数据 */
    clearList() {
        this.recycleAll();
        this._infos = [];
        this._parentInfo = null;
        this.refreshDelayFuncs = [];
        this.itemSizes = [];
    }
    private isInited: boolean = false;
    /**初始化方法 */
    init(itemCallback: IVListItemHooks<T>) {
        this.isInited = true;
        this.cb = itemCallback;
        if (this.isRenderByLayer && this.itemPrefab) {
            this.layerMap.clear();
            let root = this.itemPrefab.data as Node;
            let scan = (n: Node, path: string = "", position = v3()) => {
                let curPath = `${path}${n.name}`;
                let node = new Node(curPath);
                let trans = node.addComponent(UITransform);
                node.setParent(this.content);
                trans.anchorPoint = v2(0, 1);
                node.position = position;
                this.layerMap.set(curPath, node);
                if (!n.getComponent(VList))
                    if (!this.ignoreComList.some(m => n.getComponent(m)))
                        for (let i = 0; i < n.children.length; i++) {
                            let c = n.children[i]
                            scan(c, `${curPath}-`, v3(position.x + c.position.x, position.y + c.position.y, position.z));
                        }
            }
            scan(root);
        }
        this.relativeListCom = this.relativeList.map(e => !!e ? e.getComponent(VList) : null).filter(e => e && !!e.scrollRect);
        this.realFlowSpeed = this.autoFlowSpeed;
        this.isInited = true;
    }
    pauseFlow() {
        if (!this.isLoop)
            return;
        this.flowTimer = this.flowWaitTime + this.flowResumeTime;
    }
    private getRenderItemInfo(realIdx: number, node: Node, info: IVListItemInfo<T>) {
        let item: IRenderItemInfo<T> = {
            realIdx,
            loopIdx: Math.floor(realIdx / this.layoutInfo.num),
            node,
            get: <K extends Component>(key: string, ctor: new () => K) => {
                return this.getItemComByKey(node, key, ctor) as K;
            },
            getNode: (key: string) => {
                return this.getItemComByKey(node, key, null) as Node;
            },
            info,
            isValid: true
        }
        return item;
    }
    private getInfoByData(data: T, idx: number) {
        let info: IVListItemInfo<T> = {
            idx: idx,
            data: data,
            node: null,
            renderItems: [],
            get: null,
            getNode: null,
            call: null,
            isVisible: false,
            list: this,
            parent: this.parentInfo,
        };
        info.get = <K extends Component>(key: string, ctor: new () => K) => {
            return this.getItemComByKey(info.node, key, ctor) as K;
        };
        info.getNode = (key: string) => {
            return this.getItemComByKey(info.node, key, null) as Node;
        }
        info.call = (cb: VCallback<T>, realIdx: number | "all" = "all") => {
            if (realIdx == "all")
                info.renderItems.forEach(e => cb(info, e));
            else {
                let item = info.renderItems.find(e => e.realIdx == realIdx);
                if (item) {
                    cb(info, item);
                }
            }
        }
        return info;
    }
    /**对列表按照compare规则进行排序并刷新 */
    sort(compare: (a: IVListItemInfo<T>, b: IVListItemInfo<T>) => number) {
        this.infos.sort(compare).forEach((e, i) => {
            e.idx = i;
            this.refreshNodeTrans(e)
        });
        this.refreshList();
    }
    /**对列表传入data数据列表并立即执行渲染刷新，若ignoreReset为false则列表刷新后将滚动到一开始的位置，否则不滚动 */
    setData(datas: T[], parentInfo: IVListItemInfo<any> = null, ignoreReset: boolean = false) {
        if (!this.isInited) {
            this.init({});
            return;
        }
        if (!datas)
            return;
        if (this.scrollRect) {
            this.scrollRect.getComponent(FixedScrollView).stopAutoScroll();
        }
        this._parentInfo = parentInfo;
        this.refreshStruct();
        let exeFunc = () => {
            this.recycleAll();
            this.refreshDelayFuncs = [];
            // 初始化 itemSizes 数组，先使用默认尺寸
            this.itemSizes = new Array(datas.length);
            // 为每个数据创建临时节点以获取实际尺寸（如果需要）
            // 这里先创建节点获取尺寸，然后记录到 itemSizes 中
            for (let i = 0; i < datas.length; i++) {
                let tempInfo = this.getInfoByData(datas[i], i);
                let tempNode = instantiate(this.itemPrefab);
                // 如果使用分层渲染，需要设置尺寸
                if (this.isRenderByLayer) {
                    tempNode.getComponent(UITransform).setContentSize(this.realItemSize);
                }
                // 获取节点的实际尺寸
                let nodeSize = tempNode.getComponent(UITransform).contentSize.clone();
                this.itemSizes[i] = nodeSize;
                tempNode.destroy();
            }
            this._infos = datas.map((e, i) => this.getInfoByData(e, i));
            this.updateLayout(datas.length);
            this.alignContentPos(!ignoreReset);
            this.refreshView();
            let location = this.getLocation();
            if (this.scrollDir != EScrollDir.Both)
                this._pageIdx = this.scrollDir == EScrollDir.Horizontal ? location.x : location.y;
        }
        if (this.executeLock) {
            this.waitExecute(exeFunc);
        }
        else {
            exeFunc();
        }
    }
    /**安全地向列表中insertIdx位置插入数据data并刷新，若insertIdx为null则在列表末尾插入。如果返回false，则表示该插入和刷新操作需等待exePromise后完成，否则表示操作立即完成 */
    addData(data: T, insertIdx: number | "none" = "none"): boolean {
        let exeFunc = () => {
            let cnt = this.infos.length;
            // 创建临时节点获取尺寸
            let tempNode = instantiate(this.itemPrefab);
            if (this.isRenderByLayer) {
                tempNode.getComponent(UITransform).setContentSize(this.realItemSize);
            }
            let nodeSize = tempNode.getComponent(UITransform).contentSize.clone();
            tempNode.destroy();
            
            if (insertIdx == "none" || insertIdx >= cnt) {
                let newInfo = this.getInfoByData(data, cnt);
                this.infos.push(newInfo);
                this.itemSizes.push(nodeSize);
            }
            else {
                if (insertIdx < 0)
                    insertIdx = 0;
                let newInfo = this.getInfoByData(data, insertIdx);
                let after = [...this.infos].slice(insertIdx);
                let before = [...this.infos].slice(0, insertIdx);
                this._infos = before.concat(newInfo).concat(after);
                // 在itemSizes中插入对应的尺寸
                this.itemSizes.splice(insertIdx, 0, nodeSize);
            }
            this.infos.forEach((e, i) => {
                e.idx = i;
            })
            this.updateLayout(this.infos.length);
            this.infos.forEach(e => this.refreshNodeTrans(e));
            this.alignContentPos();
            this.refreshView();
        }
        if (this.executeLock) {
            this.waitExecute(exeFunc);
            return false;
        }
        else {
            exeFunc();
            return true;
        }
    }
    /**安全地向列表中删除数据为data的列表项，如果返回false，则表示该操作需等待exePromise后完成，否则表示操作立即完成 */
    deleteData(data: T) {
        let idx = this.infos.findIndex(e => e.data == data);
        if (idx < 0)
            return true;
        return this.deleteIdx(idx)
    }
    /**安全地向列表中删除索引为infoIdx的数据和列表项，如果返回false，则表示该操作需等待exePromise后完成，否则表示操作立即完成
     * （此方法只用于删除单条数据，如果要从index数组中批量删除数据，请使用deleteIndices） */
    deleteIdx(infoIdx: number) {
        if (infoIdx < 0 || infoIdx >= this.infos.length)
            return;
        let exeFunc = () => {
            let info = this.infos[infoIdx];
            this.recycleAllNode(info);
            this.infos.splice(infoIdx, 1);
            // 同时删除对应的尺寸记录
            if (infoIdx >= 0 && infoIdx < this.itemSizes.length) {
                this.itemSizes.splice(infoIdx, 1);
            }
            this.infos.forEach((e, i) => {
                e.idx = i;
            })
            this.updateLayout(this.infos.length);
            this.infos.forEach(e => this.refreshNodeTrans(e));
            this.alignContentPos();
            this.refreshView();
        }
        if (this.executeLock) {
            this.waitExecute(exeFunc);
            return false;
        }
        else {
            exeFunc();
            return true;
        }
    }
    /**批量删除列表项，防止多次调用deleteIdx时导致索引错位的问题 */
    deleteIndices(infoIndices: number[]) {
        if (infoIndices.length == 0)
            return true;
        let exeFunc = () => {
            let delInfos: IVListItemInfo<T>[] = [];
            let remainInfos: IVListItemInfo<T>[] = [];
            this.infos.forEach(e => {
                if (infoIndices.indexOf(e.idx) >= 0)
                    delInfos.push(e);
                else
                    remainInfos.push(e)
            })
            delInfos.forEach(e => this.recycleAllNode(e));
            this._infos = remainInfos;
            // 删除对应的尺寸记录（需要按索引从大到小删除，避免索引错位）
            let sortedIndices = [...infoIndices].sort((a, b) => b - a);
            sortedIndices.forEach(idx => {
                if (idx >= 0 && idx < this.itemSizes.length) {
                    this.itemSizes.splice(idx, 1);
                }
            });
            this.infos.forEach((e, i) => {
                e.idx = i;
            })
            this.updateLayout(this.infos.length);
            this.infos.forEach(e => this.refreshNodeTrans(e));
            this.alignContentPos();
            this.refreshView();
        }
        if (this.executeLock) {
            this.waitExecute(exeFunc);
            return false;
        }
        else {
            exeFunc();
            return true;
        }

    }
    /**返回等待所有操作执行完毕的promise（一帧延迟） */
    exePromise() {
        return new Promise<void>((resolve) => {
            if (!this.executeLock)
                resolve();
            else
                this.waitExecute(resolve);
        })
    }
    /**刷新数据索引为infoIdx的所有渲染项，若指定realIdx，则只刷新realIdx对应的渲染项 */
    refreshItem(infoIdx: number, realIdx: number | "all" = "all") {
        if (!this.infos || infoIdx < 0 || infoIdx >= this.infos.length)
            return;
        let info = this.infos[infoIdx];
        if (realIdx == "all") {
            info.renderItems.forEach(e => {
                info.node = e.node;
                this.cb.onData && this.cb.onData(info, e)
            });
        }
        else {
            let renderItem = info.renderItems.find(e => e.realIdx == realIdx);
            if (renderItem) {
                info.node = renderItem.node;
                this.cb.onData && this.cb.onData(info, renderItem);
            }
        }
    }
    /**强制更新列表项尺寸并重新布局
     * 遍历所有已渲染的节点，获取它们的实际尺寸，更新itemSizes数组，然后重新计算布局并刷新视图
     * 这个方法应该在列表数据设置完成并且节点已经渲染后调用，用于确保列表使用节点的实际尺寸进行布局
     */
    updateItemSizes() {
        if (!this.isInited || this.infos.length == 0) {
            warn("列表未初始化或没有数据，无法更新尺寸");
            return;
        }
        let exeFunc = () => {
            let hasUpdate = false;
            // 遍历所有infos，更新已渲染节点的尺寸
            for (let i = 0; i < this.infos.length; i++) {
                let info = this.infos[i];
                // 如果节点已渲染，获取实际尺寸
                if (info.node && info.node.isValid && info.isVisible) {
                    let actualSize = info.node.getComponent(UITransform).contentSize.clone();
                    // 如果尺寸发生变化，更新itemSizes
                    if (!this.itemSizes[i] || 
                        this.itemSizes[i].width != actualSize.width || 
                        this.itemSizes[i].height != actualSize.height) {
                        if (!this.itemSizes[i]) {
                            this.itemSizes[i] = new Size();
                        }
                        this.itemSizes[i].width = actualSize.width;
                        this.itemSizes[i].height = actualSize.height;
                        hasUpdate = true;
                    }
                } else {
                    // 如果节点未渲染，但itemSizes中有记录，保持原尺寸
                    // 如果没有记录，使用默认尺寸
                    if (!this.itemSizes[i]) {
                        this.itemSizes[i] = this.realItemSize.clone();
                        hasUpdate = true;
                    }
                }
            }
            // 确保itemSizes数组长度与infos一致
            while (this.itemSizes.length < this.infos.length) {
                this.itemSizes.push(this.realItemSize.clone());
                hasUpdate = true;
            }
            // 如果有更新，重新计算布局
            if (hasUpdate) {
                this.updateLayout(this.infos.length);
                this.infos.forEach(e => this.refreshNodeTrans(e));
                this.alignContentPos();
                this.refreshView();
            }
        }
        if (this.executeLock) {
            this.waitExecute(exeFunc);
        }
        else {
            exeFunc();
        }
    }
    /**为列表中所有列表项速查名为key的子节点并注册事件{nodeEvent,func,target}，当key为""时为列表项渲染节点本身注册事件。该方法将保证事件触发时得到的实参数据与触发的列表项正确对应，注意VList不支持同一个节点同一个event注册多个回调 */
    register(key: string, nodeEvent: string, func: VCallback<T>, target?: any) {
        let uniKey = `this/${key}_${nodeEvent}`;
        let registerInfo: IRegisterInfo = {
            uniKey,
            evtId: nodeEvent,
            callback: func.bind(target),
            key: key
        }
        this.registerInfos.push(registerInfo);
        this.infos.forEach(e => e.renderItems.forEach(f => this.registerNodeEvt(e, f, registerInfo)));
    }
    /**为列表中所有列表项速查名为key的子节点并注销事件nodeEvent */
    unregister(key: string, nodeEvent: string) {
        let uniKey = `this/${key}_${nodeEvent}`;
        let index = this.registerInfos.findIndex(e => e.uniKey == uniKey);
        if (index < 0)
            return;
        let registerInfo = this.registerInfos[index];
        this.infos.forEach(e => e.renderItems.forEach(f => this.unregisterNodeEvt(e, f, registerInfo)));
        this.registerInfos.splice(index, 1);
    }
    private registerNodeEvt(info: IVListItemInfo<T>, renderItemInfo: IRenderItemInfo<T>, registerInfo: IRegisterInfo) {
        let node = registerInfo.key == "" ? renderItemInfo.node : renderItemInfo.getNode(registerInfo.key);
        let cb = node[`custom_event_${registerInfo.uniKey}`] = () => registerInfo.callback(info);
        node.on(registerInfo.evtId, cb, this);

    }
    private unregisterNodeEvt(info: IVListItemInfo, renderItemInfo: IRenderItemInfo<T>, registerInfo: IRegisterInfo) {
        let node = registerInfo.key == "" ? renderItemInfo.node : renderItemInfo.getNode(registerInfo.key);
        node.off(registerInfo.evtId, node[`custom_event_${registerInfo.uniKey}`], this);
    }
    /**等同于node.getChildByPath(path)，但在分层模式中列表项结构被打散后依然可用 */
    getChildByPath(node: Node, path: string) {
        return this.getChildByPath_native(node, path);
    }
    private getChildByPath_native(node: Node, path: string, hasHead: boolean = false) {
        if (!this.isRenderByLayer)
            return node.getChildByPath(path);
        else {
            let children = this.itemChildMap.get(node);
            if (!children)
                return null;
            let childInfo = children.find(e => e.path == (hasHead ? path : `${this.rootLayer.name}/${path}`));
            if (!childInfo) {
                error(`${this.node.name}找不到子项路径${path}，请尝试刷新列表项组件！`);
                return null;
            }
            return childInfo.child;
        }
    }
    private getItemComByKey(node: Node, key: string, comType: new (...args: any[]) => Component) {
        if (!node)
            return null;
        let pathIdx = this.comKeyList.findIndex(e => e == key);
        if (pathIdx < 0) {
            error(`在列表${this.node.name}的列表项${this.itemPrefab.name}中找不到子节点${key}，请检查预制体或尝试刷新列表项组件!`);
            return null;
        }
        let path = this.comPathList[pathIdx];
        let targetNode = this.getChildByPath_native(node, path);
        if (comType == null)
            return targetNode;
        else {
            let com = targetNode.getComponent(comType);
            if (!com) {
                error(`在列表${this.node.name}的列表项${this.itemPrefab.name}中${path}没有${comType.name}组件`);
                return null;
            }
            return com;
        }
    }
    private refreshNodeTrans(info: IVListItemInfo) {
        if (!info.node || !info.isVisible)
            return;
        for (let i = 0; i < info.renderItems.length; i++) {
            let item = info.renderItems[i];
            let pos = V3(this.getPosInfo(item.realIdx).center);
            let itemSize = this.getItemSize(info.idx);
            if (!this.isRenderByLayer) {
                item.node.position = pos;
                let wid = item.node.getComponent(Widget);
                if (wid) {
                    wid.updateAlignment();
                    // 移动端运行时，Widget 会在布局阶段重设位置，禁用以避免覆盖我们计算的位置
                    wid.enabled = false;
                }
                // 更新节点尺寸为实际记录的尺寸
                item.node.getComponent(UITransform).setContentSize(itemSize);
            }
            else {
                let getParentPath = (path: string) => {
                    const lastSlashIndex = path.lastIndexOf('/');
                    if (lastSlashIndex === -1) return path; // 如果没有 '/'，返回原字符串
                    return path.substring(0, lastSlashIndex);
                }
                item.node.getComponent(UITransform).setContentSize(itemSize);
                let children = this.itemChildMap.get(item.node);
                children.forEach(e => {
                    if (e.skipParent)
                        return;
                    let widget = e.child.getComponent(Widget);
                    if (e.child != item.node && widget) {
                        let parentTrans = this.getChildByPath_native(item.node, getParentPath(e.path), true).getComponent(UITransform);
                        let childTrans = e.child.getComponent(UITransform);
                        let res = WidgetUtils.align(parentTrans, e.child.getComponent(UITransform));
                        childTrans.setContentSize(res.size);
                    }

                    e.child.setParent(this.layerMap.get(e.path.replace(/\//g, "-")));
                    e.child.position = pos;
                });
            }
            // 在节点创建后更新记录的尺寸（如果节点尺寸发生变化）
            if (item.node.isValid) {
                let currentSize = item.node.getComponent(UITransform).contentSize.clone();
                this.itemSizes[info.idx] = currentSize;
            }
        }
    }
    /**
     * 设置指定数据索引的额外位置偏移（不会修改布局，只在渲染定位时叠加）。
     * 注意：索引为当前 infos 的索引；当数据增删或排序后，需重新设置。
     * @param infoIdx 数据索引（非 realIdx）
     * @param offset 偏移向量，x 向右为正，y 向上为正
     */
    public setItemOffset(infoIdx: number, offset: Vec2) {
        if (infoIdx < 0 || infoIdx >= this.infos.length) return;
        this.itemOffsetMap.set(infoIdx, v2(offset.x, offset.y));
        // 立即刷新视图以生效
        this.refreshView(true);
    }
    /**
     * 获取指定数据索引的偏移量，未设置则返回 (0,0)
     */
    public getItemOffset(infoIdx: number): Vec2 {
        let off = this.itemOffsetMap.get(infoIdx);
        return off ? v2(off.x, off.y) : v2();
    }
    /**
     * 清除偏移。传入索引仅清除该项；不传则清除全部。
     */
    public clearItemOffset(infoIdx?: number) {
        if (infoIdx == null) this.itemOffsetMap.clear();
        else this.itemOffsetMap.delete(infoIdx);
        this.refreshView(true);
    }
    /**
     * 一次性移动所有 item：为列表设置统一偏移量。
     * 建议用于整体平移，不影响布局计算，仅在渲染定位时叠加。
     */
    public setAllItemsOffset(offset: Vec2) {
        this.globalOffset = v2(offset.x, offset.y);
        this.refreshView(true);
    }
    /**获取全局偏移 */
    public getAllItemsOffset(): Vec2 { return v2(this.globalOffset.x, this.globalOffset.y); }
    /**清除全局偏移（等价于 setAllItemsOffset(v2())） */
    public clearAllItemsOffset() { this.globalOffset = v2(); this.refreshView(true); }
    private getNode(info: IVListItemInfo) {
        if (!this.content) {
            console.error("没有content节点");
            return;
        }
        let res: Node;
        if (!this.isRenderByLayer) {
            if (this.nodePools.length > 0) {
                res = this.nodePools.pop();
                res.setParent(this.content);
            }
            else {
                res = instantiate(this.itemPrefab);
                res.setParent(this.content);
                let initInfo = {
                    get: info.get,
                    getNode: info.getNode,
                    list: this,
                    parent: info.parent,
                    node: res
                }
                this.refreshDelayFuncs.push(() => (this.cb.onInstantiate && this.cb.onInstantiate(initInfo)));
            }
        }
            else {
            if (this.nodePools.length > 0) {
                res = this.nodePools.pop();
                let children = this.itemChildMap.get(res);
                children.forEach(e => {
                    if (e.skipParent)
                        return;
                    e.child.setParent(this.layerMap.get(e.path.replace(/\//g, "-")));
                });
            }
            else {
                res = instantiate(this.itemPrefab);
                let itemSize = info.idx >= 0 && info.idx < this.itemSizes.length && this.itemSizes[info.idx] 
                    ? this.itemSizes[info.idx] 
                    : this.realItemSize;
                res.getComponent(UITransform).setContentSize(itemSize);
                let childrenData: { child: Node, path: string, skipParent: boolean }[] = [];
                this.itemChildMap.set(res, childrenData);
                let scan = (n: Node, path: string = "", isSkipParent: boolean) => {
                    let curPath = `${path}${n.name}`;
                    childrenData.push({ child: n, path: curPath, skipParent: isSkipParent });
                    let childSkipParent = isSkipParent || this.ignoreComList.some(m => n.getComponent(m));
                    if (!n.getComponent(VList))
                        for (let i = 0; i < n.children.length; i++) {
                            let c = n.children[i]
                            scan(c, `${curPath}/`, childSkipParent);
                        }
                }
                scan(res, "", false);
                childrenData.forEach(d => {
                    if (d.skipParent)
                        return;
                    let n = d.child;
                    let p = d.path;
                    let wgt = n.getComponent(Widget);
                    if (wgt) {
                        wgt.updateAlignment();
                        wgt.enabled = false;
                    }
                    n.setParent(this.layerMap.get(p.replace(/\//g, "-")))
                })
                let initInfo = {
                    get: info.get,
                    getNode: info.getNode,
                    list: this,
                    parent: info.parent,
                    node: res
                }
                this.refreshDelayFuncs.push(() => (this.cb.onInstantiate && this.cb.onInstantiate(initInfo)));
            }

        }
        return res;
    }
    private initRenderItem(renderItem: IRenderItemInfo<T>) {
        renderItem.node['custom_event_onClick'] = () => this.cb.onClick && this.cb.onClick(renderItem.info, renderItem);
        renderItem.node.on(Node.EventType.TOUCH_END, renderItem.node['custom_event_onClick'], this);
        this.registerInfos.forEach(e => this.registerNodeEvt(renderItem.info, renderItem, e));

    }
    /**将渲染项索引idx转换为该渲染项在布局中的二维坐标（左上为原点）并返回 */
    idx2crd(realIdx: number) {
        if (isInEditorMode)
            realIdx = clamp(realIdx, 0, this.preItemNum - 1)
        else if (!this.isLoop)
            realIdx = clamp(realIdx, 0, this.layoutInfo.num - 1);
        if (this.layoutDir == EDir.Vertical)
            return v2(Math.floor(realIdx / this.realRow), realIdx % this.realRow);
        else
            return v2(Math.floor(realIdx / this.realCol), realIdx % this.realCol);
    }
    /**将渲染项在布局中的二维坐标crd转换为该渲染项的realIdx并返回 */
    crd2idx(crd: Vec2) {
        let c = this.isLoop ? crd.x : clamp(crd.x, 0, this.realCol - 1);
        let r = this.isLoop ? crd.y : clamp(crd.y, 0, this.realRow - 1);
        if (this.layoutDir == EDir.Vertical)
            return c * this.realRow + r;
        else
            return r * this.realCol + c;
    }
    /**将列表当前滚动进度progress转化为此时视窗中心元素的realIdx（仅一维列表或一维页面有效） */
    progress2idx(progress: number) {
        if (this.listType == EListType.Layout || this.scrollDir == EScrollDir.Both)
            return -1;
        let lp = v2();
        let loopSize = v2(this.layoutInfo.boundSize.x + this.realSpaceX, this.layoutInfo.boundSize.y + this.realSpaceY);
        if (this.scrollDir == EScrollDir.Horizontal) {
            // lp.x = this.isLoop ? - progress * (this.layoutInfo.size.width + this.layoutInfo.spaceX) - this.viewSize.width / 2 :
            //     progress * (this.viewSize.width - this.layoutInfo.size.width) - this.viewSize.width / 2;
            lp.x = this.isLoop ? -progress * loopSize.x - this.viewSize.width / 2 :
                progress * (this.viewSize.width - this.layoutInfo.size.x) - this.viewSize.width / 2
            lp.y = -this.contentOffset.y;
        }
        else {
            lp.y = this.isLoop ? progress * loopSize.y + this.viewSize.height / 2 :
                progress * (this.viewSize.height - this.layoutInfo.size.height) + this.viewSize.height / 2;
            lp.x = -this.contentOffset.x;
        }

        return this.testItemIdxByLp(lp);
    }
    /**指定的realIdx转化为其渲染项在视口中心时列表的progress（仅一维列表或一维页面有效） */
    idx2progress(realIdx: number) {
        if (this.listType == EListType.Layout || this.scrollDir == EScrollDir.Both)
            return -1;
        let lp = this.getPosInfo(realIdx).center;
        let contentSize = v2(this.layoutInfo.boundSize.x + this.realSpaceX, this.layoutInfo.boundSize.y + this.realSpaceY);
        if (this.scrollDir == EScrollDir.Horizontal) {
            return this.isLoop ? (lp.x - this.viewSize.width / 2) / contentSize.x :
                (lp.x - this.viewSize.width / 2) / (this.layoutInfo.size.x - this.viewSize.width / 2);
        }
        else {
            return this.isLoop ? -(lp.y + this.viewSize.y / 2) / contentSize.y :
                (lp.y + this.viewSize.y / 2) / (this.viewSize.height - this.layoutInfo.size.y);
        }

    }
    /**返回当前列表中心聚焦的位置在整个布局中的偏移向量（以realItemSize.xy+layout.spaceXY为单位） */
    getVec() {
        let layout = this.layoutInfo;
        // 基于实际item位置计算，找到最接近当前contentOffset的item
        let viewCenter = v2(this.contentOffset.x + this.viewSize.width / 2, this.contentOffset.y - this.viewSize.height / 2);
        // 转换为content坐标系的本地坐标
        let localPos = v2(viewCenter.x - this.realPaddingLeft, viewCenter.y + this.realPaddingTop);
        
        // 基于实际尺寸计算坐标
        let bestCrd = v2(0, 0);
        let minDist = Infinity;
        
        // 遍历所有item，找到距离最近的
        for (let i = 0; i < Math.min(layout.num, 1000); i++) { // 限制最多检查1000个，避免性能问题
            let posInfo = this.getPosInfo(i);
            let itemCenter = posInfo.center;
            let dist = Math.sqrt(Math.pow(itemCenter.x - localPos.x, 2) + Math.pow(itemCenter.y - localPos.y, 2));
            if (dist < minDist) {
                minDist = dist;
                let crd = this.idx2crd(i);
                bestCrd = crd;
            }
        }
        
        // 根据最佳坐标计算精确的偏移量
        if (this.layoutDir == EDir.Horizontal) {
            // 水平布局：y是行，x是列
            let row = bestCrd.y;
            let col = bestCrd.x;
            // 计算该行该列的item中心位置
            let targetPos = this.getPosInfo(this.crd2idx(bestCrd)).center;
            // 计算偏移（单位：item数量）
            let itemSize = this.getItemSize(this.crd2idx(bestCrd));
            let offsetX = (localPos.x - targetPos.x) / (itemSize.width + layout.spaceX);
            let offsetY = (localPos.y - targetPos.y) / (itemSize.height + layout.spaceY);
            return v2(col + offsetX, row + offsetY);
        } else {
            // 垂直布局：x是行，y是列
            let row = bestCrd.x;
            let col = bestCrd.y;
            let targetPos = this.getPosInfo(this.crd2idx(bestCrd)).center;
            let itemSize = this.getItemSize(this.crd2idx(bestCrd));
            let offsetX = (localPos.x - targetPos.x) / (itemSize.width + layout.spaceX);
            let offsetY = (localPos.y - targetPos.y) / (itemSize.height + layout.spaceY);
            return v2(row + offsetX, col + offsetY);
        }
    }
    /**返回当前列表中心所落在列表项在整个布局中的二维坐标 */
    getLocation(): Vec2 {
        let curCrd = this.getVec();
        // 直接四舍五入到最近的整数坐标
        let centerCrd = Vec2.round(v2(), curCrd);
        
        if (!this.isLoop) {
            centerCrd.x = clamp(centerCrd.x, 0, this.layoutInfo.col - 1);
            centerCrd.y = clamp(centerCrd.y, 0, this.layoutInfo.row - 1);
        }
        return centerCrd;
    }
    /**返回当前列表中心所落在的列表项的索引 */
    getFocus() {
        let location = this.getLocation();
        if (this.layoutDir == EDir.Horizontal) {
            return location.y * this.layoutInfo.col + location.x;
        }
        else {
            return location.x * this.layoutInfo.row + location.y;
        }
    }
    /**在time时间内翻到上一页，若isLoop为true且当前为首页，则翻到最后一页 */
    turnPrevious(time: number = 0.4, isLoop: boolean = false) {
        if (this.listType != EListType.Page)
            return;
        if (this.scrollDir == EScrollDir.Both) {
            warn("二维页面翻页请使用locate方法！");
            return;
        }
        let previousPageIdx = isLoop ? (this.pageIdx - 1 + this.pageCnt) % this.pageCnt : clamp(this.pageIdx - 1, 0, this.pageCnt - 1);
        if (this.scrollDir == EScrollDir.Horizontal)
            this.locate(v2(previousPageIdx, 0), time);
        else
            this.locate(v2(0, previousPageIdx), time)
    }
    /**在time时间内翻到下一页，若isLoop为true且当前为最后一页，则翻到首页 */
    turnNext(time: number = 0.4, isLoop: boolean = false) {
        if (this.listType != EListType.Page)
            return;
        if (this.scrollDir == EScrollDir.Both) {
            warn("二维页面翻页请使用locate方法！");
            return;
        }
        let nextPageIdx = isLoop ? (this.pageIdx + 1) % this.pageCnt : clamp(this.pageIdx + 1, 0, this.pageCnt - 1);
        if (this.scrollDir == EScrollDir.Horizontal)
            this.locate(v2(nextPageIdx, 0), time);
        else
            this.locate(v2(0, nextPageIdx), time)
    }
    moveDelta(delta: Vec2) {
        this.content.translate(v3(delta.x, delta.y, 0));
    }
    private isInFocus = false;
    private focusTwn: Tween<any> = null;
    /**在time时间内定位并聚焦到布局坐标为crd的列表项，结束后调用endCallback，若time不传则立即完成操作 */
    locate(crd: Vec2, time?: number, endCallback?: Function) {
        this.focus(this.crd2idx(crd), time, endCallback)
    }
    /**在time时间内定位并聚焦到索引或方位为target的列表项，结束后调用endCallback，若time不传则立即完成操作 */
    focus(target: Location, time?: number, endCallback?: Function) {
        if (this.layoutInfo.num <= 0)
            return;
        if (this.listType == EListType.Layout) {
            warn("focus和locate方法仅在ScrollList和Page模式下可用")
            return;
        }
        let scrollView = this.scrollRect.getComponent(FixedScrollView);
        // scrollView.stopAutoScroll();
        switch (target) {
            case "Top":
                scrollView.scrollToTop(time, true);
                this._pageIdx = 0;
                break;
            case "Bottom":
                scrollView.scrollToBottom(time, true);
                this._pageIdx = this.layoutInfo.row - 1;
                break;
            case "Left":
                scrollView.scrollToLeft(time, true);
                this._pageIdx = 0;
                break;
            case "Right":
                scrollView.scrollToRight(time, true);
                this._pageIdx = this.layoutInfo.col - 1;
                break;
            case "Start":
                this.focus(0, time);
                break;
            case "End":
                this.focus(this.infos.length - 1, time)
                break;
            default:
                let idx = target;
                let pos = this.getPosInfo(idx).center;
                let contentSize = this.layoutInfo.size;
                let containerSize = this.content.parent.getComponent(UITransform).contentSize;
                let scrollSize = v2(contentSize.width - containerSize.width, contentSize.height - containerSize.height);
                let anchorOffset = v2((pos.x - containerSize.width / 2) / scrollSize.x, (pos.y + containerSize.height / 2) / -scrollSize.y);
                if (this.isLoop) {
                    anchorOffset.y = 1 - anchorOffset.y;
                }
                else {
                    anchorOffset.x = clamp01(anchorOffset.x);
                    anchorOffset.y = 1 - clamp01(anchorOffset.y);
                }
                scrollView.scrollTo(anchorOffset, time, true);
                let colIdx = this.layoutDir == EDir.Horizontal ? target % this.layoutInfo.col : Math.floor(target / this.layoutInfo.row);
                let rowIdx = this.layoutDir == EDir.Horizontal ? Math.floor(target / this.layoutInfo.col) : target % this.layoutInfo.row;
                if (this.scrollDir != EScrollDir.Both) {
                    this._pageIdx = this.scrollDir == EScrollDir.Horizontal ? colIdx : rowIdx;
                }
                break;
        }
        this.focusTwn && this.focusTwn.stop();
        if (time) {
            this.isInFocus = true;
            this.focusTwn = tween(this).delay(time).call(() => {
                this.isInFocus = false;
                endCallback && endCallback();
            }).start();
        }
        else {
            endCallback && endCallback();
            this.onScrolling();
        }
        this.pauseFlow();
    }

    private recycleAll() {
        this.infos.forEach(info => {
            this.recycleAllNode(info);
        });
    }
    private recycleAllNode(info: IVListItemInfo) {
        if (!this.recycleFolder) {
            console.error("没有回收节点");
            return;
        }
        for (let i = 0; i < info.renderItems.length; i++) {
            this.recycleRenderItem(info, info.renderItems[i]);
        }
        info.renderItems = [];
        info.node = null;
        info.isVisible = false;
    }
    private recycleRenderItem(info: IVListItemInfo<T>, renderItem: IRenderItemInfo<T>) {
        if (!this.recycleFolder) {
            console.error("没有回收节点");
            return;
        }
        let targetNode = renderItem.node;
        renderItem.isValid = false;
        if (targetNode.isValid) {
            if (!this.isRenderByLayer) {
                targetNode.setParent(this.recycleFolder);
            }
            else {
                this.itemChildMap.get(targetNode).forEach(e => !e.skipParent && e.child.setParent(this.recycleFolder));
            }
            targetNode.off(Node.EventType.TOUCH_END, targetNode['custom_event_onClick'], this);
            targetNode['custom_event_onClick'] = null;
            this.registerInfos.forEach(e => this.unregisterNodeEvt(info, renderItem, e));
            this.nodePools.push(targetNode);
        }
    }
    private hasInitRegister = false;
    private refreshStruct() {
        let trans = this.trans;
        let rootSize = trans.contentSize;
        this.recycleFolder = this.view = this.content = this.scrollRect = null;
        this.recycleFolder = this.node.getChildByName(RecycleNodeName);
        if (!this.recycleFolder) {
            this.recycleFolder = new Node(RecycleNodeName);
            this.recycleFolder.setParent(this.node);
            this.recycleFolder.hideFlags |= CCObject.Flags.LockedInEditor;
        }
        this.recycleFolder.active = false;
        let wgt: Widget;
        let scrollCom: FixedScrollView;
        switch (this.listType) {
            case EListType.Layout:
                [...this.node.children].forEach(e => {
                    if (e.name != RecycleNodeName && e.name != ContentNodeName) {
                        if (isInEditorMode && !e.name.startsWith("v_")) {
                            error("VList节点下不应该有其他子节点，否则在运行时会被清除！！" + this.node.getPathInHierarchy());
                        } else {
                            e.destroy();
                        }
                    }
                })
                this.view = null;
                this.scrollRect = null;
                this.content = this.node.getChildByName(ContentNodeName);
                if (!this.content) {
                    this.content = new Node(ContentNodeName);
                    this.content.layer = this.node.layer;
                    this.content.setParent(this.node);
                    let contentTrans = this.content.addComponent(UITransform);
                    this.content.position = v3();
                    contentTrans.anchorPoint = v2(0, 1);
                    contentTrans.setContentSize(rootSize);
                }
                break;
            case EListType.ScrollList:
                [...this.node.children].forEach(e => {
                    if (e.name != RecycleNodeName && e.name != ScrollNodeName) {
                        if (isInEditorMode && !e.name.startsWith("v_")) {
                            error("VList节点下不应该有其他子节点，否则在运行时会被清除！！" + this.node.getPathInHierarchy());
                        } else {
                            e.destroy();
                        }
                    }
                })
                this.scrollRect = this.node.getChildByName(ScrollNodeName);
                if (!this.scrollRect) {
                    this.scrollRect = new Node(ScrollNodeName);
                    this.scrollRect.setParent(this.node);
                    scrollCom = this.scrollRect.addComponent(FixedScrollView);
                    this.scrollRect.layer = this.node.layer;
                    scrollCom.horizontal = !!(this.scrollDir & 1);
                    scrollCom.vertical = !!(this.scrollDir & 2);
                    this.scrollRect.getComponent(UITransform).setContentSize(rootSize);
                    this.scrollRect.position = v3();
                    wgt = this.scrollRect.addComponent(Widget);
                    wgt.alignMode = Widget.AlignMode.ALWAYS;
                    wgt.isAlignLeft = wgt.isAlignBottom = wgt.isAlignTop = wgt.isAlignRight = true;
                    wgt.left = wgt.top = wgt.right = wgt.bottom = 0;
                    this.scrollRect.hideFlags |= CCObject.Flags.LockedInEditor;
                }
                else
                    scrollCom = this.scrollRect.getComponent(FixedScrollView);
                scrollCom.isInfinity = this.isLoop;

                this.view = this.scrollRect.getChildByName(ViewNodeName);
                if (!this.view) {
                    this.view = new Node(ViewNodeName);
                    this.view.setParent(this.scrollRect);
                    this.view.addComponent(Mask);
                    this.view.layer = this.node.layer;
                    this.view.getComponent(UITransform).setContentSize(rootSize);
                    wgt = this.view.addComponent(Widget);
                    wgt.alignMode = Widget.AlignMode.ALWAYS;
                    wgt.isAlignLeft = wgt.isAlignBottom = wgt.isAlignTop = wgt.isAlignRight = true;
                    wgt.left = wgt.top = wgt.right = wgt.bottom = 0;
                    this.view.position = v3();
                }
                this.content = this.view.getChildByName(ContentNodeName)
                if (!this.content) {
                    this.content = new Node(ContentNodeName);
                    this.content.setParent(this.view);
                    this.content.layer = this.node.layer;
                    let contentTrans = this.content.addComponent(UITransform);
                    contentTrans.anchorPoint = v2(0, 1);
                    contentTrans.setContentSize(new Size(rootSize.width, 100));
                    this.scrollRect.getComponent(FixedScrollView).content = this.content;
                    this.content.position = v3(-trans.width / 2, trans.height / 2);
                }
                break;
            case EListType.Page:
                [...this.node.children].forEach(e => {
                    if (e.name != RecycleNodeName && e.name != PageNodeName) {
                        if (isInEditorMode && !e.name.startsWith("v_")) {
                            error("VList节点下不应该有其他子节点，否则在运行时会被清除！！" + this.node.getPathInHierarchy());
                        } else {
                            e.destroy();
                        }
                    }
                })
                this.scrollRect = this.node.getChildByName(PageNodeName);
                if (!this.scrollRect) {
                    this.scrollRect = new Node(PageNodeName);
                    this.scrollRect.setParent(this.node);
                    scrollCom = this.scrollRect.addComponent(FixedScrollView);
                    scrollCom.allowTouch = this.allowTouchScroll;
                    scrollCom.isHandleReleaseScroll = false;
                    this.scrollRect.layer = this.node.layer;
                    scrollCom.horizontal = !!(this.scrollDir & 1);
                    scrollCom.vertical = !!(this.scrollDir & 2);
                    this.scrollRect.getComponent(UITransform).setContentSize(rootSize);
                    this.scrollRect.position = v3();
                    wgt = this.scrollRect.addComponent(Widget);
                    wgt.alignMode = Widget.AlignMode.ALWAYS;
                    wgt.isAlignLeft = wgt.isAlignBottom = wgt.isAlignTop = wgt.isAlignRight = true;
                    wgt.left = wgt.top = wgt.right = wgt.bottom = 0;
                    this.scrollRect.hideFlags |= CCObject.Flags.LockedInEditor;
                }
                else
                    scrollCom = this.scrollRect.getComponent(FixedScrollView);
                scrollCom.isInfinity = this.isLoop;
                this.view = this.scrollRect.getChildByName(ViewNodeName);
                if (!this.view) {
                    this.view = new Node(ViewNodeName);
                    this.view.setParent(this.scrollRect);
                    this.view.addComponent(Mask);
                    this.view.layer = this.node.layer;
                    this.view.getComponent(UITransform).setContentSize(new Size(rootSize.x, rootSize.y));
                    wgt = this.view.addComponent(Widget);
                    wgt.alignMode = Widget.AlignMode.ALWAYS;
                    wgt.isAlignLeft = wgt.isAlignBottom = wgt.isAlignTop = wgt.isAlignRight = true;
                    wgt.left = wgt.top = wgt.right = wgt.bottom = 0;
                }
                this.view.position = v3();
                let itemRect = this.view.getChildByName(ItemRectNodeName);
                if (!itemRect) {
                    itemRect = new Node(ItemRectNodeName);
                    itemRect.setParent(this.view);
                    itemRect.layer = this.node.layer;
                    itemRect.addComponent(UITransform);
                }
                let itemRectTrans = itemRect.getComponent(UITransform);
                itemRectTrans.setContentSize(!this.itemPrefab ? new Size(100, 100) : this.realItemSize);
                this.content = itemRect.getChildByName(ContentNodeName)
                if (!this.content) {
                    this.content = new Node(ContentNodeName);
                    this.content.setParent(itemRect);
                    this.content.layer = this.node.layer;
                    let contentTrans = this.content.addComponent(UITransform);
                    contentTrans.anchorPoint = v2(0, 1);
                    contentTrans.setContentSize(new Size(rootSize.width, 100));
                    this.scrollRect.getComponent(FixedScrollView).content = this.content;
                    this.content.position = v3(-trans.width / 2, trans.height / 2);
                }
                break;
        }
        if (!this.hasInitRegister)
            this.onInitRegister();
        this.hasInitRegister = true;
        this.lastContentOffset = this.contentOffset;
    }
    private alignContentPos(reset: boolean = false) {
        let viewSize = this.trans.contentSize;
        let contentSize = this.layoutInfo.size;
        // 对于页面模式，使用当前页面的实际尺寸；对于其他模式，使用默认尺寸（其他模式不需要单个item尺寸）
        let itemSize: Size;
        if (this.listType == EListType.Page) {
            // Page 模式：使用当前页面的实际尺寸
            if (this.pageIdx >= 0 && this.pageIdx < this.itemSizes.length && this.itemSizes[this.pageIdx]) {
                itemSize = this.itemSizes[this.pageIdx];
            } else {
                // 如果当前页面索引无效，使用默认尺寸
                itemSize = this.realItemSize;
            }
        } else {
            // 非 Page 模式：不需要单个 item 尺寸（使用 contentSize）
            itemSize = this.realItemSize;
        }
        let contentPos = this.contentOffset;
        switch (this.listType) {
            case EListType.Page:
                if (!(this.scrollDir & 1)) {
                    if (this.alignType_hor == EAlignType_Hor.Center)
                        contentPos.x = - contentSize.x / 2;
                    else if (this.alignType_hor == EAlignType_Hor.Left)
                        contentPos.x = -itemSize.x / 2
                    else if (this.alignType_hor == EAlignType_Hor.Right)
                        contentPos.x = -contentSize.x + itemSize.x / 2;
                }
                else if (reset) {
                    contentPos.x = -itemSize.x / 2
                }
                if (!(this.scrollDir & 2)) {
                    if (this.alignType_ver == EAlignType_Ver.Top)
                        contentPos.y = itemSize.y / 2
                    else if (this.alignType_ver == EAlignType_Ver.Center)
                        contentPos.y = contentSize.y / 2;
                    else if (this.alignType_ver == EAlignType_Ver.Bottom)
                        contentPos.y = contentSize.y - itemSize.y / 2;
                }
                else if (reset) {
                    contentPos.y = itemSize.y / 2;
                }
                break;
            case EListType.ScrollList:
                if (!(this.scrollDir & 1)) {
                    if (this.alignType_hor == EAlignType_Hor.Center)
                        contentPos.x = -contentSize.width / 2;
                    else if (this.alignType_hor == EAlignType_Hor.Left)
                        contentPos.x = - viewSize.width / 2;
                    else if (this.alignType_hor == EAlignType_Hor.Right)
                        contentPos.x = viewSize.width / 2 - contentSize.width;
                }
                else if (reset) {
                    contentPos.x = - viewSize.width / 2;
                }
                if (!(this.scrollDir & 2)) {
                    if (this.alignType_ver == EAlignType_Ver.Top)
                        contentPos.y = viewSize.height / 2;
                    else if (this.alignType_ver == EAlignType_Ver.Center)
                        contentPos.y = contentSize.height / 2;
                    else if (this.alignType_ver == EAlignType_Ver.Bottom)
                        contentPos.y = contentSize.height - viewSize.height / 2;
                }
                else if (reset) {
                    contentPos.y = viewSize.height / 2;
                }
                break;
            case EListType.Layout:
                if (this.alignType_hor == EAlignType_Hor.Center)
                    contentPos.x = -contentSize.width / 2;
                else if (this.alignType_hor == EAlignType_Hor.Left)
                    contentPos.x = - viewSize.width / 2;
                else if (this.alignType_hor == EAlignType_Hor.Right)
                    contentPos.x = viewSize.width / 2 - contentSize.width;
                if (this.alignType_ver == EAlignType_Ver.Top)
                    contentPos.y = viewSize.height / 2;
                else if (this.alignType_ver == EAlignType_Ver.Center)
                    contentPos.y = contentSize.height / 2;
                else if (this.alignType_ver == EAlignType_Ver.Bottom)
                    contentPos.y = contentSize.height - viewSize.height / 2;
                break;
        }
        this.content.position = V3(contentPos);
    }
    isOutOfScroll() {
        return this.scrollRect.getComponent(FixedScrollView).isOutOfBoundary;
    }
    private updateLayout(len: number) {
        // 计算平均尺寸用于布局计算
        let avgItemSize = this.realItemSize;
        if (this.itemSizes.length > 0) {
            let totalWidth = 0;
            let totalHeight = 0;
            let count = 0;
            for (let i = 0; i < Math.min(len, this.itemSizes.length); i++) {
                if (this.itemSizes[i]) {
                    totalWidth += this.itemSizes[i].width;
                    totalHeight += this.itemSizes[i].height;
                    count++;
                }
            }
            if (count > 0) {
                avgItemSize = new Size(totalWidth / count, totalHeight / count);
            }
        }
        let itemSize = avgItemSize;
        let col = this.col;
        let row = this.row;
        let space_x = this.space_x;
        let space_y = this.space_y;
        let trans = this.trans;
        let validSize = { width: trans.width - this.padding_left - this.padding_right, height: trans.height - this.padding_top - this.padding_bottom };
        let getCol: () => void = null;
        let getRow: () => void = null;
        let cnt = 0;
        //0:horizontal  1:vertical
        getCol = () => {
            cnt++;
            if (cnt >= 100) {
                log("死循环")
                return;
            }
            switch (this.strech_hor) {
                case EStrechType.Clamp:
                    if (this.layoutDir == EDir.Horizontal)
                        col = Math.max(1, Math.min(len, Math.floor((validSize.width + this.space_x) / (itemSize.width + this.space_x))))
                    else {
                        if (this.strech_ver == EStrechType.Overflow)
                            col = 1;
                        else {
                            getRow();
                            col = Math.ceil(len / row);
                        }
                    }
                    break;
                case EStrechType.Expand:
                    if (this.layoutDir == EDir.Horizontal) {
                        col = clamp(Math.floor((validSize.width + this.space_min_x) / (itemSize.width + this.space_min_x)), 1, len)
                        space_x = col == 1 ? 0 : (validSize.width - col * itemSize.width) / (col - 1);
                    }
                    else {
                        if (this.strech_ver == EStrechType.Overflow)
                            col = 1;
                        else {
                            getRow();
                            col = Math.ceil(len / row);
                            space_x = Math.max(this.space_min_x, (validSize.width - col * itemSize.width) / (col - 1));
                        }
                    }
                    break;
                case EStrechType.Fixed:
                    if (this.layoutDir == EDir.Vertical && this.strech_ver == EStrechType.Overflow)
                        col = 1;
                    break;
                case EStrechType.ExpandFixed:
                    if (this.layoutDir == EDir.Vertical && this.strech_ver == EStrechType.Overflow)
                        col = 1;
                    else
                        space_x = col == 1 ? 0 : (validSize.width - col * itemSize.width) / (col - 1);
                    break;
                case EStrechType.Overflow:
                    if (this.layoutDir == EDir.Vertical && this.strech_ver == EStrechType.Overflow)
                        col = 1;
                    else {
                        getRow();
                        col = Math.ceil(len / row);
                    }
                    break;
            }
        }
        getRow = () => {
            cnt++;
            if (cnt >= 100) {
                log("死循环")
                return;
            }
            switch (this.strech_ver) {
                case EStrechType.Clamp:
                    if (this.layoutDir == EDir.Vertical)
                        row = Math.max(1, Math.floor((validSize.height + this.space_y) / (itemSize.height + this.space_y)))
                    else {
                        if (this.strech_hor == EStrechType.Overflow)
                            row = 1;
                        else {
                            getCol();
                            row = Math.ceil(len / col);
                        }
                    }
                    break;
                case EStrechType.Expand:
                    if (this.layoutDir == EDir.Vertical) {
                        row = clamp(Math.floor((validSize.height + this.space_min_y) / (itemSize.height + this.space_min_y)), 1, len)
                        space_y = row == 1 ? 0 : (validSize.height - row * itemSize.height) / (row - 1);
                    }
                    else {
                        if (this.strech_hor == EStrechType.Overflow)
                            row = 1;
                        else {
                            getCol();
                            row = Math.ceil(len / col);
                            space_y = Math.max(this.space_min_y, (validSize.height - row * itemSize.height) / (row - 1));
                        }
                    }
                    break;
                case EStrechType.Fixed:
                    if (this.layoutDir == EDir.Horizontal && this.strech_hor == EStrechType.Overflow)
                        row = 1;
                    break;
                case EStrechType.ExpandFixed:
                    if (this.layoutDir == EDir.Horizontal && this.strech_hor == EStrechType.Overflow)
                        row = 1;
                    else
                        space_y = row == 1 ? 0 : (validSize.height - row * itemSize.height) / (row - 1);
                    break;
                case EStrechType.Overflow:
                    if (this.layoutDir == EDir.Horizontal && this.strech_hor == EStrechType.Overflow)
                        row = 1;
                    else {
                        getCol();
                        row = Math.ceil(len / col);
                    }
                    break;
            }
        }
        getCol();
        getRow();
        // 计算实际的总尺寸（基于实际item尺寸）
        let actualBoundWidth = 0;
        let actualBoundHeight = 0;
        if (this.itemSizes.length > 0 && len > 0) {
            // 水平布局：累加每列的实际宽度，垂直方向累加每行的最大高度
            if (this.layoutDir == EDir.Horizontal) {
                // 计算所有列的实际宽度（使用每列的最大宽度）
                for (let c = 0; c < col; c++) {
                    let maxColWidth = 0;
                    for (let r = 0; r < row; r++) {
                        let idx = r * col + c;
                        if (idx < len) {
                            let idxForSize = this.isLoop ? this.positiveMod(idx, len) : idx;
                            let colItemSize = this.getItemSize(idxForSize);
                            maxColWidth = Math.max(maxColWidth, colItemSize.width);
                        }
                    }
                    actualBoundWidth += maxColWidth;
                    if (c < col - 1) actualBoundWidth += space_x;
                }
                // 计算所有行的实际高度（使用每行的最大高度）
                for (let r = 0; r < row; r++) {
                    let maxRowHeight = 0;
                    for (let c = 0; c < col; c++) {
                        let idx = r * col + c;
                        if (idx < len) {
                            let idxForSize = this.isLoop ? this.positiveMod(idx, len) : idx;
                            let rowItemSize = this.getItemSize(idxForSize);
                            maxRowHeight = Math.max(maxRowHeight, rowItemSize.height);
                        }
                    }
                    actualBoundHeight += maxRowHeight;
                    if (r < row - 1) actualBoundHeight += space_y;
                }
            } else {
                // 垂直布局：累加每行的实际高度，水平方向累加每列的最大宽度
                for (let r = 0; r < row; r++) {
                    let maxRowHeight = 0;
                    for (let c = 0; c < col; c++) {
                        let idx = r * col + c;
                        if (idx < len) {
                            let idxForSize = this.isLoop ? this.positiveMod(idx, len) : idx;
                            let rowItemSize = this.getItemSize(idxForSize);
                            maxRowHeight = Math.max(maxRowHeight, rowItemSize.height);
                        }
                    }
                    actualBoundHeight += maxRowHeight;
                    if (r < row - 1) actualBoundHeight += space_y;
                }
                // 计算所有列的实际宽度（使用每列的最大宽度）
                for (let c = 0; c < col; c++) {
                    let maxColWidth = 0;
                    for (let r = 0; r < row; r++) {
                        let idx = r * col + c;
                        if (idx < len) {
                            let idxForSize = this.isLoop ? this.positiveMod(idx, len) : idx;
                            let colItemSize = this.getItemSize(idxForSize);
                            maxColWidth = Math.max(maxColWidth, colItemSize.width);
                        }
                    }
                    actualBoundWidth += maxColWidth;
                    if (c < col - 1) actualBoundWidth += space_x;
                }
            }
        } else {
            // 如果没有实际尺寸记录，使用平均尺寸计算
            actualBoundWidth = col * (itemSize.width + space_x) - space_x;
            actualBoundHeight = row * (itemSize.height + space_y) - space_y;
        }
        let boundSize = new Size(actualBoundWidth, actualBoundHeight);
        let size = new Size(boundSize.x + this.realPaddingLeft + this.realPaddingRight,
            boundSize.y + this.realPaddingTop + this.realPaddinBottom);
        this.content.getComponent(UITransform).setContentSize(size);
        this._layoutInfo = {
            row, col, spaceX: space_x, spaceY: space_y, size, boundSize, num: len
        }
    }
    /**测试content下的本地坐标lp所落在的渲染项的realIdx索引（不论渲染项的显隐状态都可用） */
    testItemIdxByLp(lp: Vec2) {
        let viewSize = this.trans.contentSize;
        lp.x = lp.x - viewSize.x / 2 - (!!(this.loopDir & EOverflowDir.Horizontal) ? this.realPaddingLeft : 0);
        lp.y = lp.y + viewSize.y / 2 + (!!(this.loopDir & EOverflowDir.Vertical) ? this.realPaddingTop : 0);
        
        // 基于实际item位置计算，找到包含该坐标的item
        let bestIdx = 0;
        let minDist = Infinity;
        
        // 遍历所有item，找到距离最近的（或者包含该点的）
        for (let i = 0; i < this.layoutInfo.num; i++) {
            let posInfo = this.getPosInfo(i);
            // 检查点是否在item的Rect内
            if (lp.x >= posInfo.xMin && lp.x <= posInfo.xMax && 
                lp.y <= posInfo.yMin && lp.y >= posInfo.yMax) {
                return this.isLoop ? i : clamp(i, 0, this.layoutInfo.num - 1);
            }
            // 计算到item中心的距离
            let center = posInfo.center;
            let dist = Math.sqrt(Math.pow(center.x - lp.x, 2) + Math.pow(center.y - lp.y, 2));
            if (dist < minDist) {
                minDist = dist;
                bestIdx = i;
            }
        }
        
        return this.isLoop ? bestIdx : clamp(bestIdx, 0, this.layoutInfo.num - 1);
    }
    /**测试索引为realIdx的渲染项位置是否在视口范围内（不论渲染项的显隐状态都可用） */
    testVisibleByIdx(realIdx: number) {
        if (!this.view)
            return true;
        const accuracy = 1;
        let viewSize = this.trans.contentSize;
        let posInfo = this.getPosInfo(realIdx);
        let minViewPos = v3(accuracy, -viewSize.height + accuracy, 0);
        let maxViewPos = v3(viewSize.width - accuracy, -accuracy, 0);

        let itemMinPos = v3(posInfo.xMin + this.contentOffset.x + viewSize.width / 2, posInfo.yMin + this.contentOffset.y - viewSize.height / 2, 0);
        let itemMaxPos = v3(posInfo.xMax + this.contentOffset.x + viewSize.width / 2, posInfo.yMax + this.contentOffset.y - viewSize.height / 2, 0);
        return itemMinPos.x <= maxViewPos.x && itemMaxPos.x >= minViewPos.x && itemMinPos.y <= maxViewPos.y && itemMaxPos.y >= minViewPos.y;
    }
    /**在循环列表中重置循环轮数，但不改变当前视觉上的滚动进度 */
    resetLoop() {
        if (!this.isLoop)
            return;
        this.progress = this.positiveMod(this.progress, 1);
        this.onScrolling();
    }
    /**返回索引为idx的列表项在布局中的Rect信息（此方法与列表项可见性无关） */
    getPosInfo(realIdx: number): Rect {
        let info = this.layoutInfo;
        // 根据realIdx获取对应的infoIdx，然后使用该索引获取实际尺寸
        let infoIdx = this.isLoop ? this.positiveMod(realIdx, info.num) : realIdx;
        let itemSize = this.getItemSize(infoIdx);
        let c = 0;
        let r = 0;
        let curTotalCol = Math.min(info.num - r * info.col, info.col);
        let curTotalRow = Math.min(info.num - c * info.row, info.row);
        let horLayout = this.layoutDir == EDir.Horizontal;
        let loopIdx = Math.floor(realIdx / info.num);
        let verScrollLimit = !(this.scrollDir & EScrollDir.Vertical);
        let horScrollLimit = !(this.scrollDir & EScrollDir.Horizontal);
        r = horLayout ? Math.floor(realIdx / info.col) : this.positiveMod(realIdx, info.row);
        c = horLayout ? this.positiveMod(realIdx, info.col) : Math.floor(realIdx / info.row);
        r = this.strech_ver != EStrechType.Overflow && !!(this.scrollDir & EScrollDir.Vertical) ? r + loopIdx * info.row : r;
        c = this.strech_hor != EStrechType.Overflow && !!(this.scrollDir & EScrollDir.Horizontal) ? c + loopIdx * info.col : c;
        r = verScrollLimit ? this.positiveMod(r, info.row) : r;
        c = horScrollLimit ? this.positiveMod(c, info.col) : c;
        if (horLayout)
            curTotalCol = Math.min(info.num - this.positiveMod(r, info.row) * info.col, info.col);
        else
            curTotalRow = Math.min(info.num - this.positiveMod(c, info.col) * info.row, info.row);

        // 计算位置时需要考虑之前所有item的累积尺寸
        let xMin = this.realPaddingLeft;
        let yMin = -this.realPaddingTop;
        
        // 如果是水平布局，需要累加前面所有列的宽度
        if (horLayout) {
            // 计算到当前列的累积宽度
            for (let colIdx = 0; colIdx < c; colIdx++) {
                let idxForCol = r * info.col + colIdx;
                if (idxForCol < info.num) {
                    let idxForSize = this.isLoop ? this.positiveMod(idxForCol, info.num) : idxForCol;
                    let colItemSize = this.getItemSize(idxForSize);
                    xMin += colItemSize.width + this._layoutInfo.spaceX;
                }
            }
            // 计算当前行的累积高度（用于对齐计算）
            let rowHeight = 0;
            for (let colIdx = 0; colIdx < curTotalCol; colIdx++) {
                let idxForCol = r * info.col + colIdx;
                if (idxForCol < info.num) {
                    let idxForSize = this.isLoop ? this.positiveMod(idxForCol, info.num) : idxForCol;
                    let colItemSize = this.getItemSize(idxForSize);
                    rowHeight = Math.max(rowHeight, colItemSize.height);
                }
            }
            // 计算平均宽度用于对齐
            let avgItemWidth = this.realItemSize.width;
            if (this.itemSizes.length > 0 && curTotalCol > 0) {
                let totalWidth = 0;
                for (let colIdx = 0; colIdx < curTotalCol; colIdx++) {
                    let idxForCol = r * info.col + colIdx;
                    if (idxForCol < info.num) {
                        let idxForSize = this.isLoop ? this.positiveMod(idxForCol, info.num) : idxForCol;
                        totalWidth += this.getItemSize(idxForSize).width;
                    }
                }
                avgItemWidth = totalWidth / curTotalCol;
            }
            if (this.childAlign_hor == EAlignType_Hor.Center)
                xMin += (info.col - curTotalCol) * (avgItemWidth + this._layoutInfo.spaceX) / 2;
            else if (this.childAlign_hor == EAlignType_Hor.Right)
                xMin += (info.col - curTotalCol) * (avgItemWidth + this._layoutInfo.spaceX);
            
            // 计算垂直位置（累加上面所有行的高度）
            // 先计算当前行的最大高度（用于行对齐）
            let currentRowMaxHeight = 0;
            for (let colIdx = 0; colIdx < info.col; colIdx++) {
                let idxForRow = r * info.col + colIdx;
                if (idxForRow < info.num) {
                    let idxForSize = this.isLoop ? this.positiveMod(idxForRow, info.num) : idxForRow;
                    let rowItemSize = this.getItemSize(idxForSize);
                    currentRowMaxHeight = Math.max(currentRowMaxHeight, rowItemSize.height);
                }
            }
            // 累加前面所有行的高度，到达当前行的顶部
            for (let rowIdx = 0; rowIdx < r; rowIdx++) {
                let maxRowHeight = 0;
                for (let colIdx = 0; colIdx < info.col; colIdx++) {
                    let idxForRow = rowIdx * info.col + colIdx;
                    if (idxForRow < info.num) {
                        let idxForSize = this.isLoop ? this.positiveMod(idxForRow, info.num) : idxForRow;
                        let rowItemSize = this.getItemSize(idxForSize);
                        maxRowHeight = Math.max(maxRowHeight, rowItemSize.height);
                    }
                }
                // 减去上一行的最大高度和间距，到达当前行的顶部
                yMin -= maxRowHeight + this._layoutInfo.spaceY;
            }
            // yMin现在表示当前行顶部的y坐标（y向上为正，所以顶部y值较大）
            // Rect的yMin是矩形底部边缘，center.y = yMin + height/2
            // 根据垂直对齐方式，计算当前item在行中的位置
            // 在行内，item应该基于行最大高度对齐（Top/Center/Bottom）
            let rowTopY = yMin; // 当前行顶部的y坐标
            let rowBottomY = rowTopY - currentRowMaxHeight; // 当前行底部的y坐标
            if (this.childAlign_ver == EAlignType_Ver.Top) {
                // 顶部对齐：item顶部对齐到行顶部
                // item顶部y = rowTopY, item底部y = rowTopY - itemSize.height
                yMin = rowTopY - itemSize.height;
            } else if (this.childAlign_ver == EAlignType_Ver.Center) {
                // 居中对齐：item在行中垂直居中
                // 行的中心y = rowTopY - currentRowMaxHeight/2
                // item中心y = 行的中心y，所以 item底部y = 行的中心y - itemSize.height/2
                yMin = rowTopY - currentRowMaxHeight / 2 - itemSize.height / 2;
            } else if (this.childAlign_ver == EAlignType_Ver.Bottom) {
                // 底部对齐：item底部对齐到行底部
                // item底部y = rowBottomY，Rect的yMin是底部边缘
                yMin = rowBottomY;
            } else {
                // 默认顶部对齐
                yMin = rowTopY - itemSize.height;
            }
            // 计算平均高度用于整行对齐（用于最后一行对齐）
            let avgRowHeight = this.realItemSize.height;
            if (this.itemSizes.length > 0 && r < info.row) {
                let totalHeight = 0;
                let rowCount = 0;
                for (let colIdx = 0; colIdx < info.col; colIdx++) {
                    let idxForRow = r * info.col + colIdx;
                    if (idxForRow < info.num) {
                        let idxForSize = this.isLoop ? this.positiveMod(idxForRow, info.num) : idxForRow;
                        totalHeight += this.getItemSize(idxForSize).height;
                        rowCount++;
                    }
                }
                if (rowCount > 0) {
                    avgRowHeight = totalHeight / rowCount;
                }
            }
            // 如果当前行是最后一行且需要对齐，需要调整
            if (r >= info.row - 1 && curTotalRow < info.row) {
                if (this.childAlign_ver == EAlignType_Ver.Center)
                    yMin -= (info.row - curTotalRow) * (avgRowHeight + this._layoutInfo.spaceY) / 2;
                else if (this.childAlign_ver == EAlignType_Ver.Bottom)
                    yMin -= (info.row - curTotalRow) * (avgRowHeight + this._layoutInfo.spaceY);
            }
        } else {
            // 垂直布局的情况（类似处理）
            // 先计算当前行的最大高度（用于行对齐）
            let currentRowMaxHeight = 0;
            for (let colIdx = 0; colIdx < info.col; colIdx++) {
                let idxForRow = r * info.col + colIdx;
                if (idxForRow < info.num) {
                    let idxForSize = this.isLoop ? this.positiveMod(idxForRow, info.num) : idxForRow;
                    let rowItemSize = this.getItemSize(idxForSize);
                    currentRowMaxHeight = Math.max(currentRowMaxHeight, rowItemSize.height);
                }
            }
            // 累加前面所有行的高度，到达当前行的顶部
            for (let rowIdx = 0; rowIdx < r; rowIdx++) {
                let maxRowHeight = 0;
                for (let colIdx = 0; colIdx < info.col; colIdx++) {
                    let idxForRow = rowIdx * info.col + colIdx;
                    if (idxForRow < info.num) {
                        let idxForSize = this.isLoop ? this.positiveMod(idxForRow, info.num) : idxForRow;
                        let rowItemSize = this.getItemSize(idxForSize);
                        maxRowHeight = Math.max(maxRowHeight, rowItemSize.height);
                    }
                }
                yMin -= maxRowHeight + this._layoutInfo.spaceY;
            }
            // yMin现在表示当前行顶部的y坐标（y向上为正，所以顶部y值较大）
            // Rect的yMin是矩形底部边缘，center.y = yMin + height/2
            // 根据垂直对齐方式，计算当前item在行中的位置
            let rowTopY = yMin; // 当前行顶部的y坐标
            let rowBottomY = rowTopY - currentRowMaxHeight; // 当前行底部的y坐标
            if (this.childAlign_ver == EAlignType_Ver.Top) {
                // 顶部对齐：item顶部对齐到行顶部
                // item顶部y = rowTopY, item底部y = rowTopY - itemSize.height
                yMin = rowTopY - itemSize.height;
            } else if (this.childAlign_ver == EAlignType_Ver.Center) {
                // 居中对齐：item在行中垂直居中
                // 行的中心y = rowTopY - currentRowMaxHeight/2
                // item中心y = 行的中心y，所以 item底部y = 行的中心y - itemSize.height/2
                yMin = rowTopY - currentRowMaxHeight / 2 - itemSize.height / 2;
            } else if (this.childAlign_ver == EAlignType_Ver.Bottom) {
                // 底部对齐：item底部对齐到行底部
                // item底部y = rowBottomY，Rect的yMin是底部边缘
                yMin = rowBottomY;
            } else {
                // 默认顶部对齐
                yMin = rowTopY - itemSize.height;
            }
            // 计算平均高度用于整行对齐（用于最后一行对齐）
            let avgRowHeight2 = this.realItemSize.height;
            if (this.itemSizes.length > 0 && r < info.row) {
                let totalHeight = 0;
                let rowCount = 0;
                for (let colIdx = 0; colIdx < info.col; colIdx++) {
                    let idxForRow = r * info.col + colIdx;
                    if (idxForRow < info.num) {
                        let idxForSize = this.isLoop ? this.positiveMod(idxForRow, info.num) : idxForRow;
                        totalHeight += this.getItemSize(idxForSize).height;
                        rowCount++;
                    }
                }
                if (rowCount > 0) {
                    avgRowHeight2 = totalHeight / rowCount;
                }
            }
            // 如果当前行是最后一行且需要对齐，需要调整
            if (r >= info.row - 1 && curTotalRow < info.row) {
                if (this.childAlign_ver == EAlignType_Ver.Center)
                    yMin -= (info.row - curTotalRow) * (avgRowHeight2 + this._layoutInfo.spaceY) / 2;
                else if (this.childAlign_ver == EAlignType_Ver.Bottom)
                    yMin -= (info.row - curTotalRow) * (avgRowHeight2 + this._layoutInfo.spaceY);
            }
            
            // 计算水平位置
            for (let colIdx = 0; colIdx < c; colIdx++) {
                let idxForCol = r * info.col + colIdx;
                if (idxForCol < info.num) {
                    let idxForSize = this.isLoop ? this.positiveMod(idxForCol, info.num) : idxForCol;
                    let colItemSize = this.getItemSize(idxForSize);
                    xMin += colItemSize.width + this._layoutInfo.spaceX;
                }
            }
            // 计算平均宽度用于对齐
            let avgItemWidth = this.realItemSize.width;
            if (this.itemSizes.length > 0 && curTotalCol > 0) {
                let totalWidth = 0;
                for (let colIdx = 0; colIdx < curTotalCol; colIdx++) {
                    let idxForCol = r * info.col + colIdx;
                    if (idxForCol < info.num) {
                        let idxForSize = this.isLoop ? this.positiveMod(idxForCol, info.num) : idxForCol;
                        totalWidth += this.getItemSize(idxForSize).width;
                    }
                }
                avgItemWidth = totalWidth / curTotalCol;
            }
            if (this.childAlign_hor == EAlignType_Hor.Center)
                xMin += (info.col - curTotalCol) * (avgItemWidth + this._layoutInfo.spaceX) / 2;
            else if (this.childAlign_hor == EAlignType_Hor.Right)
                xMin += (info.col - curTotalCol) * (avgItemWidth + this._layoutInfo.spaceX);
        }
        
        // 叠加用户自定义偏移（以数据索引为基准）
        let userOffset = this.itemOffsetMap.get(infoIdx);
        if (userOffset) {
            xMin += userOffset.x;
            yMin += userOffset.y;
        }
        // 叠加全局偏移（所有 item 生效）
        if (this.globalOffset) {
            xMin += this.globalOffset.x;
            yMin += this.globalOffset.y;
        }
        return new Rect(xMin, yMin, itemSize.width, itemSize.height);
    }
    /**刷新列表 */
    refreshList() {
        this.refreshView(true);
    }
    /**获取在视口中可能出现的所有渲染项的realIdx */
    getRealIdxRangeInView() {
        const accuracy = 1;
        let startIdx = this.testItemIdxByLp(v2(-this.contentOffset.x + accuracy, -this.contentOffset.y - accuracy))
        let endIdx = this.testItemIdxByLp(v2(this.viewSize.x - this.contentOffset.x - accuracy, -this.viewSize.y - this.contentOffset.y + accuracy));
        return { startIdx, endIdx };
    }
    private refreshView(force: boolean = false) {
        let contentTrans = this.content.getComponent(UITransform);
        contentTrans.setContentSize(this._layoutInfo.size);
        if (this.infos.length == 0) {
            return;
        }
        this.executeLock = true;
        const idxRange = this.getRealIdxRangeInView();
        let startIdx = idxRange.startIdx;
        let endIdx = idxRange.endIdx;
        let renderMaps: Map<number, {
            enterInfos: IRenderItemInfo<T>[],
            stayInfos: IRenderItemInfo<T>[],
            exitInfos: IRenderItemInfo<T>[]
        }> = new Map();
        let renderVisitMap: Map<number, Set<number>> = new Map();

        //根据视口包含的可能索引算出所有在视口内的和在视口外的
        for (let i = startIdx; i <= endIdx; i++) {
            let infoIdx = this.positiveMod(i, this.infos.length);
            let renderInfos = renderMaps.get(infoIdx);
            if (!renderInfos) {
                renderInfos = { enterInfos: [], stayInfos: [], exitInfos: [] };
                renderMaps.set(infoIdx, renderInfos);
                renderVisitMap.set(infoIdx, new Set());
            }
            let isVisible = this.testVisibleByIdx(i);
            let info = this.infos[infoIdx];
            let curItem = info.renderItems.find(e => e.realIdx == i);
            renderVisitMap.get(infoIdx).add(i);
            if (curItem && isVisible)
                renderInfos.stayInfos.push(curItem);
            else if (curItem && !isVisible) {
                renderInfos.exitInfos.push(curItem);
                curItem.isValid = false;
            }
            else if (!curItem && isVisible)
                renderInfos.enterInfos.push(this.getRenderItemInfo(i, this.getNode(info), info));
        }

        //剔除剩下不参与检测计算的渲染项
        for (let i = 0; i < this.infos.length; i++) {
            if (!this.infos[i].isVisible)
                continue;
            let info = this.infos[i];
            if (renderVisitMap.has(i)) {
                let visitMap = renderVisitMap.get(i);
                for (let j = 0; j < info.renderItems.length; j++) {
                    if (!visitMap.has(info.renderItems[j].realIdx))
                        renderMaps.get(i).exitInfos.push(info.renderItems[j]);
                }
            }
            else {
                renderMaps.set(i, {
                    stayInfos: [],
                    enterInfos: [],
                    exitInfos: info.renderItems
                });
            }
        }
        Array.from(renderMaps.keys()).forEach(infoIdx => {
            let info = this.infos[infoIdx];
            let renderInfos = renderMaps.get(infoIdx);
            this.refreshDelayFuncs.push(() => {
                renderInfos.exitInfos.forEach(f => {
                    info.node = f.node;
                    this.cb.onHide && this.cb.onHide(info, f);
                    this.recycleRenderItem(info, f);
                })
            })
            renderInfos.enterInfos.forEach(f => {
                this.initRenderItem(f);
            })
            this.refreshDelayFuncs.push(() => {
                renderInfos.enterInfos.forEach(f => {
                    info.node = f.node;
                    this.cb.onShow && this.cb.onShow(info, f);
                })
            })
            renderInfos.enterInfos.forEach(f => {
                this.refreshDelayFuncs.push(() => {
                    info.node = f.node;
                    this.cb.onData && this.cb.onData(info, f);
                })
            })
            if (force)
                renderInfos.stayInfos.forEach(f => {
                    this.refreshDelayFuncs.push(() => {
                        info.node = f.node;
                        this.cb.onData && this.cb.onData(info, f);
                    })
                })
            info.renderItems = [].concat(renderInfos.stayInfos, renderInfos.enterInfos);
            info.isVisible = info.renderItems.length > 0;
            info.node = info.isVisible ? info.renderItems[info.renderItems.length - 1].node : null;
            this.refreshNodeTrans(info)
        });
        this.refreshDelayFuncs.forEach(e => e());
        this.refreshDelayFuncs = [];
        this.executeLock = false;
    }

    private waitExecute(exeFunc: Function) {
        this.exeCache.push(exeFunc);
    }
    private scrollVelocity = v2();
    private lastContentOffset = v2();
    private exeCache: Function[] = [];
    protected update(dt: number): void {
        if (!isInEditorMode) {
            this.executeLock = true;
            this.infos.forEach(e => {
                e.renderItems.forEach(f => this.updateRenderItem(f, dt));
            })
            this.executeLock = false;
            if (this.scrollRect) {
                let scrollView = this.scrollRect.getComponent(FixedScrollView);
                if (this.isInFocus || scrollView.isAutoScrolling() || (scrollView.isInTouch && scrollView.allowTouch)) {
                    this.pauseFlow();
                    this.relativeListCom.forEach(e => e.pauseFlow());
                }
            }
            if (this.isLoop && Math.abs(this.autoFlowSpeedX) + Math.abs(this.autoFlowSpeedY) > 0.05) {
                this.flowTimer -= dt;
                if (this.flowTimer <= 0) {
                    this.realFlowSpeed = this.autoFlowSpeed;
                    if (this.flowTimer < -60) {
                        this.resetLoop();
                        this.flowTimer += 60;
                    }
                }
                else {
                    if (this.flowTimer >= this.flowResumeTime)
                        this.realFlowSpeed = v2();
                    else {
                        this.realFlowSpeed.x = easing.quadIn(1 - this.flowTimer / this.flowResumeTime) * this.autoFlowSpeed.x;
                        this.realFlowSpeed.y = easing.quadIn(1 - this.flowTimer / this.flowResumeTime) * this.autoFlowSpeed.y;
                    }
                }
                if (this.isInFlow) {
                    this.moveDelta(v2(-this.realFlowSpeed.x * dt, this.realFlowSpeed.y * dt));
                    this.onScrolling();
                }
            }
            this.scrollVelocity = v2((this.contentOffset.x - this.lastContentOffset.x) / dt, (this.contentOffset.y - this.lastContentOffset.y) / dt);
            this.lastContentOffset = this.contentOffset.clone();
        }
        //缓冲，配合executeLock防止Foreach错误
        this.exeCache.forEach(e => e());
        this.exeCache = [];
    }


    private updateRenderItem(renderItemInfo: IRenderItemInfo, dt: number) {
        renderItemInfo.info.node = renderItemInfo.node;
        this.cb.onUpdate && this.cb.onUpdate(renderItemInfo.info, dt, renderItemInfo);

        let node = renderItemInfo.node;
        if (this.isRenderByLayer && node.getComponent(UIOpacity)) {
            this.itemChildMap.get(node).forEach(e => {
                if (!e.skipParent) {
                    let opacityCom = e.child.getComponent(UIOpacity);
                    if (!opacityCom)
                        opacityCom = e.child.addComponent(UIOpacity);
                    opacityCom.opacity = node.getComponent(UIOpacity).opacity;
                }
            })
        }
    }
    // protected onEnable(): void {
    //     this.refreshView();
    // }
    // protected onDisable(): void {
    //     if (!this.node.active)
    //         this.clearPool();
    // }
    protected onDestroy(): void {
        this.clearAll();
    }
    protected onLoad(): void {
        if (!this.trans) {
            error("VList没有UITransform组件！请手动添加并检查该节点是否挂载在Canvas下！");
            return;
        }
        if (!isInEditorMode && this.content) {
            let children = [...this.content.children];
            children.forEach(e => {
                if (e.name.startsWith("preview_"))
                    e.destroy();
            })
            if (this.view)
                this.view.getComponent(Mask).enabled = true;
        }

    }
    resetInEditor(didResetToDefault?: boolean): void {
        [...this.node.children].forEach(e => e.destroy());
        this.comPathList = [];
        this.comKeyList = [];
        this.comShowList = [];
    }
    private startCrd: Vec2 = v2();
    private onScrollStart() {
        this.isInFocus = false;
        this.focusTwn && this.focusTwn.stop();
        this.focusTwn = null;
        let location = this.getLocation();
        this.startCrd = location;
        if (this.scrollDir != EScrollDir.Both)
            this._pageIdx = this.scrollDir == EScrollDir.Horizontal ? location.x : location.y;
    }
    private onScrollEnd() {
        if (this.listType == EListType.Page) {
            if (!this.scrollRect || this.isInFocus)
                return;
            let targetCrd = this.getLocation();
            let vec = this.getVec().subtract(v2(0.5, 0.5));
            let selfRange = new Rect(this.startCrd.x - this.scrollThreshold, this.startCrd.y - this.scrollThreshold, 2 * this.scrollThreshold, 2 * this.scrollThreshold);
            if (vec.x < selfRange.xMin || this.scrollVelocity.x > this.turnSpeedThreshold)
                targetCrd.x = Math.min(targetCrd.x, this.startCrd.x - 1);

            else if (vec.x > selfRange.xMax || this.scrollVelocity.x < -this.turnSpeedThreshold)
                targetCrd.x = Math.max(targetCrd.x, this.startCrd.x + 1);
            if (vec.y < selfRange.yMin || this.scrollVelocity.y < -this.turnSpeedThreshold)
                targetCrd.y = Math.min(targetCrd.y, this.startCrd.y - 1);
            else if (vec.y > selfRange.yMax || this.scrollVelocity.y > this.turnSpeedThreshold)
                targetCrd.y = Math.max(targetCrd.y, this.startCrd.y + 1);
            if (!this.isLoop) {
                targetCrd.x = clamp(targetCrd.x, 0, this.layoutInfo.col - 1);
                targetCrd.y = clamp(targetCrd.y, 0, this.layoutInfo.row - 1);
            }
            this.locate(targetCrd, this.snapTime, () => {
                this.node.emit(VListEvent.OnFinishPage);
            });
            // }
            this.node.emit(VListEvent.OnTurnPage);
            this.startCrd = v2();
        }
    }
    private positiveMod(a: number, b: number) {
        let res = a % b;
        if (res < 0)
            return res + b;
        else
            return res;
    }

}


