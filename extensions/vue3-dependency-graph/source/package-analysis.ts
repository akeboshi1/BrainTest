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