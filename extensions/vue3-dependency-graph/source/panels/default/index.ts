import { analyzePackageDependencies, type PackageDeps, generateHtmlReport } from '../../package-analysis';
import * as path from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createApp, App } from 'vue';
const panelDataMap = new WeakMap<any, App>();

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
                    <button @click="handleClick"> 包依赖分析 </button>
                `,
                methods: {
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
