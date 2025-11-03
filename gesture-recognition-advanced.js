/**
 * 高级手势识别模块
 * 使用MediaPipe进行手部关键点检测和手势识别
 */

class AdvancedGestureRecognition {
    constructor() {
        this.gestureDatabase = this.initializeGestureDatabase();
        this.gestureHistory = [];
        this.maxHistoryLength = 10;
        this.smoothingFactor = 0.7;
    }

    /**
     * 初始化手势数据库
     */
    initializeGestureDatabase() {
        return {
            // 基础手势
            'fist': {
                name: '拳头',
                description: '所有手指弯曲',
                pattern: [false, false, false, false, false],
                confidence: 0.9
            },
            'open_palm': {
                name: '张开手掌',
                description: '所有手指伸直',
                pattern: [true, true, true, true, true],
                confidence: 0.9
            },
            'thumbs_up': {
                name: '点赞',
                description: '拇指向上，其他手指弯曲',
                pattern: [true, false, false, false, false],
                confidence: 0.8
            },
            'peace': {
                name: '胜利手势',
                description: '食指和中指伸直',
                pattern: [false, true, true, false, false],
                confidence: 0.8
            },
            'ok': {
                name: 'OK手势',
                description: '拇指和食指形成圆圈',
                pattern: 'special_ok',
                confidence: 0.7
            },
            'pointing': {
                name: '指向',
                description: '食指伸直指向',
                pattern: [false, true, false, false, false],
                confidence: 0.7
            },
            'rock_on': {
                name: '摇滚手势',
                description: '食指和小指伸直',
                pattern: [false, true, false, false, true],
                confidence: 0.8
            },
            'call_me': {
                name: '打电话手势',
                description: '拇指和小指伸直',
                pattern: [true, false, false, false, true],
                confidence: 0.7
            }
        };
    }

    /**
     * 计算两点之间的距离
     */
    calculateDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        const dz = point1.z - point2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * 计算角度
     */
    calculateAngle(point1, point2, point3) {
        const vector1 = {
            x: point1.x - point2.x,
            y: point1.y - point2.y
        };
        const vector2 = {
            x: point3.x - point2.x,
            y: point3.y - point2.y
        };
        
        const dot = vector1.x * vector2.x + vector1.y * vector2.y;
        const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
        const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        
        return Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    }

    /**
     * 检测手指是否伸直
     */
    isFingerExtended(landmarks, fingerIndices) {
        const [tip, pip, mcp] = fingerIndices;
        
        // 计算手指的弯曲角度
        const angle = this.calculateAngle(landmarks[tip], landmarks[pip], landmarks[mcp]);
        
        // 如果角度大于160度，认为手指伸直
        return angle > 160;
    }

    /**
     * 检测拇指是否伸直（特殊处理）
     */
    isThumbExtended(landmarks) {
        // 拇指的检测需要特殊处理，因为它的运动方向不同
        const thumbTip = landmarks[4];
        const thumbMcp = landmarks[2];
        const indexMcp = landmarks[5];
        
        // 计算拇指尖到食指根部的距离
        const distance = this.calculateDistance(thumbTip, indexMcp);
        
        // 如果距离足够大，认为拇指伸直
        return distance > 0.1;
    }

    /**
     * 检测OK手势
     */
    detectOKGesture(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        
        // 计算拇指尖和食指尖的距离
        const distance = this.calculateDistance(thumbTip, indexTip);
        
        // 如果距离很小，可能是OK手势
        if (distance < 0.05) {
            // 检查其他手指是否伸直
            const middleExtended = this.isFingerExtended(landmarks, [12, 10, 9]);
            const ringExtended = this.isFingerExtended(landmarks, [16, 14, 13]);
            const pinkyExtended = this.isFingerExtended(landmarks, [20, 18, 17]);
            
            if (middleExtended && ringExtended && pinkyExtended) {
                return { isOK: true, confidence: 0.8 };
            }
        }
        
        return { isOK: false, confidence: 0 };
    }

    /**
     * 获取手指状态
     */
    getFingerStates(landmarks) {
        const fingerIndices = [
            [4, 3, 2],   // 拇指
            [8, 6, 5],   // 食指
            [12, 10, 9], // 中指
            [16, 14, 13], // 无名指
            [20, 18, 17]  // 小指
        ];

        const fingerStates = [];
        
        // 拇指特殊处理
        fingerStates.push(this.isThumbExtended(landmarks));
        
        // 其他四指
        for (let i = 1; i < fingerIndices.length; i++) {
            fingerStates.push(this.isFingerExtended(landmarks, fingerIndices[i]));
        }
        
        return fingerStates;
    }

    /**
     * 识别手势
     */
    recognizeGesture(landmarks) {
        if (!landmarks || landmarks.length < 21) {
            return { name: '无效手势', confidence: 0, details: {} };
        }

        // 获取手指状态
        const fingerStates = this.getFingerStates(landmarks);
        
        // 检测特殊手势
        const okGesture = this.detectOKGesture(landmarks);
        if (okGesture.isOK) {
            return {
                name: 'OK手势',
                confidence: okGesture.confidence,
                details: {
                    fingerStates,
                    specialGesture: 'OK'
                }
            };
        }

        // 匹配基础手势模式
        let bestMatch = { name: '未知手势', confidence: 0, details: {} };
        
        for (const [key, gesture] of Object.entries(this.gestureDatabase)) {
            if (gesture.pattern === 'special_ok') continue; // 已经检测过了
            
            const matchScore = this.calculatePatternMatch(fingerStates, gesture.pattern);
            const confidence = matchScore * gesture.confidence;
            
            if (confidence > bestMatch.confidence) {
                bestMatch = {
                    name: gesture.name,
                    confidence: confidence,
                    details: {
                        fingerStates,
                        pattern: gesture.pattern,
                        matchScore,
                        description: gesture.description
                    }
                };
            }
        }

        // 应用历史平滑
        return this.applyHistorySmoothing(bestMatch);
    }

    /**
     * 计算模式匹配分数
     */
    calculatePatternMatch(fingerStates, pattern) {
        if (fingerStates.length !== pattern.length) return 0;
        
        let matches = 0;
        for (let i = 0; i < fingerStates.length; i++) {
            if (fingerStates[i] === pattern[i]) {
                matches++;
            }
        }
        
        return matches / fingerStates.length;
    }

    /**
     * 应用历史平滑
     */
    applyHistorySmoothing(currentGesture) {
        // 添加到历史记录
        this.gestureHistory.push(currentGesture);
        
        // 保持历史记录长度
        if (this.gestureHistory.length > this.maxHistoryLength) {
            this.gestureHistory.shift();
        }
        
        // 如果历史记录不足，直接返回当前手势
        if (this.gestureHistory.length < 3) {
            return currentGesture;
        }
        
        // 计算最近几个手势的平均置信度
        const recentGestures = this.gestureHistory.slice(-5);
        const gestureGroups = {};
        
        recentGestures.forEach(gesture => {
            if (!gestureGroups[gesture.name]) {
                gestureGroups[gesture.name] = [];
            }
            gestureGroups[gesture.name].push(gesture.confidence);
        });
        
        // 找到最稳定的手势
        let bestStableGesture = currentGesture;
        let bestStability = 0;
        
        for (const [name, confidences] of Object.entries(gestureGroups)) {
            const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
            const stability = confidences.length * avgConfidence;
            
            if (stability > bestStability) {
                bestStability = stability;
                bestStableGesture = {
                    name: name,
                    confidence: avgConfidence,
                    details: {
                        ...currentGesture.details,
                        stability: stability,
                        historyLength: confidences.length
                    }
                };
            }
        }
        
        return bestStableGesture;
    }

    /**
     * 分析手部运动
     */
    analyzeHandMovement(landmarks, previousLandmarks) {
        if (!previousLandmarks) return null;
        
        // 计算手腕的移动
        const wrist = landmarks[0];
        const prevWrist = previousLandmarks[0];
        
        const movement = {
            x: wrist.x - prevWrist.x,
            y: wrist.y - prevWrist.y,
            z: wrist.z - prevWrist.z
        };
        
        const speed = Math.sqrt(movement.x * movement.x + movement.y * movement.y + movement.z * movement.z);
        
        // 分析运动方向
        let direction = 'static';
        if (speed > 0.01) {
            if (Math.abs(movement.x) > Math.abs(movement.y)) {
                direction = movement.x > 0 ? 'right' : 'left';
            } else {
                direction = movement.y > 0 ? 'down' : 'up';
            }
        }
        
        return {
            speed: speed,
            direction: direction,
            movement: movement
        };
    }

    /**
     * 获取手势详细信息
     */
    getGestureDetails(landmarks) {
        const fingerStates = this.getFingerStates(landmarks);
        const fingerNames = ['拇指', '食指', '中指', '无名指', '小指'];
        
        const details = {
            fingerStates: fingerStates.map((state, index) => ({
                name: fingerNames[index],
                extended: state,
                status: state ? '伸直' : '弯曲'
            })),
            extendedCount: fingerStates.filter(state => state).length,
            landmarks: landmarks.map((point, index) => ({
                index: index,
                x: point.x.toFixed(4),
                y: point.y.toFixed(4),
                z: point.z.toFixed(4)
            }))
        };
        
        return details;
    }

    /**
     * 重置历史记录
     */
    resetHistory() {
        this.gestureHistory = [];
    }

    /**
     * 获取支持的手势列表
     */
    getSupportedGestures() {
        return Object.values(this.gestureDatabase).map(gesture => ({
            name: gesture.name,
            description: gesture.description
        }));
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedGestureRecognition;
} else if (typeof window !== 'undefined') {
    window.AdvancedGestureRecognition = AdvancedGestureRecognition;
} 