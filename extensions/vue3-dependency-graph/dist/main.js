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
    async processPublishFlow() {
        console.log('开始执行发布流程');
        // 获取项目根目录路径
        const projectRoot = Editor.Project.path;
        // 构建完整目标路径
        const targetPath = (0, path_1.join)(projectRoot, '/build/build-bundle/remote');
        console.log('目标路径:', targetPath);
        if (await (0, generate_bundle_versions_1.generateBundleVersions)(targetPath)) {
            console.log('✅ 版本文件生成成功');
        }
        else {
            console.warn('❌ 版本文件生成失败');
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQXdDQSxvQkFBMEI7QUFNMUIsd0JBQTRCO0FBOUM1QixhQUFhO0FBQ2IsK0JBQTRCO0FBQzVCLG1FQUEwQztBQUMxQywrRUFBMEU7QUFFMUU7OztHQUdHO0FBQ1UsUUFBQSxPQUFPLEdBQTRDO0lBQzVEOzs7T0FHRztJQUNILFNBQVM7UUFDTCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxzQkFBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCO1FBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEIsWUFBWTtRQUNaLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQ3hDLFdBQVc7UUFDWCxNQUFNLFVBQVUsR0FBRyxJQUFBLFdBQUksRUFBQyxXQUFXLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUVuRSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVqQyxJQUFJLE1BQU0sSUFBQSxpREFBc0IsRUFBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUIsQ0FBQzthQUFNLENBQUM7WUFDSixPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9CLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQztBQUVGOzs7R0FHRztBQUNILFNBQWdCLElBQUksS0FBSyxDQUFDO0FBRTFCOzs7R0FHRztBQUNILFNBQWdCLE1BQU0sS0FBSyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWlnbm9yZVxuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHBhY2thZ2VKU09OIGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5pbXBvcnQgeyBnZW5lcmF0ZUJ1bmRsZVZlcnNpb25zIH0gZnJvbSAnLi91dGlscy9nZW5lcmF0ZS1idW5kbGUtdmVyc2lvbnMnO1xuXG4vKipcbiAqIEBlbiBSZWdpc3RyYXRpb24gbWV0aG9kIGZvciB0aGUgbWFpbiBwcm9jZXNzIG9mIEV4dGVuc2lvblxuICogQHpoIOS4uuaJqeWxleeahOS4u+i/m+eoi+eahOazqOWGjOaWueazlVxuICovXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xuICAgIC8qKlxuICAgICAqIEBlbiBBIG1ldGhvZCB0aGF0IGNhbiBiZSB0cmlnZ2VyZWQgYnkgbWVzc2FnZVxuICAgICAqIEB6aCDpgJrov4cgbWVzc2FnZSDop6blj5HnmoTmlrnms5VcbiAgICAgKi9cbiAgICBvcGVuUGFuZWwoKSB7XG4gICAgICAgIEVkaXRvci5QYW5lbC5vcGVuKHBhY2thZ2VKU09OLm5hbWUpO1xuICAgIH0sXG5cbiAgICBhc3luYyBwcm9jZXNzUHVibGlzaEZsb3coKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCflvIDlp4vmiafooYzlj5HluIPmtYHnqIsnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIOiOt+WPlumhueebruagueebruW9lei3r+W+hFxuICAgICAgICBjb25zdCBwcm9qZWN0Um9vdCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XG4gICAgICAgIC8vIOaehOW7uuWujOaVtOebruagh+i3r+W+hFxuICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gam9pbihwcm9qZWN0Um9vdCwgJy9idWlsZC9idWlsZC1idW5kbGUvcmVtb3RlJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZygn55uu5qCH6Lev5b6EOicsIHRhcmdldFBhdGgpO1xuXG4gICAgICAgIGlmIChhd2FpdCBnZW5lcmF0ZUJ1bmRsZVZlcnNpb25zKHRhcmdldFBhdGgpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIOeJiOacrOaWh+S7tueUn+aIkOaIkOWKnycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCfinYwg54mI5pys5paH5Lu255Sf5oiQ5aSx6LSlJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBNZXRob2QgVHJpZ2dlcmVkIG9uIEV4dGVuc2lvbiBTdGFydHVwXG4gKiBAemgg5omp5bGV5ZCv5Yqo5pe26Kem5Y+R55qE5pa55rOVXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkgeyB9XG5cbi8qKlxuICogQGVuIE1ldGhvZCB0cmlnZ2VyZWQgd2hlbiB1bmluc3RhbGxpbmcgdGhlIGV4dGVuc2lvblxuICogQHpoIOWNuOi9veaJqeWxleaXtuinpuWPkeeahOaWueazlVxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5sb2FkKCkgeyB9XG4iXX0=