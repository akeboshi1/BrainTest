import { Color } from 'cc'
export class ColorUtil {
   static hexToColor(hex) {
        // 移除颜色字符串中的 #
        hex = hex.replace('#', '');
        // 解析 RGB 值
        let r = parseInt(hex.substr(0, 2), 16);
        let g = parseInt(hex.substr(2, 2), 16);
        let b = parseInt(hex.substr(4, 2), 16);
        // 创建 cc.Color 对象
        return new Color(r, g, b);
    }
}