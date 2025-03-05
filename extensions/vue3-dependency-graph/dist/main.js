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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQWdEQSxvQkFBMEI7QUFNMUIsd0JBQTRCO0FBdEQ1QixhQUFhO0FBQ2IsK0JBQTRCO0FBQzVCLG1FQUEwQztBQUMxQywrRUFBMEU7QUFDMUUsaUZBQTRFO0FBRTVFOzs7R0FHRztBQUNVLFFBQUEsT0FBTyxHQUE0QztJQUM1RDs7O09BR0c7SUFDSCxTQUFTO1FBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsS0FBSyxDQUFDLGtCQUFrQjtRQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhCLFlBQVk7UUFDWixNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUN4QyxXQUFXO1FBQ1gsTUFBTSxVQUFVLEdBQUcsSUFBQSxXQUFJLEVBQUMsV0FBVyxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFFOUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFakMsSUFBSSxNQUFNLElBQUEsaURBQXNCLEVBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzlCLENBQUM7YUFBTSxDQUFDO1lBQ0osT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQixDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlO1FBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFeEIsTUFBTSxJQUFBLG1EQUF1QixFQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUIsQ0FBQztDQUNKLENBQUM7QUFFRjs7O0dBR0c7QUFDSCxTQUFnQixJQUFJLEtBQUssQ0FBQztBQUUxQjs7O0dBR0c7QUFDSCxTQUFnQixNQUFNLEtBQUssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEB0cy1pZ25vcmVcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCBwYWNrYWdlSlNPTiBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuaW1wb3J0IHsgZ2VuZXJhdGVCdW5kbGVWZXJzaW9ucyB9IGZyb20gJy4vdXRpbHMvZ2VuZXJhdGUtYnVuZGxlLXZlcnNpb25zJztcbmltcG9ydCB7IGNoZWNrRXh0ZXJuYWxSZWZlcmVuY2VzIH0gZnJvbSAnLi91dGlscy9jaGVjay1leHRlcm5hbC1yZWZlcmVuY2VzJztcblxuLyoqXG4gKiBAZW4gUmVnaXN0cmF0aW9uIG1ldGhvZCBmb3IgdGhlIG1haW4gcHJvY2VzcyBvZiBFeHRlbnNpb25cbiAqIEB6aCDkuLrmianlsZXnmoTkuLvov5vnqIvnmoTms6jlhozmlrnms5VcbiAqL1xuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcbiAgICAvKipcbiAgICAgKiBAZW4gQSBtZXRob2QgdGhhdCBjYW4gYmUgdHJpZ2dlcmVkIGJ5IG1lc3NhZ2VcbiAgICAgKiBAemgg6YCa6L+HIG1lc3NhZ2Ug6Kem5Y+R55qE5pa55rOVXG4gICAgICovXG4gICAgb3BlblBhbmVsKCkge1xuICAgICAgICBFZGl0b3IuUGFuZWwub3BlbihwYWNrYWdlSlNPTi5uYW1lKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgcHJvY2Vzc1B1Ymxpc2hGbG93KCkge1xuICAgICAgICBjb25zb2xlLmxvZygn5byA5aeL5omn6KGM5Y+R5biD5rWB56iLJyk7XG4gICAgICAgIFxuICAgICAgICAvLyDojrflj5bpobnnm67moLnnm67lvZXot6/lvoRcbiAgICAgICAgY29uc3QgcHJvamVjdFJvb3QgPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xuICAgICAgICAvLyDmnoTlu7rlrozmlbTnm67moIfot6/lvoRcbiAgICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IGpvaW4ocHJvamVjdFJvb3QsICcvYnVpbGQvYW5kcm9pZC9yZW1vdGUnKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKCfnm67moIfot6/lvoQ6JywgdGFyZ2V0UGF0aCk7XG5cbiAgICAgICAgaWYgKGF3YWl0IGdlbmVyYXRlQnVuZGxlVmVyc2lvbnModGFyZ2V0UGF0aCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUg54mI5pys5paH5Lu255Sf5oiQ5oiQ5YqfJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ+KdjCDniYjmnKzmlofku7bnlJ/miJDlpLHotKUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhc3luYyBwcm9jZXNzRGVwQ2hlY2soKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCflvIDlp4vmiafooYzkvp3otZbmo4Dmn6UnKTsgICAgXG5cbiAgICAgICAgYXdhaXQgY2hlY2tFeHRlcm5hbFJlZmVyZW5jZXMoXCJ0ZXN0QnVuZGxlXCIpO1xuICAgICAgICBjb25zb2xlLmxvZygn4pyFIOS+nei1luajgOafpeWujOaIkCcpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQGVuIE1ldGhvZCBUcmlnZ2VyZWQgb24gRXh0ZW5zaW9uIFN0YXJ0dXBcbiAqIEB6aCDmianlsZXlkK/liqjml7bop6blj5HnmoTmlrnms5VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvYWQoKSB7IH1cblxuLyoqXG4gKiBAZW4gTWV0aG9kIHRyaWdnZXJlZCB3aGVuIHVuaW5zdGFsbGluZyB0aGUgZXh0ZW5zaW9uXG4gKiBAemgg5Y246L295omp5bGV5pe26Kem5Y+R55qE5pa55rOVXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmxvYWQoKSB7IH1cbiJdfQ==