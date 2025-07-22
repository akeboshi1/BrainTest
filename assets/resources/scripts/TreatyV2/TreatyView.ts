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

    @property([RichText])
    richTextsContent: RichText[] = [];

    private contentChunks: string[] = [];
    private currentChunkIndex: number = 0;
    private readonly CHUNK_SIZE: number = 600;
    private isLoading: boolean = false;
    private readonly LOADING_TEXT: string = '\n\n<color=#B6B6B6>文字正在加载中，请稍后...</color>';

    start() {
    }

    onDestroy() {
        this.unscheduleAllCallbacks();
    }
    private sections: string[] = [];
    restore(data: any) {
        if (data.flag == "Privacy") {
            this.sections = [
                PRIVACY_CONTENT.section0,
                PRIVACY_CONTENT.section1,
                PRIVACY_CONTENT.section2,
                PRIVACY_CONTENT.section3,
                PRIVACY_CONTENT.section4,
                PRIVACY_CONTENT.section5,
                PRIVACY_CONTENT.section6,
                PRIVACY_CONTENT.section7,
                PRIVACY_CONTENT.section8,
                PRIVACY_CONTENT.section9
            ];
        } else if (data.flag == "XieYi") {
            this.sections = [
                TREATY_CONTENT.section0,
                TREATY_CONTENT.section1,
                TREATY_CONTENT.section2,
                TREATY_CONTENT.section3,
                TREATY_CONTENT.section4,
                TREATY_CONTENT.section5,
                TREATY_CONTENT.section6,
                TREATY_CONTENT.section7,
                TREATY_CONTENT.section8,
                TREATY_CONTENT.section9
            ];
        }
        this.schedule(() => {
            this.loadNextChunk();
        }, 0.5, 10);

    }

    private loadNextChunk() {
        if (this.currentChunkIndex > 9) {
            this.unscheduleAllCallbacks();
            return;
        }
        this.richTextsContent[this.currentChunkIndex].string = this.sections[this.currentChunkIndex] || '';
        this.currentChunkIndex++;
    }

    private removeLoadingText(content: string = this.treatyRichText.string): string {
        return content ? content.replace(this.LOADING_TEXT, '') : '';
    }

    backToParent() {
        UIManager.getInstance().hidePanel(TreatyView.NAME);
    }
}


