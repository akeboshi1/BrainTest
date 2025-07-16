import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { readdirSync } from 'fs'; // 新增文件系统读取方法
import { copyFileSync, rmSync, renameSync } from 'fs'; // 新增文件操作方法和 renameSync 用于移动操作
import { ensureDirSync } from 'fs-extra'; // 只保留确保目录存在的方法

const MD5_REGEX = /index\.([a-f0-9]+)\.js/;

function getCurrentMD5(bundlePath: string): string {
    const files = readdirSync(bundlePath);
    const indexFile = files.find(f => MD5_REGEX.test(f));
    return indexFile ? MD5_REGEX.exec(indexFile)![1] : '';
}

export async function generateBundleVersions(targetPath: string): Promise<boolean> {
    try {
        if (!existsSync(targetPath)) {
            mkdirSync(targetPath, { recursive: true });
        }

        // bundle 目录扫描
        const bundles = readdirSync(targetPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        // 添加空检查
        if (bundles.length === 0) {
            console.warn('警告: 未找到任何 bundle 目录，请确保已经构建生成了 bundle 文件');
            Editor.Dialog.warn('未找到任何 bundle 目录，请先构建生成 bundle 文件！');
            return false;
        }

        const configPath = Editor.Project.path + "/publish-remote-bundle";
        // 读取旧版本文件
        let oldVersions = { version: "2025.2.25 0000", bundles: {}, timestamp: Math.floor(Date.now() / 1000) } as any;
        try {
            oldVersions = JSON.parse(readFileSync(join(configPath, 'bundle_versions.json'), 'utf-8'));
        } catch { }

        let hasChanges = false;
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

        const versionData = {
            version: "2025.2.25 0000", // 初始值会被覆盖
            bundles: bundles.reduce((acc, name) => {
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

        writeFileSync(
            join(targetPath, 'bundle_versions.json'),
            JSON.stringify(versionData, null, 2)
        );

        // 新增发布目录处理
        const publishPath = join(Editor.Project.path, 'publish-remote-bundle');
        if (existsSync(publishPath)) {
            rmSync(publishPath, { recursive: true, force: true });
        }
        mkdirSync(publishPath, { recursive: true });

        // 处理每个 bundle
        for (const [bundleName, data] of Object.entries(versionData.bundles)) {
            const version = data.version.split(' ')[1];
            // 修改目录结构：在版本目录下添加 bundleName 子目录
            const versionDir = join(publishPath, `${bundleName}_${version}`);
            const newDir = join(versionDir, bundleName);
            
            try {
                // 确保版本目录存在
                ensureDirSync(versionDir);

                // 使用 renameSync 移动目录
                renameSync(
                    join(targetPath, bundleName),
                    newDir
                );
            } catch (error) {
                console.error(`移动 bundle ${bundleName} 失败:`, error);
                Editor.Dialog.error(`移动 bundle ${bundleName} 失败: ${(error as Error).message}`);
                return false;
            }
        }

        // 拷贝版本文件到发布目录
        copyFileSync(
            join(targetPath, 'bundle_versions.json'),
            join(publishPath, 'bundle_versions.json')
        );

        console.log('Bundle 版本生成完成');
        Editor.Dialog.info('Bundle 版本生成成功！');
        return true;
    } catch (error) {
        console.error('发布流程失败:', error);
        Editor.Dialog.error(`发布流程失败: ${(error as Error).message}`);
        return false;
    }
}
