import { _decorator, Component, Label, Node } from 'cc';
import { SectionConfig } from '../config/fingerGameConfig';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSectionItem')
export class FingerGameSectionItem extends Component {
    @property(Label)
    private sectionNameLabel: Label = null;

    start() {

    }

    setData(sectionConfig: SectionConfig, sectionIndex: number) {
        this.sectionNameLabel.string = sectionConfig.name;
    }
}


