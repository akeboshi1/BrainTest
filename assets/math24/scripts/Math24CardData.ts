export enum SymbolsType {
    ADD = 0,
    SUBTRACT = 1,
    MULTIPLY = 2,
    DIVIDE = 3,
    None = 4
}

export class Math24CardData{
    public index:number = 0;
    private _value:number;

    private _symbols:SymbolsType = SymbolsType.None;
    public isSelected:boolean = false;

    public preCardData:Math24CardData;

    private _nextValue:number
    private _nextCardData:Math24CardData;

    public curValue():number{
        if(this.preCardData == null){
            return this.value;
        }
        let preValue = this.preCardData.curValue();
        switch(this.preCardData.symbols){
            case SymbolsType.ADD:
                return preValue + this.value;
            case SymbolsType.SUBTRACT:
                return preValue - this.value;
            case SymbolsType.MULTIPLY:
                return preValue * this.value;
            case SymbolsType.DIVIDE:
                return preValue / this.value;
        }
    }

    public get value():number{
        return this._value;
    }

    public set value(value:number){
        if(!this.isSelected){
            this._value = value;
        }else{
            this.setNextValue(value);
        }
    }

    public get symbols():number{
        return this._symbols;
    }

    public set symbols(value:number){
        this._symbols = value;
        this.isSelected = true;
    }

    public get nextCardData():Math24CardData{
        return this._nextCardData;
    }

    public setNextValue(value:number){
        if(!this.isSelected)return;
        if(!this._nextCardData)this._nextCardData = new Math24CardData();
        this._nextCardData._value = value;
        this._nextCardData.index = this.index + 1;
        this._nextCardData.preCardData = this;
        this.isSelected = false;
    }
}