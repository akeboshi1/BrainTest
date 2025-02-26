import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { readdirSync } from 'fs'; // 新增文件系统读取方法
import { copyFileSync, rmSync } from 'fs'; // 新增文件操作方法
import { copySync } from 'fs-extra'; // 新增文件夹拷贝方法

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

        // 新增 bundle 目录扫描
        const bundles = readdirSync(targetPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        // 读取旧版本文件
        let oldVersions = { bundles: {} } as any;
        try {
            oldVersions = JSON.parse(readFileSync(join(targetPath, 'bundle_versions.json'), 'utf-8'));
        } catch { }

        let hasChanges = false;
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

        const versionData = {
            version: "2025.2.25 1.0.0", // 会被覆盖的初始值
            bundles: bundles.reduce((acc, name) => {
                const bundlePath = join(targetPath, name);
                const currentMD5 = getCurrentMD5(bundlePath);
                const oldBundle = oldVersions.bundles?.[name] || { version: `${today} 0.0.0` };

                // 版本号自增逻辑
                let [bundleDate, bundleVersion] = oldBundle.version.split(' ');
                let [major, minor, patch] = bundleVersion.split('.').map(Number);

                if (currentMD5 !== oldBundle.md5) {
                    hasChanges = true;
                    patch = (patch + 1) % 1000;
                    bundleVersion = `${major}.${minor}.${patch.toString().padStart(3, '0')}`;
                }

                acc[name] = {
                    version: `${today} ${bundleVersion}`,
                    md5: currentMD5,
                    md5backup: currentMD5 === oldBundle.md5 ? oldBundle.md5backup : oldBundle.md5,
                    // 新增版本备份字段
                    versionbackup: currentMD5 !== oldBundle.md5 
                        ? oldBundle.version  // 版本变化时记录旧版本
                        : (oldBundle.versionbackup || oldBundle.version) // 未变化时继承旧备份
                };
                return acc;
            }, {} as Record<string, any>),
            timestamp: Math.floor(Date.now() / 1000)
        };

        // 主版本号逻辑
        const [oldDate, oldVersion] = (oldVersions.version || `${today} 0.0.0`).split(' ');
        let [mainMajor, mainMinor, mainPatch] = oldVersion.split('.').map(Number);

        if (hasChanges) {
            if (oldDate === today) {
                mainPatch = (mainPatch + 1) % 1000;
            } else {
                mainMajor += 1;
                mainMinor = 0;
                mainPatch = 0;
            }
        }

        versionData.version = `${today} ${mainMajor}.${mainMinor}.${mainPatch.toString().padStart(3, '0')}`;

        writeFileSync(
            join(targetPath, 'bundle_versions.json'),
            JSON.stringify(versionData, null, 2)
        );

        // 新增发布目录处理
        const publishPath = join(targetPath, '../publish');
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
            
            // 确保版本目录存在
            if (!existsSync(versionDir)) {
                mkdirSync(versionDir, { recursive: true });
            }

            // 使用 fs-extra 的递归拷贝（目标路径改为 newDir）
            copySync(
                join(targetPath, bundleName),
                newDir,
                {
                    recursive: true,
                    overwrite: true,
                    errorOnExist: false
                }
            );
        }
        // 拷贝版本文件（路径改为直接到 publish 目录）
        copyFileSync(
            join(targetPath, 'bundle_versions.json'),
            join(publishPath, 'bundle_versions.json')
        );
        return true;
    } catch (error) {
        console.error('发布流程失败:', error);
        return false;
    }
}
