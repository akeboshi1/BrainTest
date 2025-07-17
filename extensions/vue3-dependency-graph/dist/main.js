"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
// @ts-ignore
const path_1 = require("path");
const package_json_1 = __importDefault(require("../package.json"));
const generate_bundle_versions_1 = require("./utils/generate-bundle-versions");
const check_external_references_1 = require("./utils/check-external-references");
/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
exports.methods = {
    /**
     * @en A method that can be triggered by message
     * @zh 通过 message 触发的方法
     */
    openPanel() {
        Editor.Panel.open(package_json_1.default.name);
    },
    openPublishProcessPanel() {
        Editor.Panel.open(`${package_json_1.default.name}.publish-process`); // 使用模板字符串
    },
    openTabsPanel() {
        Editor.Panel.open(`${package_json_1.default.name}.open-tabspanel`); // 使用模板字符串
    },
    async processPublishFlow() {
        console.log('开始执行发布流程');
        // 获取项目根目录路径
        const projectRoot = Editor.Project.path;
        // 构建完整目标路径
        const targetPath = (0, path_1.join)(projectRoot, '/build/android/remote');
        console.log('目标路径:', targetPath);
        if (await (0, generate_bundle_versions_1.generateBundleVersions)(targetPath)) {
            console.log('✅ 版本文件生成成功');
        }
        else {
            console.warn('❌ 版本文件生成失败');
        }
    },
    async processDepCheck() {
        console.log('开始执行依赖检查');
        await (0, check_external_references_1.checkExternalReferences)("testBundle");
        console.log('✅ 依赖检查完成');
    }
};
/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
function load() { }
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
function unload() { }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQTBEQSxvQkFBMEI7QUFNMUIsd0JBQTRCO0FBaEU1QixhQUFhO0FBQ2IsK0JBQTRCO0FBQzVCLG1FQUEwQztBQUMxQywrRUFBMEU7QUFDMUUsaUZBQTRFO0FBRzVFOzs7R0FHRztBQUNVLFFBQUEsT0FBTyxHQUErQztJQUMvRDs7O09BR0c7SUFDSCxTQUFTO1FBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsdUJBQXVCO1FBQ25CLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsc0JBQVcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxVQUFVO0lBQ3hFLENBQUM7SUFFRCxhQUFhO1FBQ1QsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxzQkFBVyxDQUFDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVU7SUFDdkUsQ0FBQztJQUdELEtBQUssQ0FBQyxrQkFBa0I7UUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4QixZQUFZO1FBQ1osTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDeEMsV0FBVztRQUNYLE1BQU0sVUFBVSxHQUFHLElBQUEsV0FBSSxFQUFDLFdBQVcsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBRTlELE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWpDLElBQUksTUFBTSxJQUFBLGlEQUFzQixFQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM5QixDQUFDO2FBQU0sQ0FBQztZQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0IsQ0FBQztJQUNMLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZTtRQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhCLE1BQU0sSUFBQSxtREFBdUIsRUFBQyxZQUFZLENBQUMsQ0FBQztRQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVCLENBQUM7Q0FDSixDQUFDO0FBRUY7OztHQUdHO0FBQ0gsU0FBZ0IsSUFBSSxLQUFLLENBQUM7QUFFMUI7OztHQUdHO0FBQ0gsU0FBZ0IsTUFBTSxLQUFLLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtaWdub3JlXHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHBhY2thZ2VKU09OIGZyb20gJy4uL3BhY2thZ2UuanNvbic7XHJcbmltcG9ydCB7IGdlbmVyYXRlQnVuZGxlVmVyc2lvbnMgfSBmcm9tICcuL3V0aWxzL2dlbmVyYXRlLWJ1bmRsZS12ZXJzaW9ucyc7XHJcbmltcG9ydCB7IGNoZWNrRXh0ZXJuYWxSZWZlcmVuY2VzIH0gZnJvbSAnLi91dGlscy9jaGVjay1leHRlcm5hbC1yZWZlcmVuY2VzJztcclxuaW1wb3J0IHsgQnVuZGxlVmVyc2lvbk1hbmFnZXIgfSBmcm9tICcuL3V0aWxzL2J1bmRsZS12ZXJzaW9uLW1hbmFnZXInO1xyXG5cclxuLyoqXHJcbiAqIEBlbiBSZWdpc3RyYXRpb24gbWV0aG9kIGZvciB0aGUgbWFpbiBwcm9jZXNzIG9mIEV4dGVuc2lvblxyXG4gKiBAemgg5Li65omp5bGV55qE5Li76L+b56iL55qE5rOo5YaM5pa55rOVXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYXJnczogYW55W10pID0+IGFueSB9ID0geyAvLyDkv67mraPlj4LmlbDnsbvlnovlo7DmmI5cclxuICAgIC8qKlxyXG4gICAgICogQGVuIEEgbWV0aG9kIHRoYXQgY2FuIGJlIHRyaWdnZXJlZCBieSBtZXNzYWdlXHJcbiAgICAgKiBAemgg6YCa6L+HIG1lc3NhZ2Ug6Kem5Y+R55qE5pa55rOVXHJcbiAgICAgKi9cclxuICAgIG9wZW5QYW5lbCgpIHtcclxuICAgICAgICBFZGl0b3IuUGFuZWwub3BlbihwYWNrYWdlSlNPTi5uYW1lKTtcclxuICAgIH0sXHJcblxyXG4gICAgb3BlblB1Ymxpc2hQcm9jZXNzUGFuZWwoKSB7XHJcbiAgICAgICAgRWRpdG9yLlBhbmVsLm9wZW4oYCR7cGFja2FnZUpTT04ubmFtZX0ucHVibGlzaC1wcm9jZXNzYCk7IC8vIOS9v+eUqOaooeadv+Wtl+espuS4slxyXG4gICAgfSxcclxuXHJcbiAgICBvcGVuVGFic1BhbmVsKCkge1xyXG4gICAgICAgIEVkaXRvci5QYW5lbC5vcGVuKGAke3BhY2thZ2VKU09OLm5hbWV9Lm9wZW4tdGFic3BhbmVsYCk7IC8vIOS9v+eUqOaooeadv+Wtl+espuS4slxyXG4gICAgfSxcclxuXHJcblxyXG4gICAgYXN5bmMgcHJvY2Vzc1B1Ymxpc2hGbG93KCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCflvIDlp4vmiafooYzlj5HluIPmtYHnqIsnKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDojrflj5bpobnnm67moLnnm67lvZXot6/lvoRcclxuICAgICAgICBjb25zdCBwcm9qZWN0Um9vdCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XHJcbiAgICAgICAgLy8g5p6E5bu65a6M5pW055uu5qCH6Lev5b6EXHJcbiAgICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IGpvaW4ocHJvamVjdFJvb3QsICcvYnVpbGQvYW5kcm9pZC9yZW1vdGUnKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zb2xlLmxvZygn55uu5qCH6Lev5b6EOicsIHRhcmdldFBhdGgpO1xyXG5cclxuICAgICAgICBpZiAoYXdhaXQgZ2VuZXJhdGVCdW5kbGVWZXJzaW9ucyh0YXJnZXRQYXRoKSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIOeJiOacrOaWh+S7tueUn+aIkOaIkOWKnycpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2Fybign4p2MIOeJiOacrOaWh+S7tueUn+aIkOWksei0pScpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgYXN5bmMgcHJvY2Vzc0RlcENoZWNrKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCflvIDlp4vmiafooYzkvp3otZbmo4Dmn6UnKTsgICAgXHJcblxyXG4gICAgICAgIGF3YWl0IGNoZWNrRXh0ZXJuYWxSZWZlcmVuY2VzKFwidGVzdEJ1bmRsZVwiKTtcclxuICAgICAgICBjb25zb2xlLmxvZygn4pyFIOS+nei1luajgOafpeWujOaIkCcpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBlbiBNZXRob2QgVHJpZ2dlcmVkIG9uIEV4dGVuc2lvbiBTdGFydHVwXHJcbiAqIEB6aCDmianlsZXlkK/liqjml7bop6blj5HnmoTmlrnms5VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkgeyB9XHJcblxyXG4vKipcclxuICogQGVuIE1ldGhvZCB0cmlnZ2VyZWQgd2hlbiB1bmluc3RhbGxpbmcgdGhlIGV4dGVuc2lvblxyXG4gKiBAemgg5Y246L295omp5bGV5pe26Kem5Y+R55qE5pa55rOVXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdW5sb2FkKCkgeyB9XHJcbiJdfQ==