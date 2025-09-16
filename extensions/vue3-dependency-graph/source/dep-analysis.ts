import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// 扫描单个文件的导入
export function scanImports(filePath: string): string[] {
    const imports: string[] = [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
        filePath, 
        content, 
        ts.ScriptTarget.Latest, 
        true
    );

    // 增强路径解析逻辑
    function resolveImport(importPath: string) {
        if (importPath.startsWith('.')) {
            return path.resolve(path.dirname(filePath), importPath);
        }
        // 处理 node_modules 依赖
        return importPath; 
    }

    ts.forEachChild(sourceFile, (node: ts.Node) => {
        if (ts.isImportDeclaration(node)) {
            const rawPath = node.moduleSpecifier.getText().slice(1, -1);
            const resolvedPath = resolveImport(rawPath);
            imports.push(resolvedPath);
        }
    });

    return imports;
}

// 生成依赖关系图
export function generateDepMap(dir: string): Record<string, string[]> {
    const depMap: Record<string, string[]> = {};
    
    // 支持的文件扩展名
    const EXTENSIONS = ['.ts', '.tsx', '.vue']; 
    // 排除的目录
    const EXCLUDE_DIRS = ['node_modules', '.git', 'build'];

    function walkDir(currentDir: string) {
        fs.readdirSync(currentDir).forEach(file => {
            const fullPath = path.join(currentDir, file);
            
            // 跳过排除目录
            if (EXCLUDE_DIRS.some(exclude => fullPath.includes(exclude))) return;

            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else if (
                EXTENSIONS.includes(path.extname(file).toLowerCase()) &&
                !file.endsWith('.d.ts') // 排除声明文件
            ) {
                try {
                    const imports = scanImports(fullPath);
                    depMap[fullPath] = imports;
                } catch (e) {
                    console.warn(`解析文件失败: ${fullPath}`, e);
                }
            }
        });
    }

    walkDir(dir);
    console.log(`开始扫描目录: ${dir}`);
    console.log(`找到 ${Object.keys(depMap).length} 个源码文件`);
    console.log('示例文件:', Object.keys(depMap).slice(0, 3));
    return depMap;
}

// 生成可视化图表
export function generateGraph(depMap: Record<string, string[]>): { nodes: Array<{ id: string, label: string }>, edges: Array<[string, string]> } {
    const nodes: Array<{ id: string, label: string }> = [];
    const edges: Array<[string, string]> = [];
    
    // 遍历依赖关系
    for (const [filePath, deps] of Object.entries(depMap)) {
        // 确保节点ID统一使用绝对路径
        const sourceId = path.resolve(filePath);
        
        // 创建/获取源节点
        if (!nodes.find(n => n.id === sourceId)) {
            nodes.push({
                id: sourceId,
                label: path.relative(process.cwd(), filePath) // 显示相对路径
            });
        }

        // 创建边
        deps.forEach(dep => {
            const targetId = path.resolve(dep);
            edges.push([sourceId, targetId]); // 使用统一格式的ID

            // 创建/获取目标节点
            if (!nodes.find(n => n.id === targetId)) {
                nodes.push({
                    id: targetId,
                    label: path.relative(process.cwd(), dep)
                });
            }
        });
    }

    return { nodes, edges };
}

// 新增循环检测函数
export function detectCycles(depMap: Record<string, string[]>): string[][] {
    const visited = new Set<string>();
    const stack: string[] = [];
    const cycles: string[][] = [];
    const nodeState = new Map<string, number>(); // 0: 未访问, 1: 访问中, 2: 已访问

    // 初始化所有节点状态
    Object.keys(depMap).forEach(file => {
        const absFile = path.resolve(file);
        if (!nodeState.has(absFile)) {
            nodeState.set(absFile, 0);
        }
        depMap[file].forEach(dep => {
            const absDep = path.resolve(dep);
            if (!nodeState.has(absDep)) {
                nodeState.set(absDep, 0);
            }
        });
    });

    function visit(node: string, currentPath: string[]): void {
        const state = nodeState.get(node)!;
        if (state === 2) return;
        
        if (state === 1) {
            // 发现循环
            const cycleStart = currentPath.indexOf(node);
            if (cycleStart !== -1) {
                const cycle = currentPath.slice(cycleStart);
                cycles.push([...cycle, node]);
            }
            return;
        }

        nodeState.set(node, 1);
        currentPath.push(node);

        depMap[node]?.forEach(dep => {
            const absDep = path.resolve(dep);
            visit(absDep, [...currentPath]);
        });

        nodeState.set(node, 2);
        currentPath.pop();
    }

    nodeState.forEach((state, node) => {
        if (state === 0) {
            visit(node, []);
        }
    });

    // 去重处理
    const uniqueCycles = cycles.map(cycle => cycle.join('|')).filter((v, i, a) => a.indexOf(v) === i);
    return uniqueCycles.map(cycle => cycle.split('|'));
} 