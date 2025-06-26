import { _decorator, Component, Node, ScrollView, instantiate, Label, size, UITransform, EventTouch, UIOpacity, v2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ScrollViewExt')
export class ScrollViewExt extends Component {
    @property
    spaceCnt: number = 3;
    @property(Node)
    nodeItem: Node = null;
    
    // 添加最小显示项目数量配置
    @property({ tooltip: "最小显示项目数量，仅当数据为空时填充到此数量" })
    minItemCount: number = 1;

    // 添加是否启用数据填充功能
    @property({ tooltip: "是否启用数据填充功能，仅在数据为空时生效" })
    enableDataPadding: boolean = true;

    // 添加填充策略选项
    @property({ 
        tooltip: "填充策略：0-重复原数据，1-添加空项" 
    })
    paddingStrategy: number = 0; // 0: REPEAT, 1: EMPTY

    // 添加item间隔配置
    @property({ 
        tooltip: "滚动item之间的间隔像素，用于精确定位" 
    })
    itemSpacing: number = 24;

    callback: (idx: number, data: Array<string>) => void;

    /** 是否增加子节点区间功能 */
    // @property
    extraScrollChildIndex = true;

    /** 是否增加Scrollbar滑动功能 */
    // @property
    extraScrollBar = true;

    selectChildIndex = 0;
    private _dataList = [];
    private _displayDataList = []; // 用于显示的数据列表（可能包含填充项）

    private nowOffsetY = 0;
    private selectChildren: Node[] = [];

    private _topCnt: number = 3;
    private _botCnt: number = 3;
    private _itemHeight = 52;

    set dataList(data: Array<string>) {
        this._dataList = data;
        this._displayDataList = this.processDataList(data);
        this.refresh();
    }

    get dataList() {
        return this._dataList;
    }

    /**
     * 获取包含间隔的实际item高度
     * @returns 包含间隔的item高度
     */
    private getItemHeightWithSpacing(): number {
        return this.nodeItem.getComponent(UITransform).height + this.itemSpacing;
    }

    /**
     * 处理数据列表，确保有足够的项目可以滑动
     * @param data 原始数据列表
     * @returns 处理后的显示数据列表
     */
    private processDataList(data: Array<string>): Array<string> {
        // 如果禁用填充功能，或者数据不为空，直接返回原数据
        if (!this.enableDataPadding || data.length > 0) {
            return [...data];
        }
        
        // 只有当数据为空时才进行填充
        const displayList = [];
        
        if (data.length === 0) {
            // 空数据情况，添加默认项
            const targetCount = Math.max(this.minItemCount, 1);
            for (let i = 0; i < targetCount; i++) {
                displayList.push("选项" + (i + 1));
            }
        }
        
        return displayList;
    }

    /** 增加scroll子节点区间功能 */
    addScrollChildIndex() {
        /** 禁用鼠标滚轮，滚轮在移动区间时ScrollEvent返回很怪异，没有SCROLL_ENDED事件回调 */
        this.node.off(Node.EventType.MOUSE_WHEEL);
        const scroll = this.node.getComponent(ScrollView);
        /** scroll事件监听 */
        scroll.node.on(ScrollView.EventType.SCROLLING, this.onScrolling, this);
        scroll.node.on(ScrollView.EventType.SCROLL_ENDED, this.onScrollEnded, this);

        this.nowOffsetY = scroll.getScrollOffset().y;

        scroll.content.removeAllChildren();
        this.selectChildren = [];
        
        // 计算内容区域高度，包含间隔
        const totalItems = this._displayDataList.length + this._topCnt + this._botCnt;
        const contentHeight = totalItems * this._itemHeight;
        scroll.content.getComponent(UITransform).height = contentHeight;
        
        // 使用处理后的显示数据列表
        for (let i = 0; i < this._displayDataList.length + this._topCnt + this._botCnt; i++) {
            let node = instantiate(this.nodeItem);
            if (i < this._topCnt || i >= this._displayDataList.length + this._topCnt) {
                node.children[0].active = false;
            } else {
                node.children[0].active = true;
                let realIdx = i - this._topCnt;
                node.children[0].getComponent(Label).string = `${this._displayDataList[realIdx]}`;
                this.selectChildren[realIdx] = node;
            }
            
            // 设置节点位置，考虑间隔
            const yPosition = -i * this._itemHeight;
            node.setPosition(new Vec3(0, yPosition, 0));
            node.active = true;
            node.parent = scroll.content;
        }

        if (this.selectChildIndex >= this._dataList.length) {
            this.selectChildIndex = 0;
            this.setSelectChildIndex(0);
            scroll.scrollToTop();
        } else {
            this.setSelectChildIndex(this.selectChildIndex);
        }
    }

    /** 增加scrollbar滑动事件，让滑动方向跟浏览器一样 */
    /** 改方法只增加了竖轴滑动事件，横轴事件同理 */
    addScrollBarExtra() {
        const scroll = this.node.getComponent(ScrollView);
        const scrollnode: any = this.node;

        /** 手动禁用scroll节点捕获事件_capturingListeners */
        scrollnode._bubblingListeners = scrollnode._capturingListeners;
        scrollnode._capturingListeners = undefined;

        const scrollbar = scroll.verticalScrollBar;
        let touching = false;
        const handlenode = scrollbar.handle.node;

        function getMoveInterval(node: Node, parent: Node) {

            const handlesize = size(node.getComponent(UITransform).width, node.getComponent(UITransform).height);
            const parentSize = size(parent.getComponent(UITransform).width, parent.getComponent(UITransform).height);
            let maxY = 0, minY = 0;
            if (parentSize.height > handlesize.height) {
                maxY = parentSize.height / 2 - handlesize.height;
                minY = - parentSize.height / 2;
            }
            return { minY, maxY };
        }

        handlenode.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            touching = true;
            e.propagationStopped = true;
        })
        handlenode.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            const node = e.target;
            const { minY, maxY } = getMoveInterval(node, node.parent)
            node.y += e.getDelta().y
            if (node.y > maxY) {
                node.y = maxY;
            } else if (node.y < minY) {
                node.y = minY;
            }
            e.propagationStopped = true;
            let p = (node.y - minY) / (maxY - minY);
            scroll.scrollToPercentVertical(p)
            if (this.extraScrollChildIndex) {
                this.scrolling(scroll)
            }
        })
        handlenode.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            touching = false;
            e.propagationStopped = true;
            if (this.extraScrollChildIndex) {
                this.scrollToOffset(scroll)
            }

        })
        handlenode.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => {
            touching = false;
            e.propagationStopped = true;
            if (this.extraScrollChildIndex) {
                this.scrollToOffset(scroll)
            }
        })
    }

    start() {

    }

    refresh() {
        this._itemHeight = this.getItemHeightWithSpacing();
        this._topCnt = this.spaceCnt;
        this._botCnt = this.spaceCnt;

        this.extraScrollChildIndex && this.addScrollChildIndex();
        this.extraScrollBar && this.addScrollBarExtra();
    }

    getScrollChildOffset(scroll: ScrollView) {
        /** 每个子节点高度，用来计算区间 */
        const height = this._itemHeight;
        const maxoffset = scroll.getMaxScrollOffset().y;
        const offset = scroll.getScrollOffset().y;
        if (offset < 0) {
            this.selectChildIndex = 0;
            return 0;
        } else if (offset > maxoffset) {
            this.selectChildIndex = this.selectChildren.length - 1;
            return maxoffset;
        }

        let o = 0;
        let o2 = height;
        let i = 0;
        while (true) {
            if (Math.abs(o - offset) < Math.abs(o2 - offset)) {
                this.selectChildIndex = i;
                return o;
            }
            o += height;
            o2 += height;
            i++;
        }
    }

    setSelectChildIndex(idx: number) {
        // 确保索引在原始数据范围内
        const actualIndex = idx % this._dataList.length;
        
        for (let i = 0; i < this.selectChildren.length; i++) {
            // 计算对应的原始数据索引
            const originalIdx = i % this._dataList.length;
            this.selectChildren[i].getComponent(UIOpacity).opacity = originalIdx === actualIndex ? 255 : 255 * 0.3;
        }

        this.callback && this.callback(actualIndex, this._dataList);
    }

    scrolling(scroll: ScrollView) {
        /** 每个子节点高度，用来计算区间 */
        const height = this._itemHeight;
        const maxoffset = scroll.getMaxScrollOffset().y;
        const offset = scroll.getScrollOffset().y;
        if (offset <= 0) {
            return this.setSelectChildIndex(0)
        } else if (offset >= maxoffset) {
            return this.setSelectChildIndex(this.selectChildren.length - 1)
        }

        let o = 0;
        let o2 = height;
        let i = 0;
        while (true) {
            if (offset >= o && offset < o2) {
                const op = (offset - o) / height;
                
                // 计算对应的原始数据索引
                const actualIdx1 = i % this._dataList.length;
                const actualIdx2 = (i + 1) % this._dataList.length;
                
                // 重置所有透明度
                for (let j = 0; j < this.selectChildren.length; j++) {
                    const originalIdx = j % this._dataList.length;
                    if (originalIdx === actualIdx1) {
                        this.selectChildren[j].getComponent(UIOpacity).opacity = Math.max(1 - op, 0.3) * 255;
                    } else if (originalIdx === actualIdx2) {
                        this.selectChildren[j].getComponent(UIOpacity).opacity = Math.max(op, 0.3) * 255;
                    } else {
                        this.selectChildren[j].getComponent(UIOpacity).opacity = 0.3 * 255;
                    }
                }
                return
            }
            o += height;
            o2 += height;
            i++;
        }
    }

    onScrollEnded(scroll: ScrollView) {
        this.scrollToOffset(scroll);
    }

    onScrolling(scroll: ScrollView) {
        this.scrolling(scroll);
    }

    scrollToOffset(scroll: ScrollView) {
        const offset = this.getScrollChildOffset(scroll)
        const scrollOffset = scroll.getScrollOffset();
        // console.log("scrollToOffset ---------- " + offset + "," + scrollOffset.y);
        if (Math.abs(this.nowOffsetY - scrollOffset.y) < 0.01)
            return this.setSelectChildIndex(this.selectChildIndex);
        this.nowOffsetY = offset;
        scroll.scrollToOffset(v2(scrollOffset.x, this.nowOffsetY), 0.1);
    }

    scrollToSelection(index: number) {
        const scrollview = this.node.getComponent(ScrollView);
        const scrollOffset = scrollview.getScrollOffset();
        // 考虑间隔的高度计算
        const height = this._itemHeight;
        let offsetY: number = index * height;
        scrollview.scrollToOffset(v2(scrollOffset.x, offsetY), 0.01);
    }
}

