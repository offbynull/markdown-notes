export class StringStream {
    private readonly _data: string;
    private _index: number = 0;
    private readonly marks: number[] = [];

    public constructor(data: string) {
        this._data = data;
    }
    
    public lookAhead(count: number) {
        if (this._index + count > this._data.length) {
            return undefined;
        }
        return this._data.substr(this._index, count);
    }

    public moveAhead(count: number) {
        const ret = this.lookAhead(count);
        if (ret === undefined) {
            throw 'Unable to move ahead';
        }
        this._index += count;
        return ret;
    }

    public mark() {
        this.marks.push(this._index);
    }

    public reset() {
        const ret = this.marks.pop();
        if (ret === undefined) {
            throw 'Nothing to reset';
        }
        this._index = ret;
    }

    public hasMore() {
        return this._index < this._data.length;
    }

    public index() {
        return this._index;
    }

    public data() {
        return this._data;
    }
}