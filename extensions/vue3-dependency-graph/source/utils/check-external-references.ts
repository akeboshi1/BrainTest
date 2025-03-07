const Path = require('path');
const Fs = require('fs');

export async function checkExternalReferences(bundleName: string) {
    const projectRoot = Editor.Project.path;
    const bundlePath = Path.join(projectRoot, 'assets', bundleName);
    console.log(`🕵️ 开始扫描 Bundle [${bundleName}] 路径：${bundlePath}`);

    // 1. 扫描 prefab/scene 文件
    const targetFiles = await findAssets(bundlePath);
    console.log(`🔍 找到 ${targetFiles.length} 个资源文件`);

    // 2. 创建结果存储
    const uuidReferences = new Map<string, string[]>();

    // 3. 处理每个文件
    for (const filePath of targetFiles) {
        const uuids = await processFile(filePath);
        uuidReferences.set(Path.basename(filePath), uuids);
        console.log(`📦 ${Path.basename(filePath)} 找到 ${uuids.length} 个 UUID 引用`);
    }

    // 对UUID进行筛选
    const excludePatterns:string[] = [
        'default_ui',    // 排除引擎内部资源
        'resources',     // 排除资源目录
    ];

    for (const [filename, uuids] of uuidReferences) {
        const filtered = await Promise.all(uuids.map(async uuid => {
            try {
                const assetPath = await Editor.Message.request('asset-db', 'query-path', uuid);
                if (!assetPath) return null;
                console.log(`🔍 检查 UUID [${uuid}] 路径：${assetPath}`);

                // 基础路径检查
                const relativePath = Path.relative(projectRoot, assetPath);
                const pathSegments = relativePath.split(/[\\/]/);
                const assetsIndex = pathSegments.findIndex((s: any) => s === 'assets');

                const isSameBundle = (assetsIndex !== -1 && pathSegments.length > assetsIndex + 1 && pathSegments[assetsIndex + 1] === bundleName);
                let isExcluded = false;
                for (const pattern of excludePatterns) {
                   if(assetPath.includes(pattern)){
                        isExcluded = true;
                        break; 
                   } 
                }

                // 判断条件合并
                const result = isSameBundle || isExcluded;

                return result ? null : uuid;
            } catch {
                return null;
            }
        }));
        uuidReferences.set(filename, filtered.filter(Boolean) as string[]);
    }

    return uuidReferences;
}

// 扫描目录获取预制件和场景文件
async function findAssets(rootPath: string) {
    const entries = await Fs.promises.readdir(rootPath, { withFileTypes: true });
    const results = await Promise.all(entries.map(async (entry: any) => {
        const fullPath = Path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            // 递归扫描子目录
            return findAssets(fullPath);
        } else if (
            entry.isFile() &&
            ['.prefab', '.scene'].includes(Path.extname(entry.name).toLowerCase())
        ) {
            return fullPath;
        }
        return [];
    }));
    return results.flat();
}

// 解析文件并提取 UUID
async function processFile(filePath: string) {
    try {
        const content = await Fs.promises.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(content);
        return findUUids(jsonData);
    } catch (e) {
        console.error(`❌ 解析文件失败：${filePath}`, e);
        return [];
    }
}

// 递归查找 UUID
function findUUids(obj: any): string[] {
    const uuids = new Set<string>();

    function _traverse(current: any) {
        if (typeof current !== 'object' || current === null) return;

        if ('__uuid__' in current) {
            uuids.add(current.__uuid__);
        }

        if (Array.isArray(current)) {
            current.forEach(_traverse);
        } else {
            Object.values(current).forEach(_traverse);
        }
    }

    _traverse(obj);
    return Array.from(uuids);
}

export async function checkBundle() {
    const bundleName = "testBundle";
    return await checkExternalReferences(bundleName);
}
