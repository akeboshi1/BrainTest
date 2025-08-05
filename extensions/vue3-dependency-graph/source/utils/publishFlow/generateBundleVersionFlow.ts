import { BaseProcessFlow } from './baseFlow';
import { FinishMethod } from './interfaces';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { readdirSync } from 'fs';
import { copyFileSync, rmSync, renameSync } from 'fs';
import { ensureDirSync, moveSync } from 'fs-extra';

/**
 * 生成Bundle版本流程参数
 */
export interface GenerateBundleVersionParams {
    /**
     * 项目路径
     */
    projectPath: string;

    /**
     * 目标路径（构建输出路径）
     */
    targetPath: string;
}

/**
 * MD5提取正则表达式
 */
const MD5_REGEX = /index\.([a-f0-9]+)\.js/;

/**
 * 获取当前Bundle的MD5
 */
function getCurrentMD5(bundlePath: string): string {
    const files = readdirSync(bundlePath);
    const indexFile = files.find(f => MD5_REGEX.test(f));
    return indexFile ? MD5_REGEX.exec(indexFile)![1] : '';
}

/**
 * 生成Bundle版本流程
 */
export class GenerateBundleVersionFlow extends BaseProcessFlow {
    private onFinishedCallback: ((method: FinishMethod, message?: string, changedBundles?: string[]) => void) | null = null;
    private canceled: boolean = false;
    private currentBundleName: string = '';
    private totalBundles: number = 0;
    private processedBundles: number = 0;
    private changedBundles: string[] = [];

    constructor() {
        super('生成Bundle版本', '生成远程Bundle版本文件并准备发布目录');
    }

    /**
     * 启动流程
     * @param params 生成Bundle版本参数
     */
    async start(params: GenerateBundleVersionParams): Promise<void> {
        if (this.isRunning) {
            console.warn('生成Bundle版本流程已在运行');
            return;
        }

        this.isRunning = true;
        this.canceled = false;
        this.currentBundleName = '';
        this.processedBundles = 0;
        this.totalBundles = 0;
        this.changedBundles = [];

        this.updateProgress(0, '准备生成Bundle版本');

        try {
            const { projectPath, targetPath } = params;

            // 检查目标路径是否存在
            if (!existsSync(targetPath)) {
                this.updateProgress(5, '创建目标目录');
                mkdirSync(targetPath, { recursive: true });
            }

            // bundle 目录扫描
            this.updateProgress(10, '扫描Bundle目录');
            const bundles = readdirSync(targetPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            // 添加空检查
            if (bundles.length === 0) {
                console.warn('警告: 未找到任何 bundle 目录，请确保已经构建生成了 bundle 文件');
                this.handleFinish(FinishMethod.FAILURE, '未找到任何 bundle 目录，请先构建生成 bundle 文件！');
                return;
            }

            this.totalBundles = bundles.length;

            const configPath = join(projectPath, 'publish-remote-bundle');
            // 读取旧版本文件
            let oldVersions = { version: "2025.2.25 0000", bundles: {}, timestamp: Math.floor(Date.now() / 1000) } as any;
            try {
                oldVersions = JSON.parse(readFileSync(join(configPath, 'bundle_versions.json'), 'utf-8'));
                this.updateProgress(15, '已读取现有版本文件');
            } catch (error) {
                this.updateProgress(15, '无现有版本文件，将创建新文件');
            }

            if (this.canceled) {
                this.handleFinish(FinishMethod.FAILURE, '操作已取消');
                return;
            }

            let hasChanges = false;
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

            this.updateProgress(20, '分析Bundle变化');

            const versionData = {
                version: "2025.2.25 0000", // 初始值会被覆盖
                bundles: bundles.reduce((acc, name, index) => {
                    this.currentBundleName = name;
                    const progressPercent = 20 + Math.floor((index / bundles.length) * 10);
                    this.updateProgress(progressPercent, `分析Bundle: ${name}`);

                    const bundlePath = join(targetPath, name);
                    const currentMD5 = getCurrentMD5(bundlePath);
                    const oldBundle = oldVersions.bundles?.[name] || { version: `${today} 0000` };

                    // 版本号自增逻辑
                    let [bundleDate, bundleVersion] = oldBundle.version.split(' ');
                    let version = parseInt(bundleVersion);

                    if (currentMD5 !== oldBundle.md5) {
                        hasChanges = true;
                        version = (version + 1) % 10000;
                        bundleVersion = version.toString().padStart(4, '0');
                        this.changedBundles.push(name + "_" + bundleVersion);
                    }

                    acc[name] = {
                        version: currentMD5 !== oldBundle.md5
                            ? `${today} ${bundleVersion}`  // MD5变化时生成新版本号
                            : oldBundle.version,           // MD5未变化时保持原版本号
                        md5: currentMD5,
                        md5backup: currentMD5 === oldBundle.md5 ? oldBundle.md5backup : oldBundle.md5,
                        versionbackup: currentMD5 !== oldBundle.md5
                            ? oldBundle.version
                            : (oldBundle.versionbackup || oldBundle.version)
                    };

                    if (this.canceled) {
                        throw new Error('操作已取消');
                    }

                    return acc;
                }, {} as Record<string, any>),
                timestamp: hasChanges ? Math.floor(Date.now() / 1000) : oldVersions.timestamp
            };

            // 主版本号逻辑
            const [oldDate, oldVersion] = (oldVersions.version || `${today} 0000`).split(' ');
            let mainVersion = parseInt(oldVersion);

            let changeDay = oldDate;
            if (hasChanges) {
                mainVersion = (mainVersion + 1) % 10000;
                changeDay = today;
            }

            versionData.version = `${changeDay} ${mainVersion.toString().padStart(4, '0')}`;

            this.updateProgress(35, '写入版本文件');
            writeFileSync(
                join(targetPath, 'bundle_versions.json'),
                JSON.stringify(versionData, null, 2)
            );

            // 新增发布目录处理
            const publishPath = join(projectPath, 'publish-remote-bundle');
            if (existsSync(publishPath)) {
                this.updateProgress(40, '清理旧的发布目录');
                rmSync(publishPath, { recursive: true, force: true });
            }

            this.updateProgress(45, '创建发布目录');
            mkdirSync(publishPath, { recursive: true });

            // 处理每个 bundle
            this.updateProgress(50, '开始处理每个Bundle');

            for (let i = 0; i < bundles.length; i++) {
                if (this.canceled) {
                    throw new Error('操作已取消');
                }

                const bundleName = bundles[i];
                const data = versionData.bundles[bundleName];
                this.currentBundleName = bundleName;
                this.processedBundles = i;

                const progressPercent = 50 + Math.floor((i / bundles.length) * 40);
                this.updateProgress(progressPercent, `处理Bundle: ${bundleName}`);

                const version = data.version.split(' ')[1];
                // 修改目录结构：在版本目录下添加 bundleName 子目录
                const versionDir = join(publishPath, `${bundleName}_${version}`);
                const newDir = join(versionDir, bundleName);

                try {
                    // 确保版本目录存在
                    ensureDirSync(versionDir);

                    // 使用 moveSync 移动并重命名目录（自动覆盖目标）
                    moveSync(
                        join(targetPath, bundleName),
                        newDir,
                        { overwrite: true }
                    );
                } catch (error) {
                    console.error(`移动 bundle ${bundleName} 失败:`, error);
                    throw new Error(`移动 bundle ${bundleName} 失败: ${(error as Error).message}`);
                }
            }

            // 拷贝版本文件到发布目录
            this.updateProgress(95, '拷贝版本文件到发布目录');
            copyFileSync(
                join(targetPath, 'bundle_versions.json'),
                join(publishPath, 'bundle_versions.json')
            );

            this.updateProgress(100, '版本生成完成');
            this.handleFinish(FinishMethod.SUCCESS, '版本生成成功', this.changedBundles);
        } catch (error) {
            if (this.canceled) {
                this.handleFinish(FinishMethod.FAILURE, '操作已取消', this.changedBundles);
            } else {
                console.error('生成Bundle版本失败:', error);
                this.handleFinish(FinishMethod.FAILURE, `生成失败: ${error instanceof Error ? error.message : String(error)}`, this.changedBundles);
            }
        }
    }

    /**
     * 设置完成回调
     */
    setFinishedCallback(callback: (method: FinishMethod, message?: string, changedBundles?: string[]) => void): void {
        this.onFinishedCallback = callback;
    }

    /**
     * 完成回调
     */
    onFinished(method: FinishMethod, message?: string, changedBundles?: string[]): void {
        if (this.onFinishedCallback) {
            this.onFinishedCallback(method, message, changedBundles);
        }
        this.isRunning = false;
    }

    /**
     * 取消流程
     */
    cancel(): void {
        if (!this.isRunning) {
            return;
        }

        this.canceled = true;
        console.log('正在取消生成Bundle版本流程...');
    }

    /**
     * 获取当前处理的Bundle信息
     */
    getCurrentProcessInfo(): { current: string, processed: number, total: number } {
        return {
            current: this.currentBundleName,
            processed: this.processedBundles,
            total: this.totalBundles
        };
    }

    /**
     * 处理流程完成
     */
    protected handleFinish(method: FinishMethod, message?: string, changedBundles?: string[]): void {
        this.isRunning = false;

        // 记录完成状态
        console.log(`生成Bundle版本${method === FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);

        // 调用完成回调
        this.onFinished(method, message, changedBundles);
    }
} 