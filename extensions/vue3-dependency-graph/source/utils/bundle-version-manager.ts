import { join } from 'path';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

export interface BundleVersionStatus {
    isLatest: boolean;
    hasLocalChanges: boolean;
    diffVersions: string[];
}

export class BundleVersionManager {
    private static getVersionFilePath() {
        return join(Editor.Project.path, 'publish-remote-bundle', 'bundle_versions.json');
    }

    static async checkVersion(): Promise<BundleVersionStatus> {
        try {
            const filePath = this.getVersionFilePath();
            
            // 检查文件是否有未提交的更改
            const gitStatus = execSync('git status --porcelain publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path,
                encoding: 'utf-8'
            }).trim();

            // 如果文件有更改，获取当前分支上的最后一次提交的版本内容
            let lastCommitContent = null;
            if (gitStatus.length > 0) {
                try {
                    lastCommitContent = execSync('git show HEAD:publish-remote-bundle/bundle_versions.json', {
                        cwd: Editor.Project.path,
                        encoding: 'utf-8'
                    });
                } catch (e) {
                    console.log('无法获取上一次提交的内容');
                }
            }

            const currentContent = readFileSync(filePath, 'utf-8');
            const currentData = JSON.parse(currentContent);
            const lastData = lastCommitContent ? JSON.parse(lastCommitContent) : null;

            // 比较版本差异
            const diffVersions = new Set<string>();
            if (lastData) {
                // 检查主版本
                if (currentData.version !== lastData.version) {
                    diffVersions.add('main');
                }
                // 检查每个 bundle 的版本
                Object.keys(currentData.bundles).forEach(bundleName => {
                    if (!lastData.bundles[bundleName] || 
                        currentData.bundles[bundleName].version !== lastData.bundles[bundleName].version) {
                        diffVersions.add(bundleName);
                    }
                });
            }

            return {
                isLatest: true,
                hasLocalChanges: gitStatus.length > 0,
                diffVersions: Array.from(diffVersions)
            };
        } catch (error) {
            console.error('检查版本失败:', error);
            return {
                isLatest: true,
                hasLocalChanges: false,
                diffVersions: []
            };
        }
    }

    static async fetchLatest(): Promise<void> {
        // 由于不再需要从远程获取，这个方法可以移除或保持为空
        console.log('当前版本即为最新版本');
    }

    static async syncToGit(): Promise<void> {
        try {
            const gitStatus = execSync('git status --porcelain publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path,
                encoding: 'utf-8'
            }).trim();

            if (gitStatus.length > 0) {
                // 读取文件内容获取版本信息
                const versionData = JSON.parse(readFileSync(this.getVersionFilePath(), 'utf-8'));
                const version = versionData.version;
                
                execSync('git add publish-remote-bundle/bundle_versions.json', {
                    cwd: Editor.Project.path
                });
                
                execSync(`git commit -m "bundle_versions.json update: ${version}"`, {
                    cwd: Editor.Project.path
                });
                
                console.log('版本文件已提交到本地仓库');
            } else {
                console.log('没有需要提交的更改');
            }
        } catch (error) {
            console.error('同步版本失败:', error);
            throw error;
        }
    }

    static async restoreFromBackup(): Promise<void> {
        try {
            // 使用 git restore 命令从暂存区恢复文件
            execSync('git restore --staged publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path
            });
            
            // 从工作区恢复文件
            execSync('git restore publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path
            });
            
            console.log('已恢复文件');
        } catch (error) {
            console.error('恢复文件失败:', error);
            throw error;
        }
    }

    static async revertToLastCommit(): Promise<void> {
        try {
            // 获取文件的最近两次提交记录
            const gitLog = execSync('git log -2 --pretty=format:"%H" publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path,
                encoding: 'utf-8'
            }).split('\n');

            if (gitLog.length < 2) {
                throw new Error('没有足够的历史提交记录');
            }

            // 获取倒数第二次提交的内容（使用具体的commit hash）
            const previousCommitHash = gitLog[1]; // 取第二个commit hash
            const lastCommitContent = execSync(`git show ${previousCommitHash}:publish-remote-bundle/bundle_versions.json`, {
                cwd: Editor.Project.path,
                encoding: 'utf-8'
            });

            // 将内容写入到当前文件
            const { writeFileSync } = require('fs-extra');
            writeFileSync(this.getVersionFilePath(), lastCommitContent, 'utf-8');
            console.log('已回退到上一版本');
        } catch (error) {
            console.error('回退版本失败:', error);
            throw error;
        }
    }
} 