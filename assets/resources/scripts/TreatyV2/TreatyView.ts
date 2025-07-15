import { _decorator,  Node, RichText, ProgressBar } from 'cc';
import { BasePanel } from '../Core/UI/BasePanel';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { PRIVACY_CONTENT, TREATY_CONTENT } from './TreatyDataConfig';
const { ccclass, property } = _decorator;

@ccclass('TreatyView')
export class TreatyView extends BasePanel {
    static NAME = 'TreatyView';

    @property(RichText)
    treatyRichText: RichText = null;

    @property(ProgressBar)
    loadingProgress: ProgressBar = null;

    @property(Node)
    loadingNode: Node = null;

    private contentChunks: string[] = [];
    private currentChunkIndex: number = 0;
    private readonly CHUNK_SIZE: number = 1000; // 每块大小
    private isLoading: boolean = false;

    start() {
     
        // if (this.loadingNode) {
        //     this.loadingNode.active = true;
        // }
        // if (this.loadingProgress) {
        //     this.loadingProgress.progress = 0;
        // }
    }
    restore(data: any) {
        let fullContent:string="";
        if (data.flag == "Privacy") {
            // 将内容分块
           fullContent = PRIVACY_CONTENT.privacyPolicy;
        } else if (data.flag == "XieYi") {
            // 将内容分块
           fullContent = TREATY_CONTENT.getTreaty;
        }
        for (let i = 0; i < fullContent.length; i += this.CHUNK_SIZE) {
            this.contentChunks.push(fullContent.slice(i, i + this.CHUNK_SIZE));
        }
        // 开始加载第一块
        this.loadNextChunk();
    }

    private loadNextChunk() {
        if (this.isLoading || this.currentChunkIndex >= this.contentChunks.length) {
            if (this.currentChunkIndex >= this.contentChunks.length) {
                // 加载完成，隐藏加载指示器
                if (this.loadingNode) {
                    this.loadingNode.active = false;
                }
            }
            return;
        }

        this.isLoading = true;

        // 更新进度条
        if (this.loadingProgress) {
            this.loadingProgress.progress = this.currentChunkIndex / this.contentChunks.length;
        }

        // 使用 requestAnimationFrame 来确保在下一帧渲染
        requestAnimationFrame(() => {
            // 累加内容
            const currentContent = this.treatyRichText.string || '';
            this.treatyRichText.string = currentContent + this.contentChunks[this.currentChunkIndex];

            this.currentChunkIndex++;
            this.isLoading = false;

            // 如果还有更多内容，继续加载
            if (this.currentChunkIndex < this.contentChunks.length) {
                this.scheduleOnce(() => {
                    this.loadNextChunk();
                }, 0.1); // 100ms 延迟加载下一块
            }
        });
    }
    backToParent() {
        UIManager.getInstance().hidePanel(TreatyView.NAME);
    }
    update(deltaTime: number) {
        // 空实现
    }
}


