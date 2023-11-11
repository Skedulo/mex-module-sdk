let argv = require('minimist')(process.argv.slice(2));

async function run() {
    let actionType = argv["_"][0];

    switch(actionType) {
        case "get-engine":
            (await import("./runners/get-engine") as any).run(argv)
            break
        case "create-module":
            (await import("./runners/create-module") as any).run(argv)
            break;
        case "create-form":
            (await import("./runners/create-form") as any).run(argv)
            break;
        case "install-form":
            (await import("./runners/install-form") as any).run(argv)
            break;
        case "merge-module":
            (await import("./runners/merge-module") as any).run()
            break;
        case "update-template":
            (await import("./runners/update-template") as any).run()
            break;
        default:
            throw Error("No action is matched")
    }
}

run();
