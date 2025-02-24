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
exports.analyzePackageDependencies = analyzePackageDependencies;
exports.generateHtmlReport = generateHtmlReport;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
async function analyzePackageDependencies(assetsDir) {
    // 1. 获取所有包目录
    const packages = await getPackages(assetsDir);
    // 2. 收集各包间的依赖关系
    const pkgDeps = {};
    // 3. 分析每个包的依赖
    await Promise.all(packages.map(async (pkg) => {
        const pkgPath = path.join(assetsDir, pkg);
        const files = await findScriptFiles(pkgPath);
        files.forEach(file => {
            const { dependencies, fileDeps } = findPackageDependencies(file, assetsDir);
            dependencies.forEach(targetPkg => {
                if (pkg !== targetPkg) {
                    pkgDeps[pkg] = pkgDeps[pkg] || [];
                    const existing = pkgDeps[pkg].find(d => d.target === targetPkg);
                    if (existing) {
                        const fileEntry = existing.files.find(f => f.path === file);
                        if (fileEntry) {
                            fileEntry.imports.push(...(fileDeps.get(targetPkg) || []));
                        }
                        else {
                            existing.files.push({
                                path: file,
                                imports: fileDeps.get(targetPkg) || []
                            });
                        }
                    }
                    else {
                        pkgDeps[pkg].push({
                            target: targetPkg,
                            files: [{
                                    path: file,
                                    imports: fileDeps.get(targetPkg) || []
                                }]
                        });
                    }
                }
            });
        });
    }));
    return pkgDeps;
}
// 获取assets目录下所有一级子目录作为包
async function getPackages(assetsDir) {
    const entries = await fs.promises.readdir(assetsDir, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
}
// 查找包内的脚本文件
async function findScriptFiles(pkgDir) {
    const entries = await fs.promises.readdir(pkgDir, { withFileTypes: true });
    const results = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(pkgDir, entry.name);
        if (entry.isDirectory()) {
            return findScriptFiles(fullPath);
        }
        if (['.ts', '.js'].includes(path.extname(entry.name))) {
            console.log('发现脚本文件:', fullPath);
            return [fullPath];
        }
        return [];
    }));
    return results.flat();
}
// 分析文件依赖的其他包
function findPackageDependencies(filePath, assetsDir) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const dependencies = new Set();
        const fileDeps = new Map();
        // 新增：获取当前文件所属的包名
        const currentPkg = path.relative(assetsDir, path.dirname(filePath))
            .split(path.sep)[0];
        const isTargetFile = path.basename(filePath).includes('SentenceMakingModel');
        const importRegex = /(?:import|export)(?:.*?from\s+)?['"](.*?)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            // 统一路径处理逻辑
            const resolvedPath = importPath.startsWith('db://assets/')
                ? path.join(assetsDir, importPath.replace('db://assets/', ''))
                : path.resolve(path.dirname(filePath), importPath);
            // 转换为相对于assets目录的路径
            const relativePath = path.relative(assetsDir, resolvedPath);
            // 跳过assets目录外的引用
            if (relativePath.startsWith('..'))
                continue;
            // 提取目标包名（第一个目录）
            const [targetPkg, ...rest] = relativePath.split(path.sep);
            // 记录依赖关系（排除自身包）
            if (targetPkg && targetPkg !== currentPkg) {
                dependencies.add(targetPkg);
                // 记录具体文件（带扩展名）
                const targetFile = rest.join(path.sep);
                if (targetFile) {
                    fileDeps.set(targetPkg, [
                        ...(fileDeps.get(targetPkg) || []),
                        path.basename(targetFile) // 只保留文件名
                    ]);
                }
            }
        }
        // 输出具体文件依赖
        if (isTargetFile && fileDeps.size > 0) {
            console.group('🔗 详细文件依赖');
            fileDeps.forEach((paths, pkg) => {
                console.log(`包 ${pkg}:`);
                paths.forEach(p => console.log(`  → ${p}`));
            });
            console.groupEnd();
        }
        return {
            dependencies: Array.from(dependencies),
            fileDeps
        };
    }
    catch (error) {
        console.error(`解析文件失败: ${filePath}`, error);
        return { dependencies: [], fileDeps: new Map() };
    }
}
// 获取导入路径对应的包名
function getTargetPackage(absPath, assetsDir) {
    const relativePath = path.relative(assetsDir, absPath);
    if (relativePath.startsWith('..'))
        return null; // 排除assets外的文件
    const parts = relativePath.split(path.sep);
    return parts[0] || null;
}
function generateHtmlReport(deps, outputPath) {
    const htmlContent = `<!DOCTYPE html>
<html>
<style>
    .package { margin: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px; }
    .package-name { color: #2c3e50; font-size: 1.2em; margin-bottom: 10px; }
    .dependency-list { margin-left: 20px; }
    .dependency-item { margin: 8px 0; }
    .file-list { margin-left: 15px; color: #666; }
    .file-item { font-family: monospace; }
</style>
<body>
    ${Object.entries(deps).map(([sourcePkg, dependencies]) => `
    <div class="package">
        <div class="package-name">${sourcePkg}</div>
        <div class="dependency-list">
            ${dependencies.map(d => `
            <div class="dependency-item">
                <strong>→ ${d.target}</strong>
                <div class="file-list">
                    ${Array.from(new Set(d.files.flatMap(f => f.imports)))
        .map(importPath => `
                        <div class="file-item">• ${path.basename(importPath)}</div>
                        `).join('')}
                </div>
            </div>
            `).join('')}
        </div>
    </div>
    `).join('')}
</body>
</html>`;
    fs.ensureDirSync(path.dirname(outputPath));
    fs.writeFileSync(outputPath, htmlContent);
}
// 新增辅助函数获取具体导入路径
function getImportsForFile(filePath, targetPkg, deps) {
    const pkg = path.relative(process.cwd(), path.dirname(filePath)).split(path.sep)[0];
    const depDetail = deps[pkg]?.find(d => d.target === targetPkg);
    if (!depDetail)
        return '';
    const fileEntry = depDetail.files.find(f => f.path === filePath);
    return fileEntry
        ? `导入路径: ${fileEntry.imports.join(', ')}`
        : '';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1hbmFseXNpcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9wYWNrYWdlLWFuYWx5c2lzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBYUEsZ0VBOENDO0FBOEdELGdEQW1DQztBQTVNRCwyQ0FBNkI7QUFDN0IsNkNBQStCO0FBWXhCLEtBQUssVUFBVSwwQkFBMEIsQ0FDNUMsU0FBaUI7SUFFakIsYUFBYTtJQUNiLE1BQU0sUUFBUSxHQUFHLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRTlDLGdCQUFnQjtJQUNoQixNQUFNLE9BQU8sR0FBZ0IsRUFBRSxDQUFDO0lBRWhDLGNBQWM7SUFDZCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUMsR0FBRyxFQUFDLEVBQUU7UUFDdkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDMUMsTUFBTSxLQUFLLEdBQUcsTUFBTSxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFN0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNqQixNQUFNLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxHQUFHLHVCQUF1QixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1RSxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUM3QixJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2xDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFD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QUNqRSxPQUFPLFNBQVM7UUFDWixDQUFDLENBQUMsU0FBUyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN6QyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZURlcERldGFpbCB7XHJcbiAgICB0YXJnZXQ6IHN0cmluZztcclxuICAgIGZpbGVzOiBBcnJheTx7XHJcbiAgICAgICAgcGF0aDogc3RyaW5nOyAgICAgICAvLyDmupDmlofku7bot6/lvoRcclxuICAgICAgICBpbXBvcnRzOiBzdHJpbmdbXTsgIC8vIOWFt+S9k+WvvOWFpei3r+W+hFxyXG4gICAgfT47XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIFBhY2thZ2VEZXBzID0gUmVjb3JkPHN0cmluZywgUGFja2FnZURlcERldGFpbFtdPjtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhbmFseXplUGFja2FnZURlcGVuZGVuY2llcyhcclxuICAgIGFzc2V0c0Rpcjogc3RyaW5nXHJcbik6IFByb21pc2U8UGFja2FnZURlcHM+IHtcclxuICAgIC8vIDEuIOiOt+WPluaJgOacieWMheebruW9lVxyXG4gICAgY29uc3QgcGFja2FnZXMgPSBhd2FpdCBnZXRQYWNrYWdlcyhhc3NldHNEaXIpO1xyXG4gICAgXHJcbiAgICAvLyAyLiDmlLbpm4blkITljIXpl7TnmoTkvp3otZblhbPns7tcclxuICAgIGNvbnN0IHBrZ0RlcHM6IFBhY2thZ2VEZXBzID0ge307XHJcbiAgICBcclxuICAgIC8vIDMuIOWIhuaekOavj+S4quWMheeahOS+nei1llxyXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwocGFja2FnZXMubWFwKGFzeW5jIHBrZyA9PiB7XHJcbiAgICAgICAgY29uc3QgcGtnUGF0aCA9IHBhdGguam9pbihhc3NldHNEaXIsIHBrZyk7XHJcbiAgICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCBmaW5kU2NyaXB0RmlsZXMocGtnUGF0aCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZmlsZXMuZm9yRWFjaChmaWxlID0+IHtcclxuICAgICAgICAgICAgY29uc3QgeyBkZXBlbmRlbmNpZXMsIGZpbGVEZXBzIH0gPSBmaW5kUGFja2FnZURlcGVuZGVuY2llcyhmaWxlLCBhc3NldHNEaXIpO1xyXG4gICAgICAgICAgICBkZXBlbmRlbmNpZXMuZm9yRWFjaCh0YXJnZXRQa2cgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHBrZyAhPT0gdGFyZ2V0UGtnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGtnRGVwc1twa2ddID0gcGtnRGVwc1twa2ddIHx8IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gcGtnRGVwc1twa2ddLmZpbmQoZCA9PiBkLnRhcmdldCA9PT0gdGFyZ2V0UGtnKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZUVudHJ5ID0gZXhpc3RpbmcuZmlsZXMuZmluZChmID0+IGYucGF0aCA9PT0gZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlRW50cnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVFbnRyeS5pbXBvcnRzLnB1c2goLi4uKGZpbGVEZXBzLmdldCh0YXJnZXRQa2cpIHx8IFtdKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZy5maWxlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltcG9ydHM6IGZpbGVEZXBzLmdldCh0YXJnZXRQa2cpIHx8IFtdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBrZ0RlcHNbcGtnXS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0UGtnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXM6IFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogZmlsZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbXBvcnRzOiBmaWxlRGVwcy5nZXQodGFyZ2V0UGtnKSB8fCBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH0pKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHBrZ0RlcHM7XHJcbn1cclxuXHJcbi8vIOiOt+WPlmFzc2V0c+ebruW9leS4i+aJgOacieS4gOe6p+WtkOebruW9leS9nOS4uuWMhVxyXG5hc3luYyBmdW5jdGlvbiBnZXRQYWNrYWdlcyhhc3NldHNEaXI6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkZGlyKGFzc2V0c0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xyXG4gICAgcmV0dXJuIGVudHJpZXNcclxuICAgICAgICAuZmlsdGVyKGVudHJ5ID0+IGVudHJ5LmlzRGlyZWN0b3J5KCkpXHJcbiAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5uYW1lKTtcclxufVxyXG5cclxuLy8g5p+l5om+5YyF5YaF55qE6ISa5pys5paH5Lu2XHJcbmFzeW5jIGZ1bmN0aW9uIGZpbmRTY3JpcHRGaWxlcyhwa2dEaXI6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkZGlyKHBrZ0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKGVudHJpZXMubWFwKGFzeW5jIGVudHJ5ID0+IHtcclxuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihwa2dEaXIsIGVudHJ5Lm5hbWUpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmaW5kU2NyaXB0RmlsZXMoZnVsbFBhdGgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAoWycudHMnLCAnLmpzJ10uaW5jbHVkZXMocGF0aC5leHRuYW1lKGVudHJ5Lm5hbWUpKSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn5Y+R546w6ISa5pys5paH5Lu2OicsIGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgcmV0dXJuIFtmdWxsUGF0aF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgIH0pKTtcclxuICAgIHJldHVybiByZXN1bHRzLmZsYXQoKTtcclxufVxyXG5cclxuLy8g5YiG5p6Q5paH5Lu25L6d6LWW55qE5YW25LuW5YyFXHJcbmZ1bmN0aW9uIGZpbmRQYWNrYWdlRGVwZW5kZW5jaWVzKFxyXG4gICAgZmlsZVBhdGg6IHN0cmluZywgXHJcbiAgICBhc3NldHNEaXI6IHN0cmluZ1xyXG4pOiB7IGRlcGVuZGVuY2llczogc3RyaW5nW107IGZpbGVEZXBzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4gfSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGYtOCcpO1xyXG4gICAgICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgICAgIGNvbnN0IGZpbGVEZXBzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOaWsOWinu+8muiOt+WPluW9k+WJjeaWh+S7tuaJgOWxnueahOWMheWQjVxyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRQa2cgPSBwYXRoLnJlbGF0aXZlKGFzc2V0c0RpciwgcGF0aC5kaXJuYW1lKGZpbGVQYXRoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAuc3BsaXQocGF0aC5zZXApWzBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGlzVGFyZ2V0RmlsZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpLmluY2x1ZGVzKCdTZW50ZW5jZU1ha2luZ01vZGVsJyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgaW1wb3J0UmVnZXggPSAvKD86aW1wb3J0fGV4cG9ydCkoPzouKj9mcm9tXFxzKyk/WydcIl0oLio/KVsnXCJdL2c7XHJcbiAgICAgICAgbGV0IG1hdGNoO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBpbXBvcnRSZWdleC5leGVjKGNvbnRlbnQpKSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBjb25zdCBpbXBvcnRQYXRoID0gbWF0Y2hbMV07XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDnu5/kuIDot6/lvoTlpITnkIbpgLvovpFcclxuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gaW1wb3J0UGF0aC5zdGFydHNXaXRoKCdkYjovL2Fzc2V0cy8nKSBcclxuICAgICAgICAgICAgICAgID8gcGF0aC5qb2luKGFzc2V0c0RpciwgaW1wb3J0UGF0aC5yZXBsYWNlKCdkYjovL2Fzc2V0cy8nLCAnJykpXHJcbiAgICAgICAgICAgICAgICA6IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoZmlsZVBhdGgpLCBpbXBvcnRQYXRoKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOi9rOaNouS4uuebuOWvueS6jmFzc2V0c+ebruW9leeahOi3r+W+hFxyXG4gICAgICAgICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBwYXRoLnJlbGF0aXZlKGFzc2V0c0RpciwgcmVzb2x2ZWRQYXRoKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOi3s+i/h2Fzc2V0c+ebruW9leWklueahOW8leeUqFxyXG4gICAgICAgICAgICBpZiAocmVsYXRpdmVQYXRoLnN0YXJ0c1dpdGgoJy4uJykpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5o+Q5Y+W55uu5qCH5YyF5ZCN77yI56ys5LiA5Liq55uu5b2V77yJXHJcbiAgICAgICAgICAgIGNvbnN0IFt0YXJnZXRQa2csIC4uLnJlc3RdID0gcmVsYXRpdmVQYXRoLnNwbGl0KHBhdGguc2VwKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOiusOW9leS+nei1luWFs+ezu++8iOaOkumZpOiHqui6q+WMhe+8iVxyXG4gICAgICAgICAgICBpZiAodGFyZ2V0UGtnICYmIHRhcmdldFBrZyAhPT0gY3VycmVudFBrZykge1xyXG4gICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLmFkZCh0YXJnZXRQa2cpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDorrDlvZXlhbfkvZPmlofku7bvvIjluKbmianlsZXlkI3vvIlcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldEZpbGUgPSByZXN0LmpvaW4ocGF0aC5zZXApO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRhcmdldEZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlRGVwcy5zZXQodGFyZ2V0UGtnLCBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLihmaWxlRGVwcy5nZXQodGFyZ2V0UGtnKSB8fCBbXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGguYmFzZW5hbWUodGFyZ2V0RmlsZSkgLy8g5Y+q5L+d55WZ5paH5Lu25ZCNXHJcbiAgICAgICAgICAgICAgICAgICAgXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6L6T5Ye65YW35L2T5paH5Lu25L6d6LWWXHJcbiAgICAgICAgaWYgKGlzVGFyZ2V0RmlsZSAmJiBmaWxlRGVwcy5zaXplID4gMCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmdyb3VwKCfwn5SXIOivpue7huaWh+S7tuS+nei1licpO1xyXG4gICAgICAgICAgICBmaWxlRGVwcy5mb3JFYWNoKChwYXRocywgcGtnKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5YyFICR7cGtnfTpgKTtcclxuICAgICAgICAgICAgICAgIHBhdGhzLmZvckVhY2gocCA9PiBjb25zb2xlLmxvZyhgICDihpIgJHtwfWApKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZ3JvdXBFbmQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHsgXHJcbiAgICAgICAgICAgIGRlcGVuZGVuY2llczogQXJyYXkuZnJvbShkZXBlbmRlbmNpZXMpLCBcclxuICAgICAgICAgICAgZmlsZURlcHMgXHJcbiAgICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihg6Kej5p6Q5paH5Lu25aSx6LSlOiAke2ZpbGVQYXRofWAsIGVycm9yKTtcclxuICAgICAgICByZXR1cm4geyBkZXBlbmRlbmNpZXM6IFtdLCBmaWxlRGVwczogbmV3IE1hcCgpIH07XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIOiOt+WPluWvvOWFpei3r+W+hOWvueW6lOeahOWMheWQjVxyXG5mdW5jdGlvbiBnZXRUYXJnZXRQYWNrYWdlKGFic1BhdGg6IHN0cmluZywgYXNzZXRzRGlyOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcclxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHBhdGgucmVsYXRpdmUoYXNzZXRzRGlyLCBhYnNQYXRoKTtcclxuICAgIGlmIChyZWxhdGl2ZVBhdGguc3RhcnRzV2l0aCgnLi4nKSkgcmV0dXJuIG51bGw7IC8vIOaOkumZpGFzc2V0c+WklueahOaWh+S7tlxyXG4gICAgXHJcbiAgICBjb25zdCBwYXJ0cyA9IHJlbGF0aXZlUGF0aC5zcGxpdChwYXRoLnNlcCk7XHJcbiAgICByZXR1cm4gcGFydHNbMF0gfHwgbnVsbDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSHRtbFJlcG9ydChkZXBzOiBQYWNrYWdlRGVwcywgb3V0cHV0UGF0aDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCBodG1sQ29udGVudCA9IGA8IURPQ1RZUEUgaHRtbD5cclxuPGh0bWw+XHJcbjxzdHlsZT5cclxuICAgIC5wYWNrYWdlIHsgbWFyZ2luOiAyMHB4OyBwYWRkaW5nOiAxNXB4OyBib3JkZXI6IDFweCBzb2xpZCAjZWVlOyBib3JkZXItcmFkaXVzOiA4cHg7IH1cclxuICAgIC5wYWNrYWdlLW5hbWUgeyBjb2xvcjogIzJjM2U1MDsgZm9udC1zaXplOiAxLjJlbTsgbWFyZ2luLWJvdHRvbTogMTBweDsgfVxyXG4gICAgLmRlcGVuZGVuY3ktbGlzdCB7IG1hcmdpbi1sZWZ0OiAyMHB4OyB9XHJcbiAgICAuZGVwZW5kZW5jeS1pdGVtIHsgbWFyZ2luOiA4cHggMDsgfVxyXG4gICAgLmZpbGUtbGlzdCB7IG1hcmdpbi1sZWZ0OiAxNXB4OyBjb2xvcjogIzY2NjsgfVxyXG4gICAgLmZpbGUtaXRlbSB7IGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7IH1cclxuPC9zdHlsZT5cclxuPGJvZHk+XHJcbiAgICAke09iamVjdC5lbnRyaWVzKGRlcHMpLm1hcCgoW3NvdXJjZVBrZywgZGVwZW5kZW5jaWVzXSkgPT4gYFxyXG4gICAgPGRpdiBjbGFzcz1cInBhY2thZ2VcIj5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwicGFja2FnZS1uYW1lXCI+JHtzb3VyY2VQa2d9PC9kaXY+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImRlcGVuZGVuY3ktbGlzdFwiPlxyXG4gICAgICAgICAgICAke2RlcGVuZGVuY2llcy5tYXAoZCA9PiBgXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXBlbmRlbmN5LWl0ZW1cIj5cclxuICAgICAgICAgICAgICAgIDxzdHJvbmc+4oaSICR7ZC50YXJnZXR9PC9zdHJvbmc+XHJcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmlsZS1saXN0XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgJHtBcnJheS5mcm9tKG5ldyBTZXQoZC5maWxlcy5mbGF0TWFwKGYgPT4gZi5pbXBvcnRzKSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoaW1wb3J0UGF0aCA9PiBgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWxlLWl0ZW1cIj7igKIgJHtwYXRoLmJhc2VuYW1lKGltcG9ydFBhdGgpfTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBgKS5qb2luKCcnKX1cclxuICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgYCkuam9pbignJyl9XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICA8L2Rpdj5cclxuICAgIGApLmpvaW4oJycpfVxyXG48L2JvZHk+XHJcbjwvaHRtbD5gO1xyXG5cclxuICAgIGZzLmVuc3VyZURpclN5bmMocGF0aC5kaXJuYW1lKG91dHB1dFBhdGgpKTtcclxuICAgIGZzLndyaXRlRmlsZVN5bmMob3V0cHV0UGF0aCwgaHRtbENvbnRlbnQpO1xyXG59XHJcblxyXG4vLyDmlrDlop7ovoXliqnlh73mlbDojrflj5blhbfkvZPlr7zlhaXot6/lvoRcclxuZnVuY3Rpb24gZ2V0SW1wb3J0c0ZvckZpbGUoZmlsZVBhdGg6IHN0cmluZywgdGFyZ2V0UGtnOiBzdHJpbmcsIGRlcHM6IFBhY2thZ2VEZXBzKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHBrZyA9IHBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgcGF0aC5kaXJuYW1lKGZpbGVQYXRoKSkuc3BsaXQocGF0aC5zZXApWzBdO1xyXG4gICAgY29uc3QgZGVwRGV0YWlsID0gZGVwc1twa2ddPy5maW5kKGQgPT4gZC50YXJnZXQgPT09IHRhcmdldFBrZyk7XHJcbiAgICBpZiAoIWRlcERldGFpbCkgcmV0dXJuICcnO1xyXG4gICAgXHJcbiAgICBjb25zdCBmaWxlRW50cnkgPSBkZXBEZXRhaWwuZmlsZXMuZmluZChmID0+IGYucGF0aCA9PT0gZmlsZVBhdGgpO1xyXG4gICAgcmV0dXJuIGZpbGVFbnRyeSBcclxuICAgICAgICA/IGDlr7zlhaXot6/lvoQ6ICR7ZmlsZUVudHJ5LmltcG9ydHMuam9pbignLCAnKX1gXHJcbiAgICAgICAgOiAnJztcclxufSAiXX0=