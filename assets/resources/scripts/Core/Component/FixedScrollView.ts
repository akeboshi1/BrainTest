import { _decorator, easing, EventTouch, Node, ScrollView, Touch, UITransform, v2, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;
const EPSILON = 0.001;
@ccclass('FixedScrollView')
export class FixedScrollView extends ScrollView {
    @property
    allowTouch: boolean = true;
    @property
    isHandleReleaseScroll: boolean = true;
    @property
    isInfinity: boolean = false;
    isInTouch: boolean = false;
    static readonly FINISH_AUTO_SCROLL = "finishAutoScroll";
    get isOutOfBoundary() {
        return this._isOutOfBoundary();
    }
    get scrollAnchor() {
        let offset = this.getScrollOffset();
        let max = this.getMaxScrollOffset();
        return v2(max.x == 0 ? 0 : offset.x / max.x, max.y == 0 ? 0 : 1 - offset.y / max.y);
    }

    protected _getHowMuchOutOfBoundary(addition?: Vec3): Vec3 {
        if (this.isInfinity)
            return v3();
        else
            return super._getHowMuchOutOfBoundary(addition);
    }
    protected _calculateMovePercentDelta(options): Vec3 {
        const anchor = options.anchor;
        const applyToHorizontal = options.applyToHorizontal;
        const applyToVertical = options.applyToVertical;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        self._calculateBoundary();
        //取消了anchor.clampf
        let bottomDelta = self._getContentBottomBoundary() - self._bottomBoundary;
        bottomDelta = -bottomDelta;

        let leftDelta = self._getContentLeftBoundary() - self._leftBoundary;
        leftDelta = -leftDelta;

        const moveDelta = new Vec3();
        if (self._content && self.view) {
            let totalScrollDelta = 0;
            const uiTrans = self._content.getComponent(UITransform)!;
            const contentSize = uiTrans.contentSize;
            const scrollSize = self.view.contentSize;
            if (applyToHorizontal) {
                totalScrollDelta = contentSize.width - scrollSize.width;
                moveDelta.x = leftDelta - totalScrollDelta * anchor.x;
            }
            if (applyToVertical) {
                totalScrollDelta = contentSize.height - scrollSize.height;
                moveDelta.y = bottomDelta - totalScrollDelta * anchor.y;
            }
        }

        return moveDelta;
    }
    protected _processAutoScrolling(dt: any): void {
        const self = this;

        const isAutoScrollBrake = self._isNecessaryAutoScrollBrake();
        const brakingFactor = isAutoScrollBrake ? 0.05 : 1;
        self._autoScrollAccumulatedTime += dt * (1 / brakingFactor);

        let percentage = Math.min(1, self._autoScrollAccumulatedTime / self._autoScrollTotalTime);
        if (self._autoScrollAttenuate) {
            percentage = easing.quintOut(percentage);
        }

        const clonedAutoScrollTargetDelta = self._autoScrollTargetDelta.clone();
        clonedAutoScrollTargetDelta.multiplyScalar(percentage);
        const clonedAutoScrollStartPosition = self._autoScrollStartPosition.clone();
        clonedAutoScrollStartPosition.add(clonedAutoScrollTargetDelta);
        let reachedEnd = Math.abs(percentage - 1) <= EPSILON;

        const fireEvent = Math.abs(percentage - 1) <= self.getScrollEndedEventTiming();
        if (fireEvent && !self._isScrollEndedWithThresholdEventFired) {
            self._dispatchEvent(ScrollView.EventType.SCROLL_ENG_WITH_THRESHOLD);
            self._isScrollEndedWithThresholdEventFired = true;
        }

        if (self.elastic) {
            const brakeOffsetPosition = clonedAutoScrollStartPosition.clone();
            brakeOffsetPosition.subtract(self._autoScrollBrakingStartPosition);
            if (isAutoScrollBrake) {
                brakeOffsetPosition.multiplyScalar(brakingFactor);
            }
            clonedAutoScrollStartPosition.set(self._autoScrollBrakingStartPosition);
            clonedAutoScrollStartPosition.add(brakeOffsetPosition);
        } else {
            const moveDelta = clonedAutoScrollStartPosition.clone();
            moveDelta.subtract(self.getContentPosition());
            const outOfBoundary = self._getHowMuchOutOfBoundary(moveDelta);
            if (!outOfBoundary.equals(Vec3.ZERO, EPSILON)) {
                clonedAutoScrollStartPosition.add(outOfBoundary);
                reachedEnd = true;
            }
        }

        if (reachedEnd) {
            self._autoScrolling = false;
        }

        const deltaMove = clonedAutoScrollStartPosition.clone();
        deltaMove.subtract(self.content.position);
        self._clampDelta(deltaMove);
        self._moveContent(deltaMove, reachedEnd);
        if (deltaMove.length() > EPSILON)
            self._dispatchEvent(ScrollView.EventType.SCROLLING);

        if (!self._autoScrolling) {
            self._isBouncing = false;
            self._scrolling = false;
            self._dispatchEvent(ScrollView.EventType.SCROLL_ENDED);
            self.node.emit(FixedScrollView.FINISH_AUTO_SCROLL);
        }
    }

    protected _clampDelta(out: Vec3): void {
        if (!this.isInfinity)
            super._clampDelta(out);
    }

    protected _handleReleaseLogic(touch: Touch): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        self._getLocalAxisAlignDelta(self._deltaPos, touch);
        self._gatherTouchMove(self._deltaPos);
        if (self.isHandleReleaseScroll || this._isOutOfBoundary())
            self._processInertiaScroll();

        if (self._scrolling) {
            self._scrolling = false;
            if (!self._autoScrolling) {
                self._dispatchEvent(ScrollView.EventType.SCROLL_ENDED);
            }
        }
    }
    protected _onTouchBegan(event: EventTouch, captureListeners?: Node[]): void {
        this.isInTouch = true;
        if (!this.allowTouch)
            return;
        super._onTouchBegan(event, captureListeners);
    }
    protected _onTouchMoved(event: EventTouch, captureListeners?: Node[]): void {
        if (!this.allowTouch)
            return;
        super._onTouchMoved(event, captureListeners);

    }
    protected _onTouchCancelled(event: EventTouch, captureListeners?: Node[]): void {
        this.isInTouch = false;
        if (!this.allowTouch)
            return;
        super._onTouchCancelled(event, captureListeners);
        if (event && !event.simulate) {
            this._dispatchEvent(ScrollView.EventType.TOUCH_UP);
        }
    }
    protected _onTouchEnded(event: EventTouch, captureListeners?: Node[]): void {
        this.isInTouch = false;
        if (!this.allowTouch)
            return;
        super._onTouchEnded(event, captureListeners);
    }

    protected _hasNestedViewGroup(event: any, captureListeners?: Node[]): boolean {
        // if (!event || event.eventPhase !== Event.CAPTURING_PHASE) {
        //     return false;
        // }

        // if (captureListeners) {
        //     // captureListeners are arranged from child to parent
        //     for (let i = 0; i < captureListeners.length; i++) {
        //         const listener = captureListeners[i];
        //         if (this.node === listener) {
        //             if (event.target && (event.target as Node).getComponent(ViewGroup)) {
        //                 return true;
        //             }
        //             return false;
        //         }

        //         if (listener.getComponent(ViewGroup)) {
        //             return true;
        //         }
        //     }
        // }
        return false;
    }
}


