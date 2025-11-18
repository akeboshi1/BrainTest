/**
 * 图片数据接口
 */
export interface ImageData {
    /** 图片路径 */
    path: string;
    /** 图片文件夹名称 */
    folderName: string;
    /** 索引 */
    index: number;
    /**
     * 图片类型 eg：fruit，vegetable等
     */
    type:string;
}


/**
 * 每个找东西需要的数据
 */
export interface QuestionData {
    /**
     * 需要的数量
     */
    count: number;
    /**
     * 图片类型 eg：fruit，vegetable等
     */
    type:string;
}

/**
 * 找一找游戏算法模型
 * 根据难度从对应不同数组中随机出对应数量的数据
 */
export class FindYourSisterModel {


    private static _model: FindYourSisterModel = null;

    public static TYPE_FRUIT: string = "fruit";
    public static TYPE_VEGETABLE: string = "vegetable";
    public static TYPE_THING: string = "thing";
    public static TYPE_PLANT: string = "plant";
    public static TYPE_BALL: string = "ball";
    public static TYPE_CAR: string = "car";
    public static TYPE_ANIMAL: string = "animal";
    public static TYPE_FOOD: string = "food";

    public static getInstance(): FindYourSisterModel {
        if (!this._model) {
            this._model = new FindYourSisterModel();
        }
        return this._model;
    }

    public hardIndex: number = 0;

    private imageCount: number = 20;

    public setHardIndex(hardIndex: number): void {
        this.hardIndex = hardIndex;
    }

    public getImageCount(): number {
        return this.imageCount;
    }

    private readonly TOTAL_LIST: string[] = ["fruit", "vegetable", "plant", "ball", "car", "animal", "food", "thing"];

    private readonly DEFAULT_LIST: string[] = ["default"];

    // /**
    //  * 不同难度对应的数据数组
    //  * 难度0: 简单难度对应的数据数组
    //  * 难度1: 中等难度对应的数据数组
    //  * 难度2: 困难难度对应的数据数组
    //  */
    // private readonly DIFFICULTY_DATA_ARRAYS: { [key: number]: any[] } = {
    //     0: ["fruit", "vegetable"], // 简单难度数据数组，需要根据实际数据填充
    //     1: ["plant", "ball", "car"], // 中等难度数据数组，需要根据实际数据填充
    //     2: ["animal", "food", "thing"]  // 困难难度数据数组，需要根据实际数据填充
    // };

    /**
     * 不同难度对应的数量（所有难度都是24个）
     */
    public readonly DIFFICULTY_COUNTS: number[] = [16, 16, 16];

    /**
     * 不同难度每个类型需求的数量（不是总数量）
     * 难度0: 每个类型3个
     * 难度1: 每个类型4个
     * 难度2: 每个类型5个
     */
    public readonly DIFICULTY_NEEDS:number[]=[3,4,5];

    /**
     * 根据名称拼接图片路径
     * @param folderName 图片文件夹名称
     * @returns 图片路径，格式：texture/文件夹名/spriteFrame
     */
    private buildImagePath(folderName: string): string {
        return `texture/${folderName}/spriteFrame`;
    }

    /**
     * 打乱数组顺序（Fisher-Yates 洗牌算法）
     * @param array 要打乱的数组
     */
    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 从指定类型中随机获取一个未使用过的图片路径
     * @param type 类型名称
     * @param imageCount 该类型的图片总数
     * @param usedPaths 已使用的图片路径集合
     * @returns 图片路径，如果找不到则返回null
     */
    private getRandomUnusedImagePath(type: string, imageCount: number, usedPaths: Set<string>): string | null {
        const imagePath = `texture/${type}/`;
        const availableNumbers: number[] = [];
        
        // 收集所有可用的图片编号
        for (let i = 1; i <= imageCount; i++) {
            const imageName = `${imagePath}emoji${i}`;
            if (!usedPaths.has(imageName)) {
                availableNumbers.push(i);
            }
        }
        
        // 如果没有可用的图片，返回null
        if (availableNumbers.length === 0) {
            console.warn(`类型 ${type} 的所有图片都已使用，无法获取新的图片`);
            return null;
        }
        
        // 随机选择一个可用的图片编号
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const randomImageNumber = availableNumbers[randomIndex];
        return `${imagePath}emoji${randomImageNumber}`;
    }

    private _preList :number[]=[];
    public getImageDatas(): ImageData[] {
        const instance = FindYourSisterModel.getInstance();
        const hardIndex = instance.hardIndex;
        
        const imageDatas: ImageData[] = [];
        const totalCount = this.DIFFICULTY_COUNTS[hardIndex]; // 难度只用来选择需求数量（16个）
        const priorityCount = this.DIFICULTY_NEEDS[hardIndex]; // 优先类型的数量（只生成这个数量）
        let imageCount = instance.imageCount;
        
        // 记录已使用的图片路径，确保不重复
        const usedPaths: Set<string> = new Set();
        
        // 记录已使用的类型（除了优先类型），确保其他类型不重复
        const usedTypes: Set<string> = new Set();
        
        // 从 TOTAL_LIST 中随机选出一个类型作为优先类型
        // 保证 _preList 中不包含 randomIndex，否则则一直随机这个索引
        // 如果所有类型都已被选过，清空 _preList 重新开始
        if (this._preList.length >= this.TOTAL_LIST.length) {
            this._preList = [];
        }
        
        let randomIndex = Math.floor(Math.random() * this.TOTAL_LIST.length);
        let maxAttempts = 10000; // 最大尝试次数，防止无限循环
        let attempts = 0;
        
        // 持续随机，直到找到一个不在 _preList 中的索引
        while (this._preList.includes(randomIndex) && attempts < maxAttempts) {
            attempts++;
            randomIndex = Math.floor(Math.random() * this.TOTAL_LIST.length);
        }
        
        if (attempts >= maxAttempts) {
            console.warn(`尝试了 ${maxAttempts} 次仍无法找到不在 _preList 中的索引，使用当前索引`);
        }
        
        // 将选中的索引添加到 _preList
        this._preList.push(randomIndex);
        const priorityType = this.TOTAL_LIST[randomIndex];
        
        // 获取其余类型列表（排除优先类型）
        const otherTypes = this.TOTAL_LIST.filter(type => type !== priorityType);
        
        // 只生成 needCount 数量的优先类型图片（每个图片路径不能重复）
        // 如果找不到，继续随机找，直到找到为止
        for (let i = 0; i < priorityCount; i++) {
            let imageName: string | null = null;
            let maxAttempts = 10000; // 最大尝试次数，防止无限循环
            let attempts = 0;
            
            // 持续随机找，直到找到可用的图片为止
            while (!imageName && attempts < maxAttempts) {
                attempts++;
                imageName = this.getRandomUnusedImagePath(priorityType, imageCount, usedPaths);
                
                // 如果当前类型找不到，继续尝试（可能会因为图片数量不足而需要多次尝试）
                if (!imageName) {
                    // 如果该类型的所有图片都已使用，尝试从所有类型中找（包括优先类型和其他类型）
                    // 但优先类型应该优先使用自己的图片，所以这里继续尝试
                    continue;
                }
            }
            
            if (imageName) {
                usedPaths.add(imageName);
                const imageData: ImageData = {
                    path: imageName,
                    folderName: priorityType,
                    index: 0, // 临时索引，后面会重新分配
                    type: priorityType
                };
                imageDatas.push(imageData);
            } else {
                console.error(`尝试了 ${maxAttempts} 次仍无法找到优先类型 ${priorityType} 的可用图片`);
            }
        }
        
        // 剩余位置用其他类型填充，优先每个类型只出现一次，如果不够则允许重复使用，但图片路径不能重复
        const remainingCount = totalCount - imageDatas.length;
        
        // 打乱其余类型列表，确保随机性
        const shuffledOtherTypes = [...otherTypes];
        this.shuffleArray(shuffledOtherTypes);
        
        // 使用其他类型填充剩余位置
        // 优先使用未使用过的类型，如果所有类型都已使用，则允许重复使用，但图片路径不能重复
        // 如果找不到，继续随机找，直到找到为止
        for (let i = 0; i < remainingCount; i++) {
            let imageName: string | null = null;
            let selectedType: string | null = null;
            let maxAttempts = 10000; // 最大尝试次数，防止无限循环
            let attempts = 0;
            
            // 持续随机找，直到找到可用的图片为止
            while (!imageName && attempts < maxAttempts) {
                attempts++;
                
                // 优先选择还没有使用过的类型
                const unusedTypes = shuffledOtherTypes.filter(type => !usedTypes.has(type));
                
                if (unusedTypes.length > 0) {
                    // 如果还有未使用的类型，随机选择一个
                    const randomIndex = Math.floor(Math.random() * unusedTypes.length);
                    selectedType = unusedTypes[randomIndex];
                } else {
                    // 如果所有类型都已使用，从所有类型中随机选择（允许重复使用类型）
                    const randomIndex = Math.floor(Math.random() * shuffledOtherTypes.length);
                    selectedType = shuffledOtherTypes[randomIndex];
                }
                
                // 尝试获取该类型的未使用图片
                imageName = this.getRandomUnusedImagePath(selectedType, imageCount, usedPaths);
                
                // 如果当前类型找不到，继续随机尝试其他类型
                if (!imageName) {
                    // 随机打乱类型列表，增加随机性
                    this.shuffleArray(shuffledOtherTypes);
                    continue;
                }
            }
            
            // 如果找到了可用的图片
            if (imageName && selectedType) {
                // 如果是第一次使用该类型，标记为已使用
                if (!usedTypes.has(selectedType)) {
                    usedTypes.add(selectedType);
                }
                
                usedPaths.add(imageName);
                const imageData: ImageData = {
                    path: imageName,
                    folderName: selectedType,
                    index: 0, // 临时索引，后面会重新分配
                    type: selectedType
                };
                imageDatas.push(imageData);
            } else {
                console.error(`尝试了 ${maxAttempts} 次仍无法找到可用的图片，剩余 ${remainingCount - i} 个位置无法填充`);
                break;
            }
        }
        
        // 最后打乱所有图片数据，确保不同类型随机分布
        this.shuffleArray(imageDatas);
        
        // 重新分配索引
        for (let i = 0; i < imageDatas.length; i++) {
            imageDatas[i].index = i + 1;
        }
        
        return imageDatas;
    }

    /**
     * 根据难度和实际图片类型获取游戏需求数据
     * @param imageTypes 实际生成的图片类型数组（从getImageDatas中统计）
     * @returns 二维数组，每个子数组是一个组（每组1-5个元素）
     */
    public getQuestionDatas(imageTypes: string[]): string[][] {
        const instance = FindYourSisterModel.getInstance();
        const hardIndex = instance.hardIndex;
        
        if (!imageTypes || imageTypes.length === 0) {
            console.warn("图片类型数组为空");
            return [];
        }

        // 统计每个类型的数量
        const typeCountMap: Map<string, number> = new Map();
        for (const type of imageTypes) {
            const count = typeCountMap.get(type) || 0;
            typeCountMap.set(type, count + 1);
        }

        // 找出数量最多的类型（即优先类型）
        let maxCount = 0;
        let priorityType: string | null = null;
        for (const [type, count] of typeCountMap.entries()) {
            if (count > maxCount) {
                maxCount = count;
                priorityType = type;
            }
        }

        if (!priorityType) {
            console.warn("无法找到优先类型");
            return [];
        }

        // 获取该难度每个类型需求的数量（每个类型固定数量，不是总数）
        const countPerType = this.DIFICULTY_NEEDS[hardIndex];

        // 生成二维数组：返回优先类型的question数组
        const questionDatas: string[][] = [];
        const typeArray: string[] = [];
        for (let j = 0; j < countPerType; j++) {
            typeArray.push(priorityType);
        }
        questionDatas.push(typeArray);

        return questionDatas;
    }

    /**
     * 根据需求类型随机获取一个ImageData
     * @param needTypes 需要的类型数组（类型且数量大于0）
     * @returns 随机获取的ImageData，如果找不到则返回null
     */
    public getRandomImageDataByTypes(needTypes: string[]): ImageData | null {
        if (!needTypes || needTypes.length === 0) {
            return null;
        }

        const instance = FindYourSisterModel.getInstance();
        const hardIndex = instance.hardIndex;
        
        // 随机选择一个需要的类型
        const randomTypeIndex = Math.floor(Math.random() * needTypes.length);
        const selectedType = needTypes[randomTypeIndex];
        
        // 验证类型是否在 TOTAL_LIST 中
        if (!this.TOTAL_LIST.includes(selectedType)) {
            return null;
        }

        const imagePath = `texture/${selectedType}/`;
        let imageCount = instance.imageCount;
        const totalCount = this.DIFFICULTY_COUNTS[hardIndex];
        
        // 确保 imageCount 小于 totalCount
        if (imageCount >= totalCount) {
            imageCount = totalCount - 1;
        }

        // 随机生成1到imageCount之间的数字
        const randomImageNumber = Math.floor(Math.random() * imageCount) + 1;
        const imageName = `${imagePath}emoji${randomImageNumber}`;
        
        const imageData: ImageData = {
            path: imageName,
            folderName: selectedType,
            index: 0, // 临时索引，实际使用时不需要
            type: selectedType
        };

        return imageData;
    }
}

