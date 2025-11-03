/**
 * 拼音工具类测试
 * 用于验证拼音首字母搜索功能
 */
import { PinyinUtil } from './PinyinUtil';

export class PinyinUtilTest {
    /**
     * 运行所有测试
     */
    public static runAllTests(): void {
        console.log('=== 拼音首字母搜索功能测试 ===');
        
        this.testPinyinInitials();
        this.testMatchText();
        this.testRealWorldScenarios();
        
        console.log('=== 测试完成 ===');
    }

    /**
     * 测试拼音首字母转换
     */
    private static testPinyinInitials(): void {
        console.log('\n--- 测试拼音首字母转换 ---');
        
        const testCases = [
            { input: '张三', expected: 'zs' },
            { input: '李四', expected: 'ls' },
            { input: '王五', expected: 'ww' },
            { input: '赵六', expected: 'zl' },
            { input: '张三丰', expected: 'zsf' },
            { input: '李小龙', expected: 'lxl' },
            { input: '张三123', expected: 'zs123' },
            { input: 'John', expected: 'john' },
            { input: '张三John', expected: 'zsjohn' }
        ];

        testCases.forEach(testCase => {
            const result = PinyinUtil.getPinyinInitials(testCase.input);
            const passed = result === testCase.expected;
            console.log(`${passed ? '✓' : '✗'} "${testCase.input}" -> "${result}" (期望: "${testCase.expected}")`);
        });
    }

    /**
     * 测试文本匹配功能
     */
    private static testMatchText(): void {
        console.log('\n--- 测试文本匹配功能 ---');
        
        const testCases = [
            { text: '张三', searchTerm: 'zs', shouldMatch: true },
            { text: '张三', searchTerm: 'zhang', shouldMatch: false },
            { text: '张三', searchTerm: 'san', shouldMatch: false },
            { text: '张三', searchTerm: '张', shouldMatch: true },
            { text: '张三', searchTerm: '三', shouldMatch: true },
            { text: '李小龙', searchTerm: 'lxl', shouldMatch: true },
            { text: '李小龙', searchTerm: 'lx', shouldMatch: true },
            { text: '李小龙', searchTerm: 'xl', shouldMatch: true },
            { text: 'John Smith', searchTerm: 'john', shouldMatch: true },
            { text: 'John Smith', searchTerm: 'smith', shouldMatch: true },
            { text: 'John Smith', searchTerm: 'js', shouldMatch: false },
            { text: '张三123', searchTerm: 'zs123', shouldMatch: true },
            { text: '张三123', searchTerm: '123', shouldMatch: true }
        ];

        testCases.forEach(testCase => {
            const result = PinyinUtil.matchText(testCase.text, testCase.searchTerm);
            const passed = result === testCase.shouldMatch;
            console.log(`${passed ? '✓' : '✗'} "${testCase.text}" 匹配 "${testCase.searchTerm}" -> ${result} (期望: ${testCase.shouldMatch})`);
        });
    }

    /**
     * 测试真实场景
     */
    private static testRealWorldScenarios(): void {
        console.log('\n--- 测试真实场景 ---');
        
        const userNames = [
            '张三',
            '李四',
            '王五',
            '赵六',
            '张三丰',
            '李小龙',
            '王小明',
            '赵敏',
            '张无忌',
            '李寻欢',
            '王语嫣',
            '赵灵儿',
            'John Smith',
            'Mary Johnson',
            '张三123',
            '李四456'
        ];

        const searchTerms = ['zs', 'ls', 'ww', 'zsf', 'lxl', 'john', 'mary', '123', '456'];

        searchTerms.forEach(term => {
            console.log(`\n搜索词: "${term}"`);
            const matches = userNames.filter(name => PinyinUtil.matchText(name, term));
            console.log(`匹配结果: [${matches.join(', ')}]`);
        });
    }
}

// 在开发环境中可以调用此函数进行测试
// PinyinUtilTest.runAllTests();

