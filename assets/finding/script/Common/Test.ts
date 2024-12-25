import GameLogMgr from "./manage/GameLogMgr";

export default class TestMgr {
    private static timeData: Map<string, number> = new Map<string, number>()

    public static start(flag: string) {
        if (this.timeData.has(flag)) {
            GameLogMgr.warn("TestMgr 重复 flag ", flag)
            return
        }
        this.timeData.set(flag, new Date().getTime())
    }

    public static end(flag: string) {
        if (!this.timeData.has(flag)) {
            GameLogMgr.warn("flag不存在， 无法计算时差", flag)
            return
        }
        GameLogMgr.log(flag, new Date().getTime() - this.timeData.get(flag))
        this.timeData.delete(flag)
    }

}
