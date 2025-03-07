export class RemindManager {
    private static _instance: RemindManager;

    public static getInstance(): RemindManager {
        if(RemindManager._instance ==null){
            RemindManager._instance = new RemindManager();
        }
        return RemindManager._instance;
    }

    init(){

    }
}