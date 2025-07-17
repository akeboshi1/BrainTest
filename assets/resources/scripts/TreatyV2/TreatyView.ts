import { _decorator, Node, RichText, ScrollView } from 'cc';
import { BasePanel } from '../Core/UI/BasePanel';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { PRIVACY_CONTENT, TREATY_CONTENT } from './TreatyDataConfig';
const { ccclass, property } = _decorator;

@ccclass('TreatyView')
export class TreatyView extends BasePanel {
    static NAME = 'TreatyView';

    @property(RichText)
    treatyRichText: RichText = null;

    @property(ScrollView)
    scrollView: ScrollView = null;

    private contentChunks: string[] = [];
    private currentChunkIndex: number = 0;
    private readonly CHUNK_SIZE: number = 600; 
    private isLoading: boolean = false;
    private readonly LOADING_TEXT: string = '\n\n<color=#B6B6B6>文字正在加载中，请稍后...</color>';

    start() {
        if (this.scrollView) {
            // 监听滚动到底事件
            this.scrollView.node.on('bounce-bottom', this.loadNextChunk, this);
        }
    }

    onDestroy() {
        if (this.scrollView) {
            this.scrollView.node.off('bounce-bottom', this.loadNextChunk, this);
        }
    }

    restore(data: any) {
        let fullContent: string = "";
        if (data.flag == "Privacy") {
            fullContent = PRIVACY_CONTENT.privacyPolicy;
        } else if (data.flag == "XieYi") {
            fullContent = TREATY_CONTENT.getTreaty;
        }

        // 分块存储内容
        for (let i = 0; i < fullContent.length; i += this.CHUNK_SIZE) {
            this.contentChunks.push(fullContent.slice(i, i + this.CHUNK_SIZE));
        }

        // 初始只加载第一块内容
        if (this.contentChunks.length > 0) {
            this.treatyRichText.string = this.contentChunks[0];
            if (this.contentChunks.length > 1) {
                this.treatyRichText.string += this.LOADING_TEXT;
            }
            this.currentChunkIndex = 1;
        }
    }

    private loadNextChunk() {
        if (this.isLoading || this.currentChunkIndex >= this.contentChunks.length) {
            if (this.currentChunkIndex >= this.contentChunks.length) {
                this.removeLoadingText();
            }
            return;
        }

        this.isLoading = true;

        // 移除当前的加载提示（如果有的话）
        const content = this.removeLoadingText(this.treatyRichText.string);
        
        // 一次性加载剩余的所有内容
        let newContent = content;
        while (this.currentChunkIndex < this.contentChunks.length) {
            newContent += this.contentChunks[this.currentChunkIndex];
            this.currentChunkIndex++;
        }
        
        // 直接更新内容
        this.treatyRichText.string = newContent;
        this.isLoading = false;
    }

    private removeLoadingText(content: string = this.treatyRichText.string): string {
        return content ? content.replace(this.LOADING_TEXT, '') : '';
    }

    backToParent() {
        UIManager.getInstance().hidePanel(TreatyView.NAME);
    }
}


