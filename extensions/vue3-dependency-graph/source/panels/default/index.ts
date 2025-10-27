import { analyzePackageDependencies, type PackageDeps, generateHtmlReport, getAllTsFilesWithMeta, type TsFileList, checkUnusedTsFiles, type UnusedTsFileList } from '../../package-analysis';
import * as path from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createApp, App } from 'vue';
import { checkExternalReferences } from '../../utils/check-external-references';
const panelDataMap = new WeakMap<any, App>();

interface MyComponent {
    bundleName: string;
    handleCheck(): Promise<void>;
    handleClick(): Promise<void>;
    handleTsFileTest(): Promise<void>;
    handleUnusedTsCheck(): Promise<void>;
    logResults(result: PackageDeps): void;
    logTsFileResults(result: TsFileList): void;
    logUnusedTsResults(result: UnusedTsFileList): void;
}

/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        text: '#text',
    },
    methods: {

        
    },

    ready() {
        if (this.$.app) {
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            
            app.component('MyPackageButton', {
                template: `
                    <div class="toolbar">
                        <button @click="handleClick">包依赖分析</button>
                        <button @click="handleTsFileTest">TS文件列表测试</button>
                        <button @click="handleUnusedTsCheck">检查不被使用的ts文件</button>
                        <div class="input-group">
                            <input v-model="bundleName" placeholder="输入 Bundle 名称">
                            <button @click="handleCheck">检查外部引用</button>
                        </div>
                    </div>
                `,
                data():{ bundleName: string } {
                    return {
                        bundleName: 'resources'
                    };
                },
                methods: {
                    async handleCheck(this: MyComponent) {
                        try {
                            console.log(this.bundleName); // 输出输入的 Bundle 名称
                            console.log(`开始检查 Bundle: ${this.bundleName}`);
                            const result = await checkExternalReferences(this.bundleName);
                            console.log('外部引用检查结果:', result);
                        } catch (error) {
                            console.error('检查失败:', error);
                        }
                    },
                    async handleClick() {
                        try {
                            const projectPath = Editor.Project.path;
                            const assetsDir = path.join(projectPath, 'assets');
                            const outputDir = path.join(projectPath, 'output');
                            const outputPath = path.join(outputDir, 'dependency-report.html');
                            
                            const result = await analyzePackageDependencies(assetsDir);
                            generateHtmlReport(result, outputPath);
                            
                            // 使用Electron的shell模块打开文件
                            const { shell } = require('electron');
                            shell.openPath(outputPath).then(() => {
                                console.log('成功打开报告文件');
                            }).catch((err: any) => {
                                console.error('打开文件失败:', err);
                            });
                            
                            console.log(`报告已生成: ${outputPath}`);
                            
                        } catch (error) {
                            console.error('分析失败:', error);
                        }
                    },
                    async handleTsFileTest() {
                        try {
                            const projectPath = Editor.Project.path;
                            console.log('开始获取所有 .ts 文件列表...');
                            
                            const result = await getAllTsFilesWithMeta(projectPath);
                            this.logTsFileResults(result);
                            
                        } catch (error) {
                            console.error('获取 .ts 文件列表失败:', error);
                        }
                    },
                    async handleUnusedTsCheck() {
                        try {
                            const projectPath = Editor.Project.path;
                            console.log('开始检查不被使用的ts文件...');
                            
                            const result = await checkUnusedTsFiles(projectPath);
                            this.logUnusedTsResults(result);
                            
                        } catch (error) {
                            console.error('检查不被使用的ts文件失败:', error);
                        }
                    },
                    logResults(result: PackageDeps) {
                        console.groupCollapsed('📦 包依赖分析结果');
                        Object.entries(result).forEach(([pkg, deps]) => {
                            console.group(`%c${pkg} →`, 'color:#5470c6;font-weight:bold');
                            deps.forEach(d => {
                                console.log(`%c${d.target} (${d.files.length} files)`, 'color:#91cc75');
                            });
                            console.groupEnd();
                        });
                        console.groupEnd();
                    },
                    logTsFileResults(result: TsFileList) {
                        console.group('📄 TypeScript 文件列表测试结果');
                        console.log(`总计找到 ${result.totalCount} 个 .ts 文件`);
                        
                        // 按目录分组显示
                        const groupedFiles = result.files.reduce((groups, file) => {
                            const dir = path.dirname(file.relativePath);
                            if (!groups[dir]) {
                                groups[dir] = [];
                            }
                            groups[dir].push(file);
                            return groups;
                        }, {} as Record<string, typeof result.files>);
                        
                        Object.entries(groupedFiles).forEach(([dir, files]) => {
                            console.group(`📁 ${dir} (${files.length} 个文件)`);
                            files.forEach(file => {
                                const fileName = path.basename(file.tsPath);
                                const hasUuid = file.uuid ? '✅' : '❌';
                                console.log(`  ${hasUuid} ${fileName}`, {
                                    uuid: file.uuid || '无UUID',
                                    relativePath: file.relativePath,
                                    metaExists: file.metaPath ? '存在' : '不存在'
                                });
                            });
                            console.groupEnd();
                        });
                        
                        // 统计信息
                        const withUuid = result.files.filter(f => f.uuid).length;
                        const withoutUuid = result.totalCount - withUuid;
                        console.log(`\n📊 统计信息:`);
                        console.log(`  - 有 UUID: ${withUuid} 个文件`);
                        console.log(`  - 无 UUID: ${withoutUuid} 个文件`);
                        console.log(`  - UUID 覆盖率: ${((withUuid / result.totalCount) * 100).toFixed(1)}%`);
                        
                        console.groupEnd();
                    },
                    logUnusedTsResults(result: UnusedTsFileList) {
                        console.group('🔍 不被使用的ts文件检查结果');
                        console.log(`总计发现 ${result.totalCount} 个不被使用的ts文件`);
                        
                        if (result.totalCount === 0) {
                            console.log('✅ 所有ts文件都被正常使用！');
                        } else {
                            // 按目录分组显示
                            const groupedFiles = result.unusedFiles.reduce((groups, item) => {
                                const dir = path.dirname(item.tsFile.relativePath);
                                if (!groups[dir]) {
                                    groups[dir] = [];
                                }
                                groups[dir].push(item);
                                return groups;
                            }, {} as Record<string, typeof result.unusedFiles>);
                            
                            Object.entries(groupedFiles).forEach(([dir, files]) => {
                                console.group(`📁 ${dir} (${files.length} 个未使用文件)`);
                                files.forEach(item => {
                                    const fileName = path.basename(item.tsFile.tsPath);
                                    console.log(`  ❌ ${fileName}`, {
                                        uuid: item.tsFile.uuid || '无UUID',
                                        compressedUuid: item.tsFile.compressedUuid || '无压缩UUID',
                                        relativePath: item.tsFile.relativePath,
                                        reason: item.reason
                                    });
                                });
                                console.groupEnd();
                            });
                            
                            // 统计信息
                            const withUuid = result.unusedFiles.filter(f => f.tsFile.uuid).length;
                            const withoutUuid = result.totalCount - withUuid;
                            console.log(`\n📊 统计信息:`);
                            console.log(`  - 有 UUID 的未使用文件: ${withUuid} 个`);
                            console.log(`  - 无 UUID 的未使用文件: ${withoutUuid} 个`);
                            console.log(`  - 未使用文件占比: ${((result.totalCount / (result.totalCount + 100)) * 100).toFixed(1)}%`);
                        }
                        
                        console.groupEnd();
                    }
                }
            });
            app.mount(this.$.app);
            panelDataMap.set(this, app);
        }
    },
    beforeClose() { },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    }
});
