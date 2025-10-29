import { approx, EPSILON, Size, UITransform, v2, Widget } from "cc";

enum AlignFlags {
    /**
     * @en Align top.
     *
     * @zh 上边对齐。
     */
    TOP = 1 << 0,
    /**
     * @en Align middle.
     *
     * @zh 垂直中心对齐。
     */
    MID = 1 << 1,
    /**
     * @en Align bottom.
     *
     * @zh 下边对齐。
     */
    BOT = 1 << 2,
    /**
     * @en Align left.
     *
     * @zh 左边对齐。
     */
    LEFT = 1 << 3,
    /**
     * @en Align center.
     *
     * @zh 横向中心对齐。
     */
    CENTER = 1 << 4,
    /**
     * @en Align right.
     *
     * @zh 右边对齐。
     */
    RIGHT = 1 << 5,
    /**
     * @en Align horizontal.
     *
     * @zh 横向对齐。
     */
    HORIZONTAL = LEFT | CENTER | RIGHT,
    /**
     * @en Align vertical.
     *
     * @zh 纵向对齐。
     */
    VERTICAL = TOP | MID | BOT,
}
export class WidgetUtils {

    static align(parentTrans: UITransform, targetTrans: UITransform) {
        let widget = targetTrans.getComponent(Widget);
        if (!widget)
            return;
        const targetSize = parentTrans.contentSize;
        const targetAnchor = v2();

        // const childTrans = node._getUITransformComp()!;
        let x = targetTrans.node.position.x;
        let y = targetTrans.node.position.y;
        const anchor = targetTrans.anchorPoint;
        const scale = targetTrans.node.scale;    // It is a reference of Node's scale, don't change its value in this function.

        let width = targetTrans.width;;
        if (widget.alignFlags & AlignFlags.HORIZONTAL) {
            let localLeft = 0;
            let localRight = 0;
            const targetWidth = targetSize.width;
            localLeft = -parentTrans.anchorX * parentTrans.width;
            localRight = (1 - parentTrans.anchorX) * parentTrans.width;

            // adjust borders according to offsets
            localLeft += widget.isAbsoluteLeft ? widget.left : widget.left * targetWidth;
            localRight -= widget.isAbsoluteRight ? widget.right : widget.right * targetWidth;


            let anchorX = anchor.x;
            let scaleX = scale.x;
            if (scaleX < 0) {
                anchorX = 1.0 - anchorX;
                scaleX = -scaleX;
            }
            if (widget.isStretchWidth) {
                width = localRight - localLeft;
                if (scaleX !== 0) {
                    targetTrans.width = width / scaleX;
                }
                x = localLeft + anchorX * width;
            } else {
                width = targetTrans.width * scaleX;
                if (widget.isAlignHorizontalCenter) {
                    let localHorizontalCenter = widget.isAbsoluteHorizontalCenter ? widget.horizontalCenter : widget.horizontalCenter * targetWidth;
                    let targetCenter = (0.5 - targetAnchor.x) * targetSize.width;
                    x = targetCenter + (anchorX - 0.5) * width + localHorizontalCenter;
                } else if (widget.isAlignLeft) {
                    x = localLeft + anchorX * width;
                } else {
                    x = localRight + (anchorX - 1) * width;
                }
                if (!approx(scaleX, 0, EPSILON)) {
                    width /= scaleX;
                } else {
                    width = targetTrans.width;
                }
            }
        }

        let height = targetTrans.height;
        if (widget.alignFlags & AlignFlags.VERTICAL) {
            let localTop = 0;
            let localBottom = 0;
            const targetHeight = targetSize.height;
            localBottom = -parentTrans.anchorY * parentTrans.height;
            localTop = (1 - parentTrans.anchorY) * parentTrans.height;

            // adjust borders according to offsets
            localBottom += widget.isAbsoluteBottom ? widget.bottom : widget.bottom * targetHeight;
            localTop -= widget.isAbsoluteTop ? widget.top : widget.top * targetHeight;


            let anchorY = anchor.y;
            let scaleY = scale.y;
            if (scaleY < 0) {
                anchorY = 1.0 - anchorY;
                scaleY = -scaleY;
            }
            if (widget.isStretchHeight) {
                height = localTop - localBottom;
                if (scaleY !== 0) {
                    targetTrans.height = height / scaleY;
                }
                y = localBottom + anchorY * height;
            } else {
                height = targetTrans.height * scaleY;
                if (widget.isAlignVerticalCenter) {
                    let localVerticalCenter = widget.isAbsoluteVerticalCenter ? widget.verticalCenter : widget.verticalCenter * targetHeight;
                    let targetMiddle = (0.5 - targetAnchor.y) * targetSize.height;
                    y = targetMiddle + (anchorY - 0.5) * height + localVerticalCenter;
                } else if (widget.isAlignBottom) {
                    y = localBottom + anchorY * height;
                } else {
                    y = localTop + (anchorY - 1) * height;
                }
                if (!approx(scaleY, 0, EPSILON)) {
                    height /= scaleY;
                } else {
                    height = targetTrans.height;
                }
            }

        }
        return { size: new Size(width, height), pos: v2(x, y) };
    }

}
