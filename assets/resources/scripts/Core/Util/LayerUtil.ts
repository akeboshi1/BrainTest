import { director, Node, UITransform } from "cc";
import { DebugLog } from "./DebugLog";


export class LayerUtil {
    private static panelLayerSortOrder = 1000;
    private static alertLayerSortOrder = 2000;
    private static loaderLayerSortOrder = 3000;

    public static getPanelLayer():Node | null{
        const scene = director.getScene();
        if(!scene){
            DebugLog.instance.warn('getPanelLayer --- scene is not exist');
            return null;
        }

        const canvas = scene.getChildByName('Canvas');
        if(!canvas){
            DebugLog.instance.warn('getPanelLayer --- canvas is not exist');
            return null;
        }

        let layer:Node = canvas.getChildByName('LayerUtil_PanelLayer');
        if(!layer){
            layer = new Node('LayerUtil_PanelLayer');
            canvas.addChild(layer);
            layer.setSiblingIndex(LayerUtil.panelLayerSortOrder);
            layer.addComponent(UITransform);
            let size = canvas.getComponent(UITransform).contentSize;
            layer.getComponent(UITransform).setContentSize(size);
        }

        return layer;    
    }

    public static getAlertLayer():Node | null{
        const scene = director.getScene();
        if(!scene){
            DebugLog.instance.warn('getAlertLayer --- scene is not exist');
            return null;
        }

        const canvas = scene.getChildByName('Canvas');
        if(!canvas){
            DebugLog.instance.warn('getAlertLayer --- canvas is not exist');
            return null;
        }

        let layer:Node = canvas.getChildByName('LayerUtil_AlertLayer');
        if(!layer){
            layer = new Node('LayerUtil_AlertLayer');
            canvas.addChild(layer);
            layer.setSiblingIndex(LayerUtil.alertLayerSortOrder);
            layer.addComponent(UITransform);
            let size = canvas.getComponent(UITransform).contentSize;
            layer.getComponent(UITransform).setContentSize(size);
        }

        return layer;   
    }

    public static getLoaderLayer():Node | null{
        const scene = director.getScene();
        if(!scene){
            DebugLog.instance.warn('getLoaderLayer --- scene is not exist');
            return null;
        }

        const canvas = scene.getChildByName('Canvas');
        if(!canvas){
            DebugLog.instance.warn('getLoaderLayer --- canvas is not exist');
            return null;
        }

        let layer:Node = canvas.getChildByName('LayerUtil_LoaderLayer');
        if(!layer){
            layer = new Node('LayerUtil_LoaderLayer');
            canvas.addChild(layer);
            layer.setSiblingIndex(LayerUtil.loaderLayerSortOrder);
            layer.addComponent(UITransform);
            let size = canvas.getComponent(UITransform).contentSize;
            layer.getComponent(UITransform).setContentSize(size);
        }

        return layer;  
    }

    /**
     * 获取当前场景中最上层的节点
     * 动态查找Canvas下层级最高的子节点
     */
    public static getTopLayer():Node | null{
        const scene = director.getScene();
        if(!scene){
            DebugLog.instance.warn('getTopLayer --- scene is not exist');
            return null;
        }

        const canvas = scene.getChildByName('Canvas');
        if(!canvas){
            DebugLog.instance.warn('getTopLayer --- canvas is not exist');
            return null;
        }

        // 获取Canvas的所有子节点
        const children = canvas.children;
        if(children.length === 0){
            DebugLog.instance.warn('getTopLayer --- canvas has no children');
            return canvas; // 如果没有子节点，返回Canvas本身
        }

        // 找到层级最高的节点（siblingIndex最大的）
        let topNode = children[0];
        let maxSiblingIndex = topNode.getSiblingIndex();
        
        for(let i = 1; i < children.length; i++){
            const child = children[i];
            const siblingIndex = child.getSiblingIndex();
            if(siblingIndex > maxSiblingIndex){
                maxSiblingIndex = siblingIndex;
                topNode = child;
            }
        }

        return topNode;
    }

    /**
     * 创建一个新的顶层节点并添加到最上层
     * @param nodeName 节点名称
     * @returns 新创建的节点
     */
    public static createTopLayer(nodeName: string = 'TopLayer'):Node | null{
        const scene = director.getScene();
        if(!scene){
            DebugLog.instance.warn('createTopLayer --- scene is not exist');
            return null;
        }

        const canvas = scene.getChildByName('Canvas');
        if(!canvas){
            DebugLog.instance.warn('createTopLayer --- canvas is not exist');
            return null;
        }

        // 获取当前最高层级
        const currentTopLayer = this.getTopLayer();
        const currentTopSiblingIndex = currentTopLayer ? currentTopLayer.getSiblingIndex() : 0;

        // 创建新的顶层节点
        const newTopLayer = new Node(nodeName);
        canvas.addChild(newTopLayer);
        
        // 设置为比当前最高层级更高的层级
        newTopLayer.setSiblingIndex(currentTopSiblingIndex + 1);
        newTopLayer.addComponent(UITransform);
        
        // 设置尺寸为Canvas的尺寸
        const canvasSize = canvas.getComponent(UITransform).contentSize;
        newTopLayer.getComponent(UITransform).setContentSize(canvasSize);

        return newTopLayer;
    }
}


