"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.onAfterMake = exports.onBeforeMake = exports.onAfterBuild = exports.onAfterCompressSettings = exports.onBeforeCompressSettings = exports.onAfterBuildAssets = exports.onBeforeBuildAssets = exports.onBeforeBuild = exports.unload = exports.load = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const browser_1 = require("./browser");
function load() {
    return __awaiter(this, void 0, void 0, function* () {
        // log('Load in builder.');
        // allAssets = await Editor.Message.request('asset-db', 'query-assets');
    });
}
exports.load = load;
function unload() {
    // log('Unload in builder.');
}
exports.unload = unload;
function onBeforeBuild(options) {
    return __awaiter(this, void 0, void 0, function* () {
        //
    });
}
exports.onBeforeBuild = onBeforeBuild;
function onBeforeBuildAssets(options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        //
    });
}
exports.onBeforeBuildAssets = onBeforeBuildAssets;
function onAfterBuildAssets(options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        generateEmptManifest(options, result);
    });
}
exports.onAfterBuildAssets = onAfterBuildAssets;
function onBeforeCompressSettings(options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        //
    });
}
exports.onBeforeCompressSettings = onBeforeCompressSettings;
function onAfterCompressSettings(options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        //
    });
}
exports.onAfterCompressSettings = onAfterCompressSettings;
function onAfterBuild(options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        injectMainScript(options, result);
        generateManifest(options, result);
    });
}
exports.onAfterBuild = onAfterBuild;
function onBeforeMake(options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        //
    });
}
exports.onBeforeMake = onBeforeMake;
function onAfterMake(options, result) {
    return __awaiter(this, void 0, void 0, function* () {
        //
    });
}
exports.onAfterMake = onAfterMake;
/**
 * 注入脚本
 * @param options
 */
function injectMainScript(options, result) {
    var _a;
    const packageOptions = (_a = options.packages) === null || _a === void 0 ? void 0 : _a[browser_1.PACKAGE_NAME];
    if (!packageOptions.hotUpdateEnable) {
        return;
    }
    const mainScriptPath = path.resolve(`${result.paths.dir}/main.js`);
    let mainScript = fs.readFileSync(mainScriptPath).toString('utf-8');
    mainScript =
        `// inject by extensions ${browser_1.PACKAGE_NAME} ---- start ----
jsb.fileUtils.addSearchPath(jsb.fileUtils.getWritablePath() + "${packageOptions.storagePath}", true);
var fileList = [];
var storagePath = "${packageOptions.storagePath}";
var tempPath = storagePath + "_temp/";
var baseOffset = tempPath.length;

if (jsb.fileUtils.isDirectoryExist(tempPath) && !jsb.fileUtils.isFileExist(tempPath + 'project.manifest.temp')) {
    jsb.fileUtils.listFilesRecursively(tempPath, fileList);
    fileList.forEach(srcPath => {
        var relativePath = srcPath.substr(baseOffset);
        var dstPath = storagePath + relativePath;
        if (srcPath[srcPath.length - 1] === "/") {
            jsb.fileUtils.createDirectory(dstPath)
        } else {
            if (jsb.fileUtils.isFileExist(dstPath)) {
                jsb.fileUtils.removeFile(dstPath)
            }
            jsb.fileUtils.renameFile(srcPath, dstPath);
        }
    })
    jsb.fileUtils.removeDirectory(tempPath);
}
// inject by extensions ${browser_1.PACKAGE_NAME} ---- end ----` + mainScript;
    fs.writeFileSync(mainScriptPath, mainScript);
    (0, browser_1.log)('inject main script success');
}
/**
 * 先生成 project.manifest, 存到 assets 目录下, 后面再替换, 主要不确定这时生成热更配置, 是不是最终的
 * 解决 ios | mac, cmake 生成的工程文件资源里缺少这两个文件
 *
 * @param options
 */
function generateEmptManifest(options, result) {
    var _a;
    const packageOptions = (_a = options.packages) === null || _a === void 0 ? void 0 : _a[browser_1.PACKAGE_NAME];
    if (!packageOptions.hotUpdateEnable) {
        return;
    }
    const assetsRootPath = result.paths.dir;
    const projectManifestName = 'project.manifest';
    const destManifestPath = path.join(assetsRootPath, projectManifestName);
    fs.writeFileSync(destManifestPath, JSON.stringify({}));
    (0, browser_1.log)('generateEmptManifest success');
}
/**
 * 生成热更文件
 * @param options
 */
function generateManifest(options, result) {
    var _a;
    const packageOptions = (_a = options.packages) === null || _a === void 0 ? void 0 : _a[browser_1.PACKAGE_NAME];
    if (!packageOptions.hotUpdateEnable) {
        return;
    }
    let remoteUrl = packageOptions.remoteAddress;
    if (remoteUrl.endsWith('/')) {
        remoteUrl = remoteUrl.slice(0, -1);
    }
    // build num | from 1 to max
    const buildNum = !isNaN(Number(packageOptions.buildNum)) ? Number(packageOptions.buildNum) : 1;
    const hotupdateVersion = `${packageOptions.version.trim()}.${buildNum.toFixed()}`;
    const projectPath = Editor.Project.path;
    const assetsRootPath = result.paths.dir;
    //
    const projectManifestName = 'project.manifest';
    const versionManifestName = 'version.manifest';
    //
    let destManifestPath = path.join(assetsRootPath, projectManifestName);
    // 前面那步用完了, 这里先删掉, 生成 project.manifest 不希望有这个文件的记录
    fs.unlinkSync(destManifestPath);
    // 构建后默认资源目录
    const assetsPaths = ['src', 'assets', 'jsb-adapter'];
    // 初始化 manifest
    const packageUrl = `${remoteUrl}/${options.platform}/${hotupdateVersion}`;
    const manifest = {
        packageUrl: encodeURI(packageUrl),
        version: hotupdateVersion,
        searchPaths: [packageOptions.storagePath],
        remoteManifestUrl: encodeURI(`${remoteUrl}/${options.platform}/${projectManifestName}`),
        remoteVersionUrl: encodeURI(`${remoteUrl}/${options.platform}/${versionManifestName}`),
        assets: {},
    };
    // 获取目录内所有文件
    const listDir = (assetPath) => {
        const fileList = [];
        const stat = fs.statSync(assetPath);
        if (stat.isDirectory()) {
            const subpaths = fs.readdirSync(assetPath);
            for (let i = 0; i < subpaths.length; i++) {
                let subpath = subpaths[i];
                if (subpath[0] === '.') {
                    continue;
                }
                subpath = path.join(assetPath, subpath);
                fileList.push(...listDir(subpath));
            }
        }
        else if (stat.isFile()) {
            fileList.push({
                filePath: assetPath,
                size: stat.size,
            });
        }
        return fileList;
    };
    // 创建目录
    const mkdirSync = (dirName) => {
        try {
            fs.mkdirSync(dirName);
        }
        catch (e) {
            if (e.code !== 'EEXIST')
                throw e;
        }
    };
    // 递归删除目录及文件
    const deleteDirSync = (dirName) => {
        let files = [];
        if (fs.existsSync(dirName)) {
            // 返回文件和子目录的数组
            files = fs.readdirSync(dirName);
            files.forEach((file) => {
                const curPath = path.join(dirName, file);
                // fs.statSync同步读取文件夹文件，如果是文件夹，在重复触发函数
                if (fs.statSync(curPath).isDirectory()) {
                    deleteDirSync(curPath);
                }
                else {
                    fs.unlinkSync(curPath);
                }
            });
            // 清除文件夹
            fs.rmdirSync(dirName);
        }
    };
    // Iterate assets and src folder
    const assetsList = [];
    assetsPaths.forEach((o) => {
        assetsList.push(...listDir(path.join(assetsRootPath, o)));
    });
    // 填充 manifest.assets 对象
    let md5, compressed, assetUrl;
    const assetsObj = {};
    assetsList.forEach((assetStat) => {
        md5 = crypto.createHash('md5').update(fs.readFileSync(assetStat.filePath)).digest('hex');
        compressed = path.extname(assetStat.filePath).toLowerCase() === '.zip';
        assetUrl = path.relative(assetsRootPath, assetStat.filePath);
        assetUrl = assetUrl.replace(/\\/g, '/');
        assetUrl = encodeURI(assetUrl);
        assetsObj[assetUrl] = {
            size: assetStat.size,
            md5: md5,
        };
        if (compressed) {
            assetsObj[assetUrl].compressed = true;
        }
    });
    manifest.assets = assetsObj;
    // 热更构建结果存储目录
    let hotupdateAssetsPath = path.join(projectPath, 'hotupdate-assets');
    mkdirSync(hotupdateAssetsPath);
    const manifestPath = path.join(hotupdateAssetsPath, options.platform);
    mkdirSync(manifestPath);
    hotupdateAssetsPath = path.join(manifestPath, hotupdateVersion);
    mkdirSync(hotupdateAssetsPath);
    // 如果目录不为空, 先清除
    deleteDirSync(hotupdateAssetsPath);
    // 保存 project.manifest 到磁盘
    fs.writeFileSync(destManifestPath, JSON.stringify(manifest));
    destManifestPath = path.join(manifestPath, projectManifestName);
    fs.writeFileSync(destManifestPath, JSON.stringify(manifest));
    (0, browser_1.log)('Manifest successfully generated');
    delete manifest.assets;
    delete manifest.searchPaths;
    // 保存 version.manifest 到磁盘
    const destVersionPath = path.join(manifestPath, versionManifestName);
    fs.writeFileSync(destVersionPath, JSON.stringify(manifest));
    (0, browser_1.log)('Version successfully generated');
    // 拷贝构建后的热更资源
    assetsPaths.push(projectManifestName);
    assetsPaths.forEach((assetPath) => {
        const destPath = path.join(hotupdateAssetsPath, assetPath);
        assetPath = path.join(assetsRootPath, assetPath);
        // 拷贝
        Build.Utils.copyDirSync(assetPath, destPath);
    });
    (0, browser_1.log)('copy assets success');
}
