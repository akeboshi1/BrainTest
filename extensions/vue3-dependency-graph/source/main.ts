// @ts-ignore
import { join } from 'path';
import packageJSON from '../package.json';
import { generateBundleVersions } from './utils/generate-bundle-versions';
import { checkExternalReferences } from './utils/check-external-references';

/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * @en A method that can be triggered by message
     * @zh 通过 message 触发的方法
     */
    openPanel() {
        Editor.Panel.open(packageJSON.name);
    },

    async processPublishFlow() {
        console.log('开始执行发布流程');
        
        // 获取项目根目录路径
        const projectRoot = Editor.Project.path;
        // 构建完整目标路径
        const targetPath = join(projectRoot, '/build/android/remote');
        
        console.log('目标路径:', targetPath);

        if (await generateBundleVersions(targetPath)) {
            console.log('✅ 版本文件生成成功');
        } else {
            console.warn('❌ 版本文件生成失败');
        }
    },

    async processDepCheck() {
        console.log('开始执行依赖检查');    

        await checkExternalReferences("testBundle");
        console.log('✅ 依赖检查完成');
    }
};

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export function load() { }

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export function unload() { }
