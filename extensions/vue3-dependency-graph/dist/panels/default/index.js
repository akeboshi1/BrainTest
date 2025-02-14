"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const package_analysis_1 = require("../../package-analysis");
const path = __importStar(require("path"));
const fs_1 = require("fs");
const path_1 = require("path");
const vue_1 = require("vue");
const panelDataMap = new WeakMap();
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
    template: (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        text: '#text',
    },
    methods: {},
    ready() {
        if (this.$.app) {
            const app = (0, vue_1.createApp)({});
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
                            const result = await (0, package_analysis_1.analyzePackageDependencies)(assetsDir);
                            (0, package_analysis_1.generateHtmlReport)(result, outputPath);
                            // 使用Electron的shell模块打开文件
                            const { shell } = require('electron');
                            shell.openPath(outputPath).then(() => {
                                console.log('成功打开报告文件');
                            }).catch((err) => {
                                console.error('打开文件失败:', err);
                            });
                            console.log(`报告已生成: ${outputPath}`);
                        }
                        catch (error) {
                            console.error('分析失败:', error);
                        }
                    },
                    logResults(result) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2REFBMEc7QUFDMUcsMkNBQTZCO0FBQzdCLDJCQUFrQztBQUNsQywrQkFBNEI7QUFDNUIsNkJBQXFDO0FBQ3JDLE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFZLENBQUM7QUFFN0M7OztHQUdHO0FBQ0gseUZBQXlGO0FBQ3pGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDakMsU0FBUyxFQUFFO1FBQ1AsSUFBSSxLQUFLLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNsQztJQUNELFFBQVEsRUFBRSxJQUFBLGlCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLDZDQUE2QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQy9GLEtBQUssRUFBRSxJQUFBLGlCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHlDQUF5QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQ3hGLENBQUMsRUFBRTtRQUNDLEdBQUcsRUFBRSxNQUFNO1FBQ1gsSUFBSSxFQUFFLE9BQU87S0FDaEI7SUFDRCxPQUFPLEVBQUUsRUFHUjtJQUVELEtBQUs7UUFDRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsR0FBRyxJQUFBLGVBQVMsRUFBQyxFQUFFLENBQUMsQ0FBQztZQUMxQixHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxHQUFHLEVB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Iiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgYW5hbHl6ZVBhY2thZ2VEZXBlbmRlbmNpZXMsIHR5cGUgUGFja2FnZURlcHMsIGdlbmVyYXRlSHRtbFJlcG9ydCB9IGZyb20gJy4uLy4uL3BhY2thZ2UtYW5hbHlzaXMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGNyZWF0ZUFwcCwgQXBwIH0gZnJvbSAndnVlJztcbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xuXG4vKipcbiAqIEB6aCDlpoLmnpzluIzmnJvlhbzlrrkgMy4zIOS5i+WJjeeahOeJiOacrOWPr+S7peS9v+eUqOS4i+aWueeahOS7o+eggVxuICogQGVuIFlvdSBjYW4gYWRkIHRoZSBjb2RlIGJlbG93IGlmIHlvdSB3YW50IGNvbXBhdGliaWxpdHkgd2l0aCB2ZXJzaW9ucyBwcmlvciB0byAzLjNcbiAqL1xuLy8gRWRpdG9yLlBhbmVsLmRlZmluZSA9IEVkaXRvci5QYW5lbC5kZWZpbmUgfHwgZnVuY3Rpb24ob3B0aW9uczogYW55KSB7IHJldHVybiBvcHRpb25zIH1cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yLlBhbmVsLmRlZmluZSh7XG4gICAgbGlzdGVuZXJzOiB7XG4gICAgICAgIHNob3coKSB7IGNvbnNvbGUubG9nKCdzaG93Jyk7IH0sXG4gICAgICAgIGhpZGUoKSB7IGNvbnNvbGUubG9nKCdoaWRlJyk7IH0sXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL2RlZmF1bHQvaW5kZXguaHRtbCcpLCAndXRmLTgnKSxcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxuICAgICQ6IHtcbiAgICAgICAgYXBwOiAnI2FwcCcsXG4gICAgICAgIHRleHQ6ICcjdGV4dCcsXG4gICAgfSxcbiAgICBtZXRob2RzOiB7XG5cbiAgICAgICAgXG4gICAgfSxcblxuICAgIHJlYWR5KCkge1xuICAgICAgICBpZiAodGhpcy4kLmFwcCkge1xuICAgICAgICAgICAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHt9KTtcbiAgICAgICAgICAgIGFwcC5jb25maWcuY29tcGlsZXJPcHRpb25zLmlzQ3VzdG9tRWxlbWVudCA9ICh0YWcpID0+IHRhZy5zdGFydHNXaXRoKCd1aS0nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYXBwLmNvbXBvbmVudCgnTXlQYWNrYWdlQnV0dG9uJywge1xuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBgXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gQGNsaWNrPVwiaGFuZGxlQ2xpY2tcIj4g5YyF5L6d6LWW5YiG5p6QIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIGAsXG4gICAgICAgICAgICAgICAgbWV0aG9kczoge1xuICAgICAgICAgICAgICAgICAgICBhc3luYyBoYW5kbGVDbGljaygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0c0RpciA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ2Fzc2V0cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dERpciA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ291dHB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dFBhdGggPSBwYXRoLmpvaW4ob3V0cHV0RGlyLCAnZGVwZW5kZW5jeS1yZXBvcnQuaHRtbCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGFuYWx5emVQYWNrYWdlRGVwZW5kZW5jaWVzKGFzc2V0c0Rpcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVIdG1sUmVwb3J0KHJlc3VsdCwgb3V0cHV0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L2/55SoRWxlY3Ryb27nmoRzaGVsbOaooeWdl+aJk+W8gOaWh+S7tlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc2hlbGwgfSA9IHJlcXVpcmUoJ2VsZWN0cm9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hlbGwub3BlblBhdGgob3V0cHV0UGF0aCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmiJDlip/miZPlvIDmiqXlkYrmlofku7YnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omT5byA5paH5Lu25aSx6LSlOicsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOaKpeWRiuW3sueUn+aIkDogJHtvdXRwdXRQYXRofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfliIbmnpDlpLHotKU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBsb2dSZXN1bHRzKHJlc3VsdDogUGFja2FnZURlcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZ3JvdXBDb2xsYXBzZWQoJ/Cfk6Yg5YyF5L6d6LWW5YiG5p6Q57uT5p6cJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhyZXN1bHQpLmZvckVhY2goKFtwa2csIGRlcHNdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5ncm91cChgJWMke3BrZ30g4oaSYCwgJ2NvbG9yOiM1NDcwYzY7Zm9udC13ZWlnaHQ6Ym9sZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuZm9yRWFjaChkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCVjJHtkLnRhcmdldH0gKCR7ZC5maWxlcy5sZW5ndGh9IGZpbGVzKWAsICdjb2xvcjojOTFjYzc1Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5ncm91cEVuZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmdyb3VwRW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFwcC5tb3VudCh0aGlzLiQuYXBwKTtcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYmVmb3JlQ2xvc2UoKSB7IH0sXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGNvbnN0IGFwcCA9IHBhbmVsRGF0YU1hcC5nZXQodGhpcyk7XG4gICAgICAgIGlmIChhcHApIHtcbiAgICAgICAgICAgIGFwcC51bm1vdW50KCk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcbiJdfQ==