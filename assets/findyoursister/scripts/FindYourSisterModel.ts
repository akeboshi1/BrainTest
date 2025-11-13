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

    /**
     * 不同难度对应的数据数组
     * 难度0: 简单难度对应的数据数组
     * 难度1: 中等难度对应的数据数组
     * 难度2: 困难难度对应的数据数组
     */
    private readonly DIFFICULTY_DATA_ARRAYS: { [key: number]: any[] } = {
        0: ["fruit", "vegetable"], // 简单难度数据数组，需要根据实际数据填充
        1: ["plant", "ball", "car"], // 中等难度数据数组，需要根据实际数据填充
        2: ["animal", "food", "thing"]  // 困难难度数据数组，需要根据实际数据填充
    };

    /**
     * 不同难度对应的数量（所有难度都是24个）
     */
    public readonly DIFFICULTY_COUNTS: number[] = [24, 24, 24];

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

    public getImageDatas(): ImageData[] {
        const instance = FindYourSisterModel.getInstance();
        const hardIndex = instance.hardIndex;
        
        // 获取对应难度的文件夹数组（包含所有可用类型）
        const folderArray = this.DIFFICULTY_DATA_ARRAYS[hardIndex];
        if (!folderArray || folderArray.length === 0) {
            console.warn(`难度 ${hardIndex} 的图片文件夹数组为空`);
            return [];
        }
        
        const imageDatas: ImageData[] = [];
        const totalCount = this.DIFFICULTY_COUNTS[hardIndex];
        const folderCount = folderArray.length; // 文件夹类型数量
        let imageCount = instance.imageCount;
        
        // 平均分配每个文件夹需要提取的图片数量
        const baseCountPerFolder = Math.floor(totalCount / folderCount); // 每个文件夹类型的基础数量
        const remainder = totalCount % folderCount; // 余数，需要额外分配的数量
        
        // 计算每个文件夹的图片数量
        const folderImageCounts: number[] = [];
        for (let i = 0; i < folderCount; i++) {
            // 前 remainder 个文件夹多分配一个
            folderImageCounts.push(baseCountPerFolder + (i < remainder ? 1 : 0));
        }
        
        let currentIndex = 1; // 全局索引
        
        // 遍历每个文件夹类型
        for (let folderIdx = 0; folderIdx < folderCount; folderIdx++) {
            const folderName = String(folderArray[folderIdx]);
            const imagePath = `texture/${folderName}/`;
            
            // 使用计算好的数量
            const folderImageCount = folderImageCounts[folderIdx];
            
            // 创建当前文件夹类型的图片编号数组（随机从文件夹中获取）
            // 如果资源长度不够，重新随机获取重复资源，可以多次重复
            const imageNumbers: number[] = [];
            
            if (imageCount > 0) {
                // 随机从文件夹中获取图片编号
                // 如果资源数量少于需求数量，通过重复使用来满足需求
                for (let i = 0; i < folderImageCount; i++) {
                    // 随机选择一个图片编号（1 到 imageCount）
                    // 允许重复使用同一个资源，可以多次重复
                    const randomImageNumber = Math.floor(Math.random() * imageCount) + 1;
                    imageNumbers.push(randomImageNumber);
                }
            } else {
                // 如果 imageCount 为 0 或无效，使用默认图片编号 1
                console.warn(`类型 ${folderName} 的图片数量为 0，使用默认图片编号`);
                for (let i = 0; i < folderImageCount; i++) {
                    imageNumbers.push(1);
                }
            }
            
            // 生成当前文件夹类型的图片数据
            for (let i = 0; i < folderImageCount; i++) {
                const imageNumber = imageNumbers[i];
                const imageName = `${imagePath}emoji${imageNumber}`;
                const imageData: ImageData = {
                    path: imageName,
                    folderName: folderName,
                    index: currentIndex++,
                    type: folderName
                };
                imageDatas.push(imageData);
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
        
        // 获取当前难度对应的可用类型数组
        const folderArray = this.DIFFICULTY_DATA_ARRAYS[hardIndex];
        if (!folderArray || folderArray.length === 0) {
            console.warn(`难度 ${hardIndex} 的图片文件夹数组为空`);
            return [];
        }

        // 转换为字符串数组，用于匹配
        const availableTypes = folderArray.map(t => String(t));
        
        if (!imageTypes || imageTypes.length === 0) {
            console.warn("图片类型数组为空");
            return [];
        }

        // 过滤：只保留在当前难度可用类型范围内的图片类型
        const validTypes = imageTypes.filter(type => availableTypes.includes(type));
        
        if (validTypes.length === 0) {
            console.warn(`图片类型 ${imageTypes.join(", ")} 不在当前难度 ${hardIndex} 的可用类型范围内`);
            return [];
        }

        // 获取该难度每个类型需求的数量（每个类型固定数量，不是总数）
        const countPerType = this.DIFICULTY_NEEDS[hardIndex];
        
        // 使用所有有效类型，每个类型都使用固定数量
        const selectedTypes = [...validTypes];

        // 生成二维数组：把同一个类型的所有question分到一个数组里面
        const questionDatas: string[][] = [];
        for (let i = 0; i < selectedTypes.length; i++) {
            const type = selectedTypes[i];
            
            // 创建包含该类型所有数量的数组（每个类型都是固定数量）
            const typeArray: string[] = [];
            for (let j = 0; j < countPerType; j++) {
                typeArray.push(type);
            }
            questionDatas.push(typeArray);
        }

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
        
        // 获取对应难度的文件夹数组
        const folderArray = this.DIFFICULTY_DATA_ARRAYS[hardIndex];
        if (!folderArray || folderArray.length === 0) {
            return null;
        }

        // 随机选择一个需要的类型
        const randomTypeIndex = Math.floor(Math.random() * needTypes.length);
        const selectedType = needTypes[randomTypeIndex];
        
        // 验证类型是否在可用类型中
        const availableTypes = folderArray.map(t => String(t));
        if (!availableTypes.includes(selectedType)) {
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

