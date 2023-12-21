import CustomScreen from "./Screens/CustomScreen";
import {CustomComponentRegistry, CustomComponentRegistryImpl} from "@skedulo/mex-engine-proxy";
import CustomListItemViewProcessor from "./processors/CustomListItemViewProcessor";
import CustomFlatPageViewProcessor from "./processors/CustomFlatPageViewProcessor";

const moduleName = "$$MODULE_NAME$$"

function main(): CustomComponentRegistry {

    const registry = new CustomComponentRegistryImpl(moduleName)

    const registryFlatPageInfo = {
        componentProcessor: new CustomFlatPageViewProcessor(moduleName)
    }

    const registryListPageInfo = {
        componentProcessor: new CustomListItemViewProcessor(moduleName)
    }

    registry.registerFlatPageComponentProcessor(registryFlatPageInfo)
    registry.registerListPageItemComponentProcessor(registryListPageInfo)

    registry.registerScreen({
        screen: CustomScreen,
        key: "CustomScreen"
    })

    return registry
}

export default main
