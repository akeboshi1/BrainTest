"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleVersionManager = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
class BundleVersionManager {
    static getVersionFilePath() {
        return (0, path_1.join)(Editor.Project.path, 'publish-remote-bundle', 'bundle_versions.json');
    }
    static async checkVersion() {
        try {
            const filePath = this.getVersionFilePath();
            // 检查文件是否有未提交的更改
            const gitStatus = (0, child_process_1.execSync)('git status --porcelain publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path,
                encoding: 'utf-8'
            }).trim();
            // 如果文件有更改，获取当前分支上的最后一次提交的版本内容
            let lastCommitContent = null;
            if (gitStatus.length > 0) {
                try {
                    lastCommitContent = (0, child_process_1.execSync)('git show HEAD:publish-remote-bundle/bundle_versions.json', {
                        cwd: Editor.Project.path,
                        encoding: 'utf-8'
                    });
                }
                catch (e) {
                    console.log('无法获取上一次提交的内容');
                }
            }
            const currentContent = (0, fs_1.readFileSync)(filePath, 'utf-8');
            const currentData = JSON.parse(currentContent);
            const lastData = lastCommitContent ? JSON.parse(lastCommitContent) : null;
            // 比较版本差异
            const diffVersions = new Set();
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
        }
        catch (error) {
            console.error('检查版本失败:', error);
            return {
                isLatest: true,
                hasLocalChanges: false,
                diffVersions: []
            };
        }
    }
    static async fetchLatest() {
        // 由于不再需要从远程获取，这个方法可以移除或保持为空
        console.log('当前版本即为最新版本');
    }
    static async syncToGit() {
        try {
            const gitStatus = (0, child_process_1.execSync)('git status --porcelain publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path,
                encoding: 'utf-8'
            }).trim();
            if (gitStatus.length > 0) {
                // 读取文件内容获取版本信息
                const versionData = JSON.parse((0, fs_1.readFileSync)(this.getVersionFilePath(), 'utf-8'));
                const version = versionData.version;
                (0, child_process_1.execSync)('git add publish-remote-bundle/bundle_versions.json', {
                    cwd: Editor.Project.path
                });
                (0, child_process_1.execSync)(`git commit -m "bundle_versions.json update: ${version}"`, {
                    cwd: Editor.Project.path
                });
                console.log('版本文件已提交到本地仓库');
            }
            else {
                console.log('没有需要提交的更改');
            }
        }
        catch (error) {
            console.error('同步版本失败:', error);
            throw error;
        }
    }
    static async restoreFromBackup() {
        try {
            // 使用 git restore 命令从暂存区恢复文件
            (0, child_process_1.execSync)('git restore --staged publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path
            });
            // 从工作区恢复文件
            (0, child_process_1.execSync)('git restore publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path
            });
            console.log('已恢复文件');
        }
        catch (error) {
            console.error('恢复文件失败:', error);
            throw error;
        }
    }
    static async revertToLastCommit() {
        try {
            // 获取文件的最近两次提交记录
            const gitLog = (0, child_process_1.execSync)('git log -2 --pretty=format:"%H" publish-remote-bundle/bundle_versions.json', {
                cwd: Editor.Project.path,
                encoding: 'utf-8'
            }).split('\n');
            if (gitLog.length < 2) {
                throw new Error('没有足够的历史提交记录');
            }
            // 获取倒数第二次提交的内容（使用具体的commit hash）
            const previousCommitHash = gitLog[1]; // 取第二个commit hash
            const lastCommitContent = (0, child_process_1.execSync)(`git show ${previousCommitHash}:publish-remote-bundle/bundle_versions.json`, {
                cwd: Editor.Project.path,
                encoding: 'utf-8'
            });
            // 将内容写入到当前文件
            const { writeFileSync } = require('fs-extra');
            writeFileSync(this.getVersionFilePath(), lastCommitContent, 'utf-8');
            console.log('已回退到上一版本');
        }
        catch (error) {
            console.error('回退版本失败:', error);
            throw error;
        }
    }
}
exports.BundleVersionManager = BundleVersionManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLXZlcnNpb24tbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS91dGlscy9idW5kbGUtdmVyc2lvbi1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtCQUE0QjtBQUM1QiwyQkFBa0M7QUFDbEMsaURBQXlDO0FBUXpDLE1BQWEsb0JBQW9CO0lBQ3JCLE1BQU0sQ0FBQyxrQkFBa0I7UUFDN0IsT0FBTyxJQUFBLFdBQUksRUFBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVk7UUFDckIsSUFBSSxDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFFM0MsZ0JBQWdCO1lBQ2hCLE1BQU0sU0FBUyxHQUFHLElBQUEsd0JBQVEsRUFBQyxtRUFBbUUsRUFBRTtnQkFDNUYsR0FBRyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSTtnQkFDeEIsUUFBUSxFQUFFLE9BQU87YUFDcEIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRVYsOEJBQThCO1lBQzlCLElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1lBQzdCLElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDO29CQUNELGlCQUFpQixHQUFHLElBQUEsd0JBQVEsRUFBQywwREFBMEQsRUFBRTt3QkFDckYsR0FBRyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSTt3QkFDeEIsUUFBUSxFQUFFLE9BQU87cUJBQ3BCLENBQUMsQ0FBQztnQkFDUCxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDaEMsQ0FBQztZ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QyxhQUFhLENBQUMsQ0FBQztZQUNuQyxDQUFDO1lBRUQsaUNBQWlDO1lBQ2pDLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCO1lBQ3hELE1BQU0saUJBQWlCLEdBQUcsSUFBQSx3QkFBUSxFQUFDLFlBQVksa0JBQWtCLDZDQUE2QyxFQUFFO2dCQUM1RyxHQUFHLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJO2dCQUN4QixRQUFRLEVBQUUsT0FBTzthQUNwQixDQUFDLENBQUM7WUFFSCxhQUFhO1lBQ2IsTUFBTSxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUM5QyxhQUFhLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sS0FBSyxDQUFDO1FBQ2hCLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUFqSkQsb0RBaUpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XHJcbmltcG9ydCB7IGV4ZWNTeW5jIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEJ1bmRsZVZlcnNpb25TdGF0dXMge1xyXG4gICAgaXNMYXRlc3Q6IGJvb2xlYW47XHJcbiAgICBoYXNMb2NhbENoYW5nZXM6IGJvb2xlYW47XHJcbiAgICBkaWZmVmVyc2lvbnM6IHN0cmluZ1tdO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQnVuZGxlVmVyc2lvbk1hbmFnZXIge1xyXG4gICAgcHJpdmF0ZSBzdGF0aWMgZ2V0VmVyc2lvbkZpbGVQYXRoKCkge1xyXG4gICAgICAgIHJldHVybiBqb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdwdWJsaXNoLXJlbW90ZS1idW5kbGUnLCAnYnVuZGxlX3ZlcnNpb25zLmpzb24nKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgYXN5bmMgY2hlY2tWZXJzaW9uKCk6IFByb21pc2U8QnVuZGxlVmVyc2lvblN0YXR1cz4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gdGhpcy5nZXRWZXJzaW9uRmlsZVBhdGgoKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOajgOafpeaWh+S7tuaYr+WQpuacieacquaPkOS6pOeahOabtOaUuVxyXG4gICAgICAgICAgICBjb25zdCBnaXRTdGF0dXMgPSBleGVjU3luYygnZ2l0IHN0YXR1cyAtLXBvcmNlbGFpbiBwdWJsaXNoLXJlbW90ZS1idW5kbGUvYnVuZGxlX3ZlcnNpb25zLmpzb24nLCB7XHJcbiAgICAgICAgICAgICAgICBjd2Q6IEVkaXRvci5Qcm9qZWN0LnBhdGgsXHJcbiAgICAgICAgICAgICAgICBlbmNvZGluZzogJ3V0Zi04J1xyXG4gICAgICAgICAgICB9KS50cmltKCk7XHJcblxyXG4gICAgICAgICAgICAvLyDlpoLmnpzmlofku7bmnInmm7TmlLnvvIzojrflj5blvZPliY3liIbmlK/kuIrnmoTmnIDlkI7kuIDmrKHmj5DkuqTnmoTniYjmnKzlhoXlrrlcclxuICAgICAgICAgICAgbGV0IGxhc3RDb21taXRDb250ZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgaWYgKGdpdFN0YXR1cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhc3RDb21taXRDb250ZW50ID0gZXhlY1N5bmMoJ2dpdCBzaG93IEhFQUQ6cHVibGlzaC1yZW1vdGUtYnVuZGxlL2J1bmRsZV92ZXJzaW9ucy5qc29uJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjd2Q6IEVkaXRvci5Qcm9qZWN0LnBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuY29kaW5nOiAndXRmLTgnXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+aXoOazleiOt+WPluS4iuS4gOasoeaPkOS6pOeahOWGheWuuScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50Q29udGVudCA9IHJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnREYXRhID0gSlNPTi5wYXJzZShjdXJyZW50Q29udGVudCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGxhc3REYXRhID0gbGFzdENvbW1pdENvbnRlbnQgPyBKU09OLnBhcnNlKGxhc3RDb21taXRDb250ZW50KSA6IG51bGw7XHJcblxyXG4gICAgICAgICAgICAvLyDmr5TovoPniYjmnKzlt67lvIJcclxuICAgICAgICAgICAgY29uc3QgZGlmZlZlcnNpb25zID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgICAgICAgICAgIGlmIChsYXN0RGF0YSkge1xyXG4gICAgICAgICAgICAgICAgLy8g5qOA5p+l5Li754mI5pysXHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudERhdGEudmVyc2lvbiAhPT0gbGFzdERhdGEudmVyc2lvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpZmZWZXJzaW9ucy5hZGQoJ21haW4nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIOajgOafpeavj+S4qiBidW5kbGUg55qE54mI5pysXHJcbiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhjdXJyZW50RGF0YS5idW5kbGVzKS5mb3JFYWNoKGJ1bmRsZU5hbWUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbGFzdERhdGEuYnVuZGxlc1tidW5kbGVOYW1lXSB8fCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudERhdGEuYnVuZGxlc1tidW5kbGVOYW1lXS52ZXJzaW9uICE9PSBsYXN0RGF0YS5idW5kbGVzW2J1bmRsZU5hbWVdLnZlcnNpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlZlcnNpb25zLmFkZChidW5kbGVOYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGlzTGF0ZXN0OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgaGFzTG9jYWxDaGFuZ2VzOiBnaXRTdGF0dXMubGVuZ3RoID4gMCxcclxuICAgICAgICAgICAgICAgIGRpZmZWZXJzaW9uczogQXJyYXkuZnJvbShkaWZmVmVyc2lvbnMpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign5qOA5p+l54mI5pys5aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGlzTGF0ZXN0OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgaGFzTG9jYWxDaGFuZ2VzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGRpZmZWZXJzaW9uczogW11cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGFzeW5jIGZldGNoTGF0ZXN0KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIC8vIOeUseS6juS4jeWGjemcgOimgeS7jui/nOeoi+iOt+WPlu+8jOi/meS4quaWueazleWPr+S7peenu+mZpOaIluS/neaMgeS4uuepulxyXG4gICAgICAgIGNvbnNvbGUubG9nKCflvZPliY3niYjmnKzljbPkuLrmnIDmlrDniYjmnKwnKTtcclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgYXN5bmMgc3luY1RvR2l0KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGdpdFN0YXR1cyA9IGV4ZWNTeW5jKCdnaXQgc3RhdHVzIC0tcG9yY2VsYWluIHB1Ymxpc2gtcmVtb3RlLWJ1bmRsZS9idW5kbGVfdmVyc2lvbnMuanNvbicsIHtcclxuICAgICAgICAgICAgICAgIGN3ZDogRWRpdG9yLlByb2plY3QucGF0aCxcclxuICAgICAgICAgICAgICAgIGVuY29kaW5nOiAndXRmLTgnXHJcbiAgICAgICAgICAgIH0pLnRyaW0oKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChnaXRTdGF0dXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8g6K+75Y+W5paH5Lu25YaF5a656I635Y+W54mI5pys5L+h5oGvXHJcbiAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uRGF0YSA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHRoaXMuZ2V0VmVyc2lvbkZpbGVQYXRoKCksICd1dGYtOCcpKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSB2ZXJzaW9uRGF0YS52ZXJzaW9uO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBleGVjU3luYygnZ2l0IGFkZCBwdWJsaXNoLXJlbW90ZS1idW5kbGUvYnVuZGxlX3ZlcnNpb25zLmpzb24nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3dkOiBFZGl0b3IuUHJvamVjdC5wYXRoXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZXhlY1N5bmMoYGdpdCBjb21taXQgLW0gXCJidW5kbGVfdmVyc2lvbnMuanNvbiB1cGRhdGU6ICR7dmVyc2lvbn1cImAsIHtcclxuICAgICAgICAgICAgICAgICAgICBjd2Q6IEVkaXRvci5Qcm9qZWN0LnBhdGhcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn54mI5pys5paH5Lu25bey5o+Q5Lqk5Yiw5pys5Zyw5LuT5bqTJyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5rKh5pyJ6ZyA6KaB5o+Q5Lqk55qE5pu05pS5Jyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCflkIzmraXniYjmnKzlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIGFzeW5jIHJlc3RvcmVGcm9tQmFja3VwKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIOS9v+eUqCBnaXQgcmVzdG9yZSDlkb3ku6Tku47mmoLlrZjljLrmgaLlpI3mlofku7ZcclxuICAgICAgICAgICAgZXhlY1N5bmMoJ2dpdCByZXN0b3JlIC0tc3RhZ2VkIHB1Ymxpc2gtcmVtb3RlLWJ1bmRsZS9idW5kbGVfdmVyc2lvbnMuanNvbicsIHtcclxuICAgICAgICAgICAgICAgIGN3ZDogRWRpdG9yLlByb2plY3QucGF0aFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOS7juW3peS9nOWMuuaBouWkjeaWh+S7tlxyXG4gICAgICAgICAgICBleGVjU3luYygnZ2l0IHJlc3RvcmUgcHVibGlzaC1yZW1vdGUtYnVuZGxlL2J1bmRsZV92ZXJzaW9ucy5qc29uJywge1xyXG4gICAgICAgICAgICAgICAgY3dkOiBFZGl0b3IuUHJvamVjdC5wYXRoXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+W3suaBouWkjeaWh+S7ticpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+aBouWkjeaWh+S7tuWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBzdGF0aWMgYXN5bmMgcmV2ZXJ0VG9MYXN0Q29tbWl0KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIOiOt+WPluaWh+S7tueahOacgOi/keS4pOasoeaPkOS6pOiusOW9lVxyXG4gICAgICAgICAgICBjb25zdCBnaXRMb2cgPSBleGVjU3luYygnZ2l0IGxvZyAtMiAtLXByZXR0eT1mb3JtYXQ6XCIlSFwiIHB1Ymxpc2gtcmVtb3RlLWJ1bmRsZS9idW5kbGVfdmVyc2lvbnMuanNvbicsIHtcclxuICAgICAgICAgICAgICAgIGN3ZDogRWRpdG9yLlByb2plY3QucGF0aCxcclxuICAgICAgICAgICAgICAgIGVuY29kaW5nOiAndXRmLTgnXHJcbiAgICAgICAgICAgIH0pLnNwbGl0KCdcXG4nKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChnaXRMb2cubGVuZ3RoIDwgMikge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCfmsqHmnInotrPlpJ/nmoTljoblj7Lmj5DkuqTorrDlvZUnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8g6I635Y+W5YCS5pWw56ys5LqM5qyh5o+Q5Lqk55qE5YaF5a6577yI5L2/55So5YW35L2T55qEY29tbWl0IGhhc2jvvIlcclxuICAgICAgICAgICAgY29uc3QgcHJldmlvdXNDb21taXRIYXNoID0gZ2l0TG9nWzFdOyAvLyDlj5bnrKzkuozkuKpjb21taXQgaGFzaFxyXG4gICAgICAgICAgICBjb25zdCBsYXN0Q29tbWl0Q29udGVudCA9IGV4ZWNTeW5jKGBnaXQgc2hvdyAke3ByZXZpb3VzQ29tbWl0SGFzaH06cHVibGlzaC1yZW1vdGUtYnVuZGxlL2J1bmRsZV92ZXJzaW9ucy5qc29uYCwge1xyXG4gICAgICAgICAgICAgICAgY3dkOiBFZGl0b3IuUHJvamVjdC5wYXRoLFxyXG4gICAgICAgICAgICAgICAgZW5jb2Rpbmc6ICd1dGYtOCdcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyDlsIblhoXlrrnlhpnlhaXliLDlvZPliY3mlofku7ZcclxuICAgICAgICAgICAgY29uc3QgeyB3cml0ZUZpbGVTeW5jIH0gPSByZXF1aXJlKCdmcy1leHRyYScpO1xyXG4gICAgICAgICAgICB3cml0ZUZpbGVTeW5jKHRoaXMuZ2V0VmVyc2lvbkZpbGVQYXRoKCksIGxhc3RDb21taXRDb250ZW50LCAndXRmLTgnKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+W3suWbnumAgOWIsOS4iuS4gOeJiOacrCcpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+WbnumAgOeJiOacrOWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSAiXX0=