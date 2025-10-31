import { _decorator, Component, instantiate, Node, Prefab, ScrollView, Size, UITransform, v2, v3 } from 'cc';
const { ccclass, property } = _decorator;
interface IRenderItemInfo {
    item: Node;
    data: any;
    height: number;
    isVisible: boolean;
}
@ccclass('DynamicList')
export class DynamicList extends Component {
    @property(Prefab)
    itemPrefab: Prefab;
    @property(Node)
    scrollView: Node;
    @property(Node)
    view: Node;
    @property(Node)
    content: Node;
    @property
    space: number = 10;
    @property({ displayName: "左侧留白" })
    paddingLeft: number = 0;
    @property({ displayName: "上侧留白" })
    paddingTop: number = 0;


    renderInfos: IRenderItemInfo[] = [];
    itemPool: Node[] = [];
    renderer: (itemNode: Node, data: any[]) => void;
    protected start(): void {
        this.scrollView.on(ScrollView.EventType.SCROLLING, this.refreshView, this);
    }
    public setData(args: {
        dataList: {
            height: number;
            data: any;
        }[],
        itemRenderer: (itemNode: Node, data: any[]) => void,
        onInstantiate: (itemNode: Node) => void,
    }) {
        this.renderInfos.forEach(e => {
            this.itemPool.push(e.item);
            e.item.active = false;
        });
        this.content.getComponent(UITransform).setAnchorPoint(v2(0, 1));
        this.renderInfos = [];
        let totalHeight = this.paddingTop;
        this.renderer = args.itemRenderer;
        args.dataList.forEach(e => {
            let item: Node = null;
            if (this.itemPool.length > 0) {
                item = this.itemPool.pop();
            }
            else {
                item = instantiate(this.itemPrefab);
                args.onInstantiate(item);
            }
            item.parent = this.content;
            item.getComponent(UITransform).setAnchorPoint(0, 1);
            item.position = v3(0, -totalHeight, 0);
            totalHeight += e.height + this.space;
            this.renderInfos.push({
                height: e.height,
                item,
                data: e.data,
                isVisible: false
            });
        });
        let contentTrans = this.content.getComponent(UITransform);
        contentTrans.setContentSize(new Size(contentTrans.width, totalHeight));
        this.refreshView();
    }
    refreshView(): void {
        let contentPos = this.content.position;
        let viewSize = this.view.getComponent(UITransform).contentSize;
        if (this.renderInfos.length === 0) return;
        const viewTopY = this.view.position.y + viewSize.height / 2;
        const viewBottomY = this.view.position.y - viewSize.height / 2;
        let currentY = -this.paddingTop;
        for (let i = 0; i < this.renderInfos.length; i++) {
            const info = this.renderInfos[i];
            const itemHeight = info.height;
            const item = info.item;
            let dirty = false;
            const itemTopY = currentY + contentPos.y;
            const itemBottomY = currentY - itemHeight + contentPos.y;
            const isInView = (
                itemBottomY < viewTopY + this.space &&
                itemTopY > viewBottomY - this.space
            );
            if (!info.isVisible && isInView)
                dirty = true;
            item.active = isInView;
            info.isVisible = isInView;
            if (isInView) {
                item.setPosition(-viewSize.width / 2 + this.paddingLeft, currentY);
            }
            if (dirty)
                this.renderer(item, info.data);

            currentY -= itemHeight + this.space;
        }
    }
    clear() {
        this.renderInfos.forEach(e => {
            e.item.destroy();
        });
        this.renderInfos = [];
        this.itemPool.forEach(e => e.destroy());
        this.itemPool = [];

    }
}


