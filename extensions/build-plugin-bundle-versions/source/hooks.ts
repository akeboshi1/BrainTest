import { BuildHook, IBuildResult, ITaskOptions } from '../@types';
import { PACKAGE_NAME } from './global';
import { join } from 'path';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

function log(...arg: any[]) {
    return console.log(`[${PACKAGE_NAME}] `, ...arg);
}

let allAssets = [];

export const throwError: BuildHook.throwError = true;

export const load: BuildHook.load = async function () {
    console.log(`[${PACKAGE_NAME}] Load cocos plugin example in builder.`);
    allAssets = await Editor.Message.request('asset-db', 'query-assets');
};

export const onBeforeBuild: BuildHook.onBeforeBuild = async function (options: ITaskOptions, result: IBuildResult) {
    // TODO some thing
    log(`${PACKAGE_NAME}.webTestOption`, 'onBeforeBuild');
};

export const onBeforeCompressSettings: BuildHook.onBeforeCompressSettings = async function (options: ITaskOptions, result: IBuildResult) {
    // Todo some thing
    console.debug('get settings test', result.settings);
};

export const onAfterCompressSettings: BuildHook.onAfterCompressSettings = async function (options: ITaskOptions, result: IBuildResult) {
    // Todo some thing
    console.log('webTestOption', 'onAfterCompressSettings');
};

export const onAfterBuild: BuildHook.onAfterBuild = async function (options: ITaskOptions, result: IBuildResult) {

    const buildPath = result.dest;
    const settingsDir = join(buildPath, 'assets', 'src');

    try {
        // 查找带 MD5 的 settings 文件
        const files = readdirSync(settingsDir);
        const settingsFile = files.find(f => /^settings\.[0-9a-f]+\.json$/.test(f));

        if (!settingsFile) {
            throw new Error('未找到带 MD5 的 settings 文件');
        }

        // 读取并解析 settings 文件
        const settingsPath = join(settingsDir, settingsFile);
        const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

        // 提取 bundle 版本信息
        const bundleVersions = settings.assets?.bundleVers || {};

        // 创建 remote 目录并写入文件
        const remoteDir = join(buildPath, 'remote');
        if (!existsSync(remoteDir)) {
            mkdirSync(remoteDir, { recursive: true });
        }

        writeFileSync(
            join(remoteDir, 'bundle_versions.json'),
            JSON.stringify(bundleVersions, null, 2)
        );

        log('Bundle 版本文件已生成:', join(remoteDir, 'bundle_versions.json'));


    } catch (error) {
        log('处理 settings 文件失败:', error);
        throw error; // 抛出错误让构建流程终止
    }
};

export const unload: BuildHook.unload = async function () {
    console.log(`[${PACKAGE_NAME}] Unload cocos plugin example in builder.`);
};

export const onError: BuildHook.onError = async function (options, result) {
    // Todo some thing
    console.warn(`${PACKAGE_NAME} run onError`);
};

export const onBeforeMake: BuildHook.onBeforeMake = async function (root, options) {
    console.log(`onBeforeMake: root: ${root}, options: ${options}`);
};

export const onAfterMake: BuildHook.onAfterMake = async function (root, options) {
    console.log(`onAfterMake: root: ${root}, options: ${options}`);
};
