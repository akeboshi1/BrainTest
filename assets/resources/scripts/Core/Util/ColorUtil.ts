import { Color } from 'cc'
export class ColorUtil {
   static hexToColor(hex) {
        // 移除颜色字符串中的 #
        hex = hex.replace('#', '');
        // 解析 RGB 值
        let r = parseInt(hex.substr(0, 2), 16);
        let g = parseInt(hex.substr(2, 2), 16);
        let b = parseInt(hex.substr(4, 2), 16);
        // 创建 cc.Color 对象，alpha值设为255（完全不透明）
        return new Color(r, g, b, 255);
    }

    /**
     * 通过rgba获取cc格式的color
     * @param r
     * @param g
     * @param b
     * @param a
     */
    static getCCColor(r,g,b,a=255):Color{
       return new Color(r,g,b,a);
    }

    /**
     * 解析带alpha值的十六进制颜色字符串
     * 支持格式：RRGGBBAA 或 #RRGGBBAA
     * 例如：0077B50A 或 #0077B50A
     * @param hexWithAlpha 带alpha值的十六进制颜色字符串
     * @returns Color对象
     */
    static hexWithAlphaToColor(hexWithAlpha: string): Color {
        // 移除颜色字符串中的 #
        let hex = hexWithAlpha.replace('#', '');
        
        // 确保字符串长度为8位（RRGGBBAA）
        if (hex.length === 6) {
            // 如果没有alpha值，添加FF（完全不透明）
            hex = hex + 'FF';
        } else if (hex.length !== 8) {
            throw new Error(`Invalid color format: ${hexWithAlpha}. Expected format: RRGGBBAA or #RRGGBBAA`);
        }
        
        // 解析 RGBA 值
        let r = parseInt(hex.substr(0, 2), 16);
        let g = parseInt(hex.substr(2, 2), 16);
        let b = parseInt(hex.substr(4, 2), 16);
        let a = parseInt(hex.substr(6, 2), 16);
        
        // 创建 cc.Color 对象，alpha值直接使用0-255范围
        return new Color(r, g, b, a);
    }
}