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

    /**
     * 不同难度对应的数据数组
     * 难度0: 简单难度对应的数据数组
     * 难度1: 中等难度对应的数据数组
     * 难度2: 困难难度对应的数据数组
     */
    private readonly DIFFICULTY_DATA_ARRAYS: { [key: number]: any[] } = {
        0: ["fruit", "vegetable"], // 简单难度数据数组，需要根据实际数据填充
        1: ["fruit", "vegetable", "thing"], // 中等难度数据数组，需要根据实际数据填充
        2: ["fruit", "vegetable", "thing"]  // 困难难度数据数组，需要根据实际数据填充
    };

    /**
     * 不同难度对应的数量
     */
    public readonly DIFFICULTY_COUNTS: number[] = [9, 16, 24];

    /**
     * 不同难度需求的总数量
     */
    public readonly DIFICULTY_NEEDS:number[]=[5,10,15];

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
        const totalNeedCount = this.DIFICULTY_NEEDS[hardIndex];
        const folderCount = folderArray.length; // 文件夹类型数量
        let imageCount = instance.imageCount;
        
        // 确保 imageCount 小于 totalCount
        if (imageCount >= totalCount) {
            imageCount = totalCount - 1;
            console.warn(`imageCount(${instance.imageCount}) 大于等于 totalCount(${totalCount})，已调整为 ${imageCount}`);
        }
        
        // 计算每种类型的最小需求数量（从question需求中获取）
        // 这个计算方式与getQuestionDatas保持一致
        const baseNeedCount = Math.floor(totalNeedCount / folderCount);
        const needRemainder = totalNeedCount % folderCount;
        
        // 为每个文件夹类型分配数量，确保至少满足question需求
        const baseCountPerFolder = Math.floor(totalCount / folderCount); // 每个文件夹类型的基础数量
        const remainder = totalCount % folderCount; // 余数，需要额外分配的数量
        
        // 先计算每种类型的最小需求数量
        const minNeedCounts: number[] = [];
        for (let i = 0; i < folderCount; i++) {
            minNeedCounts.push(baseNeedCount + (i < needRemainder ? 1 : 0));
        }
        
        // 计算每种类型的基础分配数量
        const baseAllocatedCounts: number[] = [];
        for (let i = 0; i < folderCount; i++) {
            baseAllocatedCounts.push(baseCountPerFolder + (i < remainder ? 1 : 0));
        }
        
        // 确保每种类型的数量至少等于需求数量
        const folderImageCounts: number[] = [];
        let totalAllocated = 0;
        for (let i = 0; i < folderCount; i++) {
            const minNeed = minNeedCounts[i];
            const baseAllocated = baseAllocatedCounts[i];
            const count = Math.max(baseAllocated, minNeed);
            folderImageCounts.push(count);
            totalAllocated += count;
        }
        
        // 如果总分配数量超过totalCount，需要调整
        if (totalAllocated > totalCount) {
            // 按比例缩减，但确保每种类型至少满足需求数量
            const scale = (totalCount - minNeedCounts.reduce((sum, count) => sum + count, 0)) / 
                          (totalAllocated - minNeedCounts.reduce((sum, count) => sum + count, 0));
            
            let remaining = totalCount;
            for (let i = 0; i < folderCount; i++) {
                const minNeed = minNeedCounts[i];
                const extra = Math.floor((folderImageCounts[i] - minNeed) * scale);
                folderImageCounts[i] = minNeed + extra;
                remaining -= folderImageCounts[i];
            }
            
            // 将剩余数量分配给前几个类型
            for (let i = 0; i < remaining && i < folderCount; i++) {
                folderImageCounts[i]++;
            }
        }
        
        let currentIndex = 1; // 全局索引
        
        // 遍历每个文件夹类型
        for (let folderIdx = 0; folderIdx < folderCount; folderIdx++) {
            const folderName = String(folderArray[folderIdx]);
            const imagePath = `texture/${folderName}/`;
            
            // 使用计算好的数量
            const folderImageCount = folderImageCounts[folderIdx];
            
            // 计算当前文件夹类型中每个图片编号应该出现的次数
            const baseCountPerImage = Math.floor(folderImageCount / imageCount);
            const imageRemainder = folderImageCount % imageCount;
            
            // 创建当前文件夹类型的图片编号数组
            const imageNumbers: number[] = [];
            for (let i = 1; i <= imageCount; i++) {
                const count = baseCountPerImage + (i <= imageRemainder ? 1 : 0);
                for (let j = 0; j < count; j++) {
                    imageNumbers.push(i);
                }
            }
            
            // 打乱当前文件夹类型的图片编号顺序
            this.shuffleArray(imageNumbers);
            
            // 生成当前文件夹类型的图片数据
            for (let i = 0; i < folderImageCount; i++) {
                const imageNumber = imageNumbers[i];
                const imageName = `${imagePath}${folderName}${imageNumber}`;
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

        // 获取该难度的总需求数量
        const totalNeedCount = this.DIFICULTY_NEEDS[hardIndex];
        
        // 使用所有有效类型，平均分配数量
        const selectedTypes = [...validTypes];
        
        // 平均分配数量到各个类型
        const baseCount = Math.floor(totalNeedCount / selectedTypes.length);
        const remainder = totalNeedCount % selectedTypes.length;

        // 生成二维数组：把同一个类型的所有question分到一个数组里面
        const questionDatas: string[][] = [];
        for (let i = 0; i < selectedTypes.length; i++) {
            // 前 remainder 个类型多分配一个
            const count = baseCount + (i < remainder ? 1 : 0);
            const type = selectedTypes[i];
            
            // 创建包含该类型所有数量的数组
            const typeArray: string[] = [];
            for (let j = 0; j < count; j++) {
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
        const imageName = `${imagePath}${selectedType}${randomImageNumber}`;
        
        const imageData: ImageData = {
            path: imageName,
            folderName: selectedType,
            index: 0, // 临时索引，实际使用时不需要
            type: selectedType
        };

        return imageData;
    }
}

