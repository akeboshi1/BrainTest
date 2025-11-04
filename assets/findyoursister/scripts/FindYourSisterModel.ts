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
}

/**
 * 找一找游戏算法模型
 * 根据难度从对应不同数组中随机出对应数量的数据
 */
export class FindYourSisterModel {


    private static _model: FindYourSisterModel = null;

    public static getInstance(): FindYourSisterModel {
        if (!this._model) {
            this._model = new FindYourSisterModel();
        }
        return this._model;
    }

    public hardIndex: number = 0;

    public hards: number[] = [9, 16, 25];

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
    private readonly DIFFICULTY_COUNTS: number[] = [9, 16, 24];

    /**
     * 根据名称拼接图片路径
     * @param folderName 图片文件夹名称
     * @returns 图片路径，格式：texture/文件夹名/spriteFrame
     */
    private buildImagePath(folderName: string): string {
        return `texture/${folderName}/spriteFrame`;
    }

    public getImageDatas(): ImageData[] {
        const instance = FindYourSisterModel.getInstance();
        const hardIndex = instance.hardIndex;
        
        // 获取对应难度的文件夹数组
        const folderArray = this.DIFFICULTY_DATA_ARRAYS[hardIndex];
        if (!folderArray || folderArray.length === 0) {
            console.warn(`难度 ${hardIndex} 的图片文件夹数组为空`);
            return [];
        }
        
        // 从文件夹数组中随机选择一个文件夹名称
        const randomFolderIndex = Math.floor(Math.random() * folderArray.length);
        const selectedFolderName = String(folderArray[randomFolderIndex]);
        const imagePath = `texture/${selectedFolderName}/`;
        
        const imageDatas: ImageData[] = [];
        const totalCount = this.DIFFICULTY_COUNTS[hardIndex];
        let imageCount = instance.imageCount;
        
        // 确保 imageCount 小于 totalCount
        if (imageCount >= totalCount) {
            imageCount = totalCount - 1;
            console.warn(`imageCount(${instance.imageCount}) 大于等于 totalCount(${totalCount})，已调整为 ${imageCount}`);
        }
        
        // 生成指定数量的图片数据
        for (let i = 1; i <= totalCount; i++) {
            // 随机生成 1 到 imageCount 之间的数字
            const randomValue = Math.floor(Math.random() * imageCount) + 1;
            const imageName = `${imagePath}${selectedFolderName}${randomValue}`;
            const imageData: ImageData = {
                path: imageName,
                folderName: selectedFolderName,
                index: i
            };
            imageDatas.push(imageData);
        }
        
        return imageDatas;
    }
}

