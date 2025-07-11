import { view, screen, sys } from 'cc';

/**
 * 屏幕尺寸工具类
 * 提供多种获取屏幕尺寸的方法
 */
export class ScreenSizeUtil {
    
    /**
     * 获取逻辑尺寸（推荐用于UI适配）
     * 这是经过视图缩放后的尺寸，通常与设计尺寸一致
     */
    static getLogicalSize() {
        return view.getVisibleSize();
    }
    
    /**
     * 获取物理像素尺寸
     * 这是设备的实际像素尺寸
     */
    static getPhysicalSize() {
        return screen.windowSize;
    }
    
    /**
     * 获取设备像素比
     */
    static getDevicePixelRatio() {
        return screen.devicePixelRatio;
    }
    
    /**
     * 获取设计尺寸（基于Canvas设置）
     */
    static getDesignSize() {
        return view.getDesignResolutionSize();
    }
    
    /**
     * 获取当前视图的帧缓冲尺寸
     */
    static getFrameBufferSize() {
        return view.getFrameSize();
    }
    
    /**
     * 获取安全区域
     */
    static getSafeArea() {
        return sys.getSafeAreaRect();
    }
    
    /**
     * 获取适合UI适配的尺寸（推荐使用）
     * 优先使用逻辑尺寸，如果逻辑尺寸小于设计尺寸则使用设计尺寸
     */
    static getUISize() {
        const logicalSize = this.getLogicalSize();
        // const designSize = this.getDesignSize();

        // // 如果逻辑尺寸小于设计尺寸，使用设计尺寸
        // if (logicalSize.width < designSize.width || logicalSize.height < designSize.height) {
        //     return designSize;
        // }
        
        return logicalSize;
    }
    
    /**
     * 获取屏幕方向
     */
    static getOrientation() {
        const size = this.getLogicalSize();
        return size.width > size.height ? 'landscape' : 'portrait';
    }
    
    /**
     * 打印所有尺寸信息（用于调试）
     */
    static logAllSizes() {
        console.log('=== 屏幕尺寸信息 ===');
        console.log('逻辑尺寸:', this.getLogicalSize());
        console.log('物理尺寸:', this.getPhysicalSize());
        console.log('设计尺寸:', this.getDesignSize());
        console.log('帧缓冲尺寸:', this.getFrameBufferSize());
        console.log('设备像素比:', this.getDevicePixelRatio());
        console.log('安全区域:', this.getSafeArea());
        console.log('UI适配尺寸:', this.getUISize());
        console.log('屏幕方向:', this.getOrientation());
        console.log('==================');
    }
} 