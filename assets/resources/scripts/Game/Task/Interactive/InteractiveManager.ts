export  class InteractiveManager {
    private static _instance: InteractiveManager;

    public static getInstance(): InteractiveManager {
        if(InteractiveManager._instance ==null){
            InteractiveManager._instance = new InteractiveManager();
        }
        return InteractiveManager._instance;
    }

    init(){

    }
}