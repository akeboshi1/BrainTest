import * as path from 'path';
import * as fs from 'fs-extra';

export interface PackageDepDetail {
    target: string;
    files: Array<{
        path: string;       // 源文件路径
        imports: string[];  // 具体导入路径
    }>;
}

export type PackageDeps = Record<string, PackageDepDetail[]>;

export interface TsFileInfo {
    tsPath: string;         // .ts 文件路径
    metaPath: string;       // .ts.meta 文件路径
    uuid: string;           // 从 meta 文件中读取的 UUID
    compressedUuid: string;  // 压缩后的uuid
    relativePath: string;   // 相对于项目根目录的路径
}

export interface TsFileList {
    files: TsFileInfo[];
    totalCount: number;
}

export interface ResourceFileInfo {
    filePath: string;        // 文件路径
    relativePath: string;    // 相对于项目根目录的路径
    fileName: string;        // 文件名
    fileType: 'ts' | 'prefab' | 'scene';  // 文件类型
    content?: string;        // 文件内容（用于分析）
}

export interface CompareList {
    files: ResourceFileInfo[];
    totalCount: number;
}

export interface UnusedTsFile {
    tsFile: TsFileInfo;
    reason: string;          // 未被使用的原因
}

export interface UnusedTsFileList {
    unusedFiles: UnusedTsFile[];
    totalCount: number;
}

export async function analyzePackageDependencies(
    assetsDir: string
): Promise<PackageDeps> {
    // 1. 获取所有包目录
    const packages = await getPackages(assetsDir);
    
    // 2. 收集各包间的依赖关系
    const pkgDeps: PackageDeps = {};
    
    // 3. 分析每个包的依赖
    await Promise.all(packages.map(async pkg => {
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
                        } else {
                            existing.files.push({
                                path: file,
                                imports: fileDeps.get(targetPkg) || []
                            });
                        }
                    } else {
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
async function getPackages(assetsDir: string): Promise<string[]> {
    const entries = await fs.promises.readdir(assetsDir, { withFileTypes: true });
    return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
}

// 查找包内的脚本文件
async function findScriptFiles(pkgDir: string): Promise<string[]> {
    const entries = await fs.promises.readdir(pkgDir, { withFileTypes: true });
    const results = await Promise.all(entries.map(async entry => {
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
function findPackageDependencies(
    filePath: string, 
    assetsDir: string
): { dependencies: string[]; fileDeps: Map<string, string[]> } {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const dependencies = new Set<string>();
        const fileDeps = new Map<string, string[]>();
        
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
            if (relativePath.startsWith('..')) continue;
            
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
    } catch (error) {
        console.error(`解析文件失败: ${filePath}`, error);
        return { dependencies: [], fileDeps: new Map() };
    }
}

// 获取导入路径对应的包名
function getTargetPackage(absPath: string, assetsDir: string): string | null {
    const relativePath = path.relative(assetsDir, absPath);
    if (relativePath.startsWith('..')) return null; // 排除assets外的文件
    
    const parts = relativePath.split(path.sep);
    return parts[0] || null;
}

export function generateHtmlReport(deps: PackageDeps, outputPath: string): void {
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
function getImportsForFile(filePath: string, targetPkg: string, deps: PackageDeps): string {
    const pkg = path.relative(process.cwd(), path.dirname(filePath)).split(path.sep)[0];
    const depDetail = deps[pkg]?.find(d => d.target === targetPkg);
    if (!depDetail) return '';
    
    const fileEntry = depDetail.files.find(f => f.path === filePath);
    return fileEntry 
        ? `导入路径: ${fileEntry.imports.join(', ')}`
        : '';
}

/**
 * 获取项目根目录下 /assets 文件夹中所有的 .ts 文件和对应的 .meta 文件信息
 * @param projectRoot 项目根目录路径
 * @returns 包含所有 .ts 文件信息的列表
 */
export async function getAllTsFilesWithMeta(projectRoot: string): Promise<TsFileList> {
    const tsFiles: TsFileInfo[] = [];
    
    try {
        // 只扫描 assets 目录
        const assetsDir = path.join(projectRoot, 'assets');
        
        // 检查 assets 目录是否存在
        if (!await fs.pathExists(assetsDir)) {
            console.warn(`Assets 目录不存在: ${assetsDir}`);
            return {
                files: [],
                totalCount: 0
            };
        }
        
        // 递归查找 assets 目录下的所有 .ts 文件
        const tsFilePaths = await findTsFilesRecursively(assetsDir);
        
        for (const tsPath of tsFilePaths) {
            const metaPath = tsPath + '.meta';
            
            // 检查对应的 .meta 文件是否存在
            if (await fs.pathExists(metaPath)) {
                try {
                    // 读取 .meta 文件内容
                    const metaContent = await fs.readJson(metaPath);
                    const uuid = metaContent.uuid || '';
                    const compressedUuid = Editor.Utils.UUID.compressUUID(uuid, false);
                    // 计算相对于项目根目录的路径
                    const relativePath = path.relative(projectRoot, tsPath);
                    
                    tsFiles.push({
                        tsPath,
                        metaPath,
                        uuid,
                        compressedUuid,
                        relativePath
                    });
                } catch (error) {
                    console.warn(`读取 meta 文件失败: ${metaPath}`, error);
                    // 即使 meta 文件读取失败，也记录这个 ts 文件
                    const relativePath = path.relative(projectRoot, tsPath);
                    tsFiles.push({
                        tsPath,
                        metaPath,
                        uuid: '',
                        compressedUuid: '',
                        relativePath
                    });
                }
            } else {
                // 没有对应的 .meta 文件
                const relativePath = path.relative(projectRoot, tsPath);
                tsFiles.push({
                    tsPath,
                    metaPath,
                    uuid: '',
                    compressedUuid: '',
                    relativePath
                });
            }
        }
        
        console.log(`在 assets 目录中找到 ${tsFiles.length} 个 .ts 文件`);
        
    } catch (error) {
        console.error('获取 .ts 文件列表失败:', error);
    }
    
    return {
        files: tsFiles,
        totalCount: tsFiles.length
    };
}

/**
 * 递归查找目录下的所有 .ts 文件
 * @param dir 目录路径
 * @returns .ts 文件路径数组
 */
async function findTsFilesRecursively(dir: string): Promise<string[]> {
    const tsFiles: string[] = [];
    
    try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // 在 assets 目录中，跳过一些不需要搜索的目录
                if (['library', 'temp'].includes(entry.name)) {
                    continue;
                }
                
                // 递归搜索子目录
                const subTsFiles = await findTsFilesRecursively(fullPath);
                tsFiles.push(...subTsFiles);
            } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                tsFiles.push(fullPath);
            }
        }
    } catch (error) {
        console.warn(`读取目录失败: ${dir}`, error);
    }
    
    return tsFiles;
}

/**
 * 方法a：获取assets目录下指定类型的资源文件（.ts .prefab .scene），排除.meta文件
 * @param projectRoot 项目根目录路径
 * @returns 包含所有指定类型文件信息的列表
 */
export async function getCompareList(projectRoot: string): Promise<CompareList> {
    const resourceFiles: ResourceFileInfo[] = [];
    
    try {
        const assetsDir = path.join(projectRoot, 'assets');
        
        // 检查 assets 目录是否存在
        if (!await fs.pathExists(assetsDir)) {
            console.warn(`Assets 目录不存在: ${assetsDir}`);
            return {
                files: [],
                totalCount: 0
            };
        }
        
        // 递归查找指定类型的文件
        const filePaths = await findResourceFilesRecursively(assetsDir);
        
        for (const filePath of filePaths) {
            const relativePath = path.relative(projectRoot, filePath);
            const fileName = path.basename(filePath);
            const ext = path.extname(filePath).toLowerCase();
            
            let fileType: 'ts' | 'prefab' | 'scene';
            if (ext === '.ts') {
                fileType = 'ts';
            } else if (ext === '.prefab') {
                fileType = 'prefab';
            } else if (ext === '.scene') {
                fileType = 'scene';
            } else {
                continue; // 跳过其他类型的文件
            }
            
            // 读取文件内容（用于后续分析）
            let content = '';
            try {
                content = await fs.readFile(filePath, 'utf-8');
            } catch (error) {
                console.warn(`读取文件内容失败: ${filePath}`, error);
            }
            
            resourceFiles.push({
                filePath,
                relativePath,
                fileName,
                fileType,
                content
            });
        }
        
        console.log(`找到 ${resourceFiles.length} 个资源文件（.ts/.prefab/.scene）`);
        
    } catch (error) {
        console.error('获取资源文件列表失败:', error);
    }
    
    return {
        files: resourceFiles,
        totalCount: resourceFiles.length
    };
}

/**
 * 递归查找目录下的指定类型文件
 * @param dir 目录路径
 * @returns 文件路径数组
 */
async function findResourceFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // 跳过一些不需要搜索的目录
                if (['library', 'temp'].includes(entry.name)) {
                    continue;
                }
                
                // 递归搜索子目录
                const subFiles = await findResourceFilesRecursively(fullPath);
                files.push(...subFiles);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                // 只包含指定类型的文件，排除.meta文件
                if (['.ts', '.prefab', '.scene'].includes(ext) && !entry.name.endsWith('.meta')) {
                    files.push(fullPath);
                }
            }
        }
    } catch (error) {
        console.warn(`读取目录失败: ${dir}`, error);
    }
    
    return files;
}

/**
 * 方法b：检查不被使用的ts文件
 * 使用getAllTsFilesWithMeta读取ts和uuid列表作为orglist
 * 与compareList中的资源进行引用关系判断
 * @param projectRoot 项目根目录路径
 * @returns 不被使用的ts文件列表
 */
export async function checkUnusedTsFiles(projectRoot: string): Promise<UnusedTsFileList> {
    const unusedFiles: UnusedTsFile[] = [];
    
    try {
        console.log('开始检查不被使用的ts文件...');
        
        // 获取orglist（所有ts文件和uuid）
        const orgList = await getAllTsFilesWithMeta(projectRoot);
        console.log(`orgList: 找到 ${orgList.totalCount} 个ts文件`);
        
        // 获取compareList（所有资源文件）
        const compareList = await getCompareList(projectRoot);
        console.log(`compareList: 找到 ${compareList.totalCount} 个资源文件`);
        
        // 为每个ts文件检查是否被引用
        for (const tsFile of orgList.files) {
            let isUsed = false;
            let usedBy: string[] = [];
            
            // 检查是否被compareList中的文件引用
            for (const resourceFile of compareList.files) {
                // 排除自己引用自己
                if (resourceFile.filePath === tsFile.tsPath) {
                    continue;
                }
                
                let isReferenced = false;
                
                if (resourceFile.fileType === 'ts') {
                    // 对于ts文件，检查import语句
                    isReferenced = checkTsFileImport(resourceFile.content || '', tsFile);
                    if (isReferenced) {
                        usedBy.push(`ts: ${resourceFile.fileName}`);
                    }
                } else if (resourceFile.fileType === 'prefab' ) {
                    // 对于prefab和scene文件，检查是否包含ts文件的uuid
                    isReferenced = checkFileContainsUuid(resourceFile.content || '', tsFile.uuid);
                    if (isReferenced) {
                        usedBy.push(`${resourceFile.fileType}: ${resourceFile.fileName}`);
                    }
                    
                }else if (resourceFile.fileType === 'scene') {
                    // 对于scene文件，检查是否包含ts文件的uuid 压缩后的uuid
                    isReferenced = checkFileContainsUuid(resourceFile.content || '', tsFile.compressedUuid);
                    if (isReferenced) {
                        usedBy.push(`${resourceFile.fileType}: ${resourceFile.fileName}`);
                    }
                }
                
                if (isReferenced) {
                    isUsed = true;
                }
            }
            
            // 如果没有被引用，添加到unusedFiles
            if (!isUsed) {
                unusedFiles.push({
                    tsFile,
                    reason: `未被任何文件引用`
                });
            }
        }
        
        console.log(`检查完成，发现 ${unusedFiles.length} 个不被使用的ts文件`);
        
    } catch (error) {
        console.error('检查不被使用的ts文件失败:', error);
    }
    
    return {
        unusedFiles,
        totalCount: unusedFiles.length
    };
}

/**
 * 检查ts文件中是否import了指定的ts文件
 * @param content 文件内容
 * @param targetTsFile 目标ts文件
 * @returns 是否被引用
 */
function checkTsFileImport(content: string, targetTsFile: TsFileInfo): boolean {
    if (!content || !targetTsFile.uuid) {
        return false;
    }
    
    // 获取目标文件的相对路径（不带扩展名）
    const targetRelativePath = targetTsFile.relativePath.replace(/\.ts$/, '');
    const targetFileName = path.basename(targetTsFile.tsPath, '.ts');
    
    // 检查import语句
    const importRegex = /(?:import|export)(?:.*?from\s+)?['"](.*?)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        
        // 检查是否引用了目标文件
        if (importPath.includes(targetRelativePath) || 
            importPath.includes(targetFileName) ||
            importPath.endsWith(targetFileName)) {
            return true;
        }
    }
    
    return false;
}

/**
 * 检查文件中是否包含指定的uuid
 * @param content 文件内容
 * @param uuid 要查找的uuid
 * @returns 是否包含uuid
 */
function checkFileContainsUuid(content: string, uuid: string): boolean {
    if (!content || !uuid) {
        return false;
    }
    
    // 直接检查文件内容是否包含uuid
    return content.includes(uuid);
} 