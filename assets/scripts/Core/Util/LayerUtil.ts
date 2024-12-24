import { Canvas, Component, director, find, instantiate, Node } from "cc";
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
        }

        return layer;  
    }
}


