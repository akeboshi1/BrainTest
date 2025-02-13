"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAfterMake = exports.onBeforeMake = exports.onError = exports.unload = exports.onAfterBuild = exports.onAfterCompressSettings = exports.onBeforeCompressSettings = exports.onBeforeBuild = exports.load = exports.throwError = void 0;
const global_1 = require("./global");
const path_1 = require("path");
const fs_1 = require("fs");
function log(...arg) {
    return console.log(`[${global_1.PACKAGE_NAME}] `, ...arg);
}
let allAssets = [];
exports.throwError = true;
const load = function () {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[${global_1.PACKAGE_NAME}] Load cocos plugin example in builder.`);
        allAssets = yield Editor.Message.request('asset-db', 'query-assets');
    });
};
exports.load = load;
const onBeforeBuild = function (options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO some thing
        log(`${global_1.PACKAGE_NAME}.webTestOption`, 'onBeforeBuild');
    });
};
exports.onBeforeBuild = onBeforeBuild;
const onBeforeCompressSettings = function (options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        // Todo some thing
        console.debug('get settings test', result.settings);
    });
};
exports.onBeforeCompressSettings = onBeforeCompressSettings;
const onAfterCompressSettings = function (options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        // Todo some thing
        console.log('webTestOption', 'onAfterCompressSettings');
    });
};
exports.onAfterCompressSettings = onAfterCompressSettings;
const onAfterBuild = function (options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('所有 Bundle 列表:', result.bundles.map(b => b.name));
        const mainBundle = result.bundles.find(b => b.name === 'main');
        console.log('Main Bundle 对象:', mainBundle);
        if (mainBundle) {
            console.log('Main Bundle assets:', mainBundle.assets);
        }
        const buildPath = result.dest;
        const settingsDir = (0, path_1.join)(buildPath, 'assets', 'src');
        try {
            // 查找带 MD5 的 settings 文件
            const files = (0, fs_1.readdirSync)(settingsDir);
            const settingsFile = files.find(f => /^settings\.[0-9a-f]+\.json$/.test(f));
            if (!settingsFile) {
                throw new Error('未找到带 MD5 的 settings 文件');
            }
            // 读取并解析 settings 文件
            const settingsPath = (0, path_1.join)(settingsDir, settingsFile);
            const settings = JSON.parse((0, fs_1.readFileSync)(settingsPath, 'utf-8'));
            // 提取 bundle 版本信息
            const bundleVersions = ((_a = settings.assets) === null || _a === void 0 ? void 0 : _a.bundleVers) || {};
            // 创建 remote 目录并写入文件
            const remoteDir = (0, path_1.join)(buildPath, 'remote');
            if (!(0, fs_1.existsSync)(remoteDir)) {
                (0, fs_1.mkdirSync)(remoteDir, { recursive: true });
            }
            (0, fs_1.writeFileSync)((0, path_1.join)(remoteDir, 'bundle_versions.json'), JSON.stringify(bundleVersions, null, 2));
            log('Bundle 版本文件已生成:', (0, path_1.join)(remoteDir, 'bundle_versions.json'));
            // 新增：打印 main Bundle 文件列表
            const mainBundle = result.bundles.find(b => b.name === 'main');
            if (mainBundle) {
                log('Main Bundle 包含文件:');
                const assets = mainBundle.assets || [];
                assets.forEach(asset => {
                    log(` - ${asset.path}`);
                });
            }
        }
        catch (error) {
            log('处理 settings 文件失败:', error);
            throw error; // 抛出错误让构建流程终止
        }
    });
};
exports.onAfterBuild = onAfterBuild;
const unload = function () {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[${global_1.PACKAGE_NAME}] Unload cocos plugin example in builder.`);
    });
};
exports.unload = unload;
const onError = function (options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        // Todo some thing
        console.warn(`${global_1.PACKAGE_NAME} run onError`);
    });
};
exports.onError = onError;
const onBeforeMake = function (root, options) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`onBeforeMake: root: ${root}, options: ${options}`);
    });
};
exports.onBeforeMake = onBeforeMake;
const onAfterMake = function (root, options) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`onAfterMake: root: ${root}, options: ${options}`);
    });
};
exports.onAfterMake = onAfterMake;
