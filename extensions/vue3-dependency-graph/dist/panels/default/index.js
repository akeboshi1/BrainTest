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
const check_external_references_1 = require("../../utils/check-external-references");
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
                    <div class="toolbar">
                        <button @click="handleClick">包依赖分析</button>
                        <div class="input-group">
                            <input v-model="bundleName" placeholder="输入 Bundle 名称">
                            <button @click="handleCheck">检查外部引用</button>
                        </div>
                    </div>
                `,
                data() {
                    return {
                        bundleName: 'resources'
                    };
                },
                methods: {
                    async handleCheck() {
                        try {
                            console.log(this.bundleName); // 输出输入的 Bundle 名称
                            console.log(`开始检查 Bundle: ${this.bundleName}`);
                            const result = await (0, check_external_references_1.checkExternalReferences)(this.bundleName);
                            console.log('外部引用检查结果:', result);
                        }
                        catch (error) {
                            console.error('检查失败:', error);
                        }
                    },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2REFBMEc7QUFDMUcsMkNBQTZCO0FBQzdCLDJCQUFrQztBQUNsQywrQkFBNEI7QUFDNUIsNkJBQXFDO0FBQ3JDLHFGQUFnRjtBQUNoRixNQUFNLFlBQVksR0FBRyxJQUFJLE9BQU8sRUFBWSxDQUFDO0FBUzdDOzs7R0FHRztBQUNILHlGQUF5RjtBQUN6RixNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ2pDLFNBQVMsRUFBRTtRQUNQLElBQUksS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEM7SUFDRCxRQUFRLEVBQUUsSUFBQSxpQkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSw2Q0FBNkMsQ0FBQyxFQUFFLE9BQU8sQ0FBQztJQUMvRixLQUFLLEVBQUUsSUFBQSxpQkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSx5Q0FBeUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQztJQUN4RixDQUFDLEVBQUU7UUFDQyxHQUFHLEVBQUUsTUFBTTtRQUNYLElBQUksRUFBRSxPQUFPO0tBQ2hCO0lBQ0QsT0FBTyxFQUFFLEVBR1I7SUFFRCxLQUFLO1FBQ0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLEdBQUcsSUFBQSxlQUFTLEVBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxHQUFH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QUFDLE1BQU0sU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDOzRCQUM1RSxDQUFDLENBQUMsQ0FBQzs0QkFDSCxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQ3ZCLENBQUMsQ0FBQyxDQUFDO3dCQUNILE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDdkIsQ0FBQztpQkFDSjthQUNKLENBQUMsQ0FBQztZQUNILEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0wsQ0FBQztJQUNELFdBQVcsS0FBSyxDQUFDO0lBQ2pCLEtBQUs7UUFDRCxNQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLElBQUksR0FBRyxFQUFFLENBQUM7WUFDTixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNMLENBQUM7Q0FDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBhbmFseXplUGFja2FnZURlcGVuZGVuY2llcywgdHlwZSBQYWNrYWdlRGVwcywgZ2VuZXJhdGVIdG1sUmVwb3J0IH0gZnJvbSAnLi4vLi4vcGFja2FnZS1hbmFseXNpcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY3JlYXRlQXBwLCBBcHAgfSBmcm9tICd2dWUnO1xuaW1wb3J0IHsgY2hlY2tFeHRlcm5hbFJlZmVyZW5jZXMgfSBmcm9tICcuLi8uLi91dGlscy9jaGVjay1leHRlcm5hbC1yZWZlcmVuY2VzJztcbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xuXG5pbnRlcmZhY2UgTXlDb21wb25lbnQge1xuICAgIGJ1bmRsZU5hbWU6IHN0cmluZztcbiAgICBoYW5kbGVDaGVjaygpOiBQcm9taXNlPHZvaWQ+O1xuICAgIGhhbmRsZUNsaWNrKCk6IFByb21pc2U8dm9pZD47XG4gICAgbG9nUmVzdWx0cyhyZXN1bHQ6IFBhY2thZ2VEZXBzKTogdm9pZDtcbn1cblxuLyoqXG4gKiBAemgg5aaC5p6c5biM5pyb5YW85a65IDMuMyDkuYvliY3nmoTniYjmnKzlj6/ku6Xkvb/nlKjkuIvmlrnnmoTku6PnoIFcbiAqIEBlbiBZb3UgY2FuIGFkZCB0aGUgY29kZSBiZWxvdyBpZiB5b3Ugd2FudCBjb21wYXRpYmlsaXR5IHdpdGggdmVyc2lvbnMgcHJpb3IgdG8gMy4zXG4gKi9cbi8vIEVkaXRvci5QYW5lbC5kZWZpbmUgPSBFZGl0b3IuUGFuZWwuZGVmaW5lIHx8IGZ1bmN0aW9uKG9wdGlvbnM6IGFueSkgeyByZXR1cm4gb3B0aW9ucyB9XG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvci5QYW5lbC5kZWZpbmUoe1xuICAgIGxpc3RlbmVyczoge1xuICAgICAgICBzaG93KCkgeyBjb25zb2xlLmxvZygnc2hvdycpOyB9LFxuICAgICAgICBoaWRlKCkgeyBjb25zb2xlLmxvZygnaGlkZScpOyB9LFxuICAgIH0sXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXG4gICAgc3R5bGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9zdHlsZS9kZWZhdWx0L2luZGV4LmNzcycpLCAndXRmLTgnKSxcbiAgICAkOiB7XG4gICAgICAgIGFwcDogJyNhcHAnLFxuICAgICAgICB0ZXh0OiAnI3RleHQnLFxuICAgIH0sXG4gICAgbWV0aG9kczoge1xuXG4gICAgICAgIFxuICAgIH0sXG5cbiAgICByZWFkeSgpIHtcbiAgICAgICAgaWYgKHRoaXMuJC5hcHApIHtcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7fSk7XG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSAodGFnKSA9PiB0YWcuc3RhcnRzV2l0aCgndWktJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGFwcC5jb21wb25lbnQoJ015UGFja2FnZUJ1dHRvbicsIHtcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidG9vbGJhclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBAY2xpY2s9XCJoYW5kbGVDbGlja1wiPuWMheS+nei1luWIhuaekDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHYtbW9kZWw9XCJidW5kbGVOYW1lXCIgcGxhY2Vob2xkZXI9XCLovpPlhaUgQnVuZGxlIOWQjeensFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gQGNsaWNrPVwiaGFuZGxlQ2hlY2tcIj7mo4Dmn6XlpJbpg6jlvJXnlKg8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgLFxuICAgICAgICAgICAgICAgIGRhdGEoKTp7IGJ1bmRsZU5hbWU6IHN0cmluZyB9IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1bmRsZU5hbWU6ICdyZXNvdXJjZXMnXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtZXRob2RzOiB7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGhhbmRsZUNoZWNrKHRoaXM6IE15Q29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuYnVuZGxlTmFtZSk7IC8vIOi+k+WHuui+k+WFpeeahCBCdW5kbGUg5ZCN56ewXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOW8gOWni+ajgOafpSBCdW5kbGU6ICR7dGhpcy5idW5kbGVOYW1lfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNoZWNrRXh0ZXJuYWxSZWZlcmVuY2VzKHRoaXMuYnVuZGxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+WklumDqOW8leeUqOajgOafpee7k+aenDonLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmo4Dmn6XlpLHotKU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBhc3luYyBoYW5kbGVDbGljaygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0c0RpciA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ2Fzc2V0cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dERpciA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ291dHB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dFBhdGggPSBwYXRoLmpvaW4ob3V0cHV0RGlyLCAnZGVwZW5kZW5jeS1yZXBvcnQuaHRtbCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGFuYWx5emVQYWNrYWdlRGVwZW5kZW5jaWVzKGFzc2V0c0Rpcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVIdG1sUmVwb3J0KHJlc3VsdCwgb3V0cHV0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L2/55SoRWxlY3Ryb27nmoRzaGVsbOaooeWdl+aJk+W8gOaWh+S7tlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc2hlbGwgfSA9IHJlcXVpcmUoJ2VsZWN0cm9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hlbGwub3BlblBhdGgob3V0cHV0UGF0aCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmiJDlip/miZPlvIDmiqXlkYrmlofku7YnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5omT5byA5paH5Lu25aSx6LSlOicsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOaKpeWRiuW3sueUn+aIkDogJHtvdXRwdXRQYXRofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfliIbmnpDlpLHotKU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBsb2dSZXN1bHRzKHJlc3VsdDogUGFja2FnZURlcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZ3JvdXBDb2xsYXBzZWQoJ/Cfk6Yg5YyF5L6d6LWW5YiG5p6Q57uT5p6cJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhyZXN1bHQpLmZvckVhY2goKFtwa2csIGRlcHNdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5ncm91cChgJWMke3BrZ30g4oaSYCwgJ2NvbG9yOiM1NDcwYzY7Zm9udC13ZWlnaHQ6Ym9sZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuZm9yRWFjaChkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCVjJHtkLnRhcmdldH0gKCR7ZC5maWxlcy5sZW5ndGh9IGZpbGVzKWAsICdjb2xvcjojOTFjYzc1Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5ncm91cEVuZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmdyb3VwRW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFwcC5tb3VudCh0aGlzLiQuYXBwKTtcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYmVmb3JlQ2xvc2UoKSB7IH0sXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGNvbnN0IGFwcCA9IHBhbmVsRGF0YU1hcC5nZXQodGhpcyk7XG4gICAgICAgIGlmIChhcHApIHtcbiAgICAgICAgICAgIGFwcC51bm1vdW50KCk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcbiJdfQ==