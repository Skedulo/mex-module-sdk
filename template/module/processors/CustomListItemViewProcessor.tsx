import React from "react";
import {View} from "react-native";
import {
    AbstractCustomListPageViewProcessor,
    ListPageViewArgs,
} from "@skedulo/mex-engine-proxy";
import {BaseListPageViewComponentModel} from "@skedulo/mex-types";

interface CustomListItemViewComponentModel extends BaseListPageViewComponentModel {
}
export default class CustomListItemViewProcessor extends AbstractCustomListPageViewProcessor<CustomListItemViewComponentModel> {
    getCustomProcessorTypeName(): string {
        return "CustomListItemView";
    }

    generateInnerComponent(args: ListPageViewArgs<CustomListItemViewComponentModel>): JSX.Element {
        return <View style={{flex: 1}}>
            Your custom list item layout
        </View>
    }
}