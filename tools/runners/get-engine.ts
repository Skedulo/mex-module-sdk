import * as fs from "fs";
import {basePath} from "../config";
import fse = require('fs-extra');
import extract from "extract-zip";
import {resolve} from "path";
import {sh} from "../utils";

const Downloader = require("nodejs-file-downloader");

export async function run(argv: any) {
    const tag = argv["tag"]
    console.log("start running init")

    console.log(`--- Downloading Engine for ${tag} ----`)
    await downloadEngine(tag)
    console.log("--- Downloading Engine Finished ----")


    console.log("--- NPM Restore Engine ----")
    await npmRestoreEngine()
    console.log("--- NPM Restore Engine Finished ----")
}

let downloadEngine = async function (tag?: string) {
    let path = tag
        ? `https://github.com/Skedulo/mex-engine/archive/refs/tags/${tag}.zip`
        : "https://github.com/Skedulo/mex-engine/archive/refs/heads/master.zip"
    let storePath = basePath + "/engine"
    let tmpPath = basePath + "/tmp"
    let fileName = "mex-engine.zip"

    deleteFolderRecursive(storePath)
    deleteFolderRecursive(tmpPath)
    fs.mkdirSync(storePath)
    fs.mkdirSync(tmpPath)

    const downloader = new Downloader({
        url: path, //If the file name already exists, a new file with the name 200MB1.zip is created.
        directory: tmpPath, //This folder will be created, if it doesn't exist.
        fileName: fileName
    });

    const {filePath, downloadStatus} = await downloader.download(); //Downloader.download() resolves with some useful properties.

    if (downloadStatus != 'COMPLETE') {
        return
    }

    let zipFilePath = filePath

    const resolve = require('path').resolve

    await extract(resolve(zipFilePath), { dir: resolve(tmpPath) })

    let filesInTempPath = fs.readdirSync(tmpPath + "/")

    let unzipFolderPath = filesInTempPath.filter(f => !f.endsWith(".zip"))[0]

    unzipFolderPath = tmpPath + "/" + unzipFolderPath

    // Now copy all the files / folder inside out of a level
    fs.cpSync(unzipFolderPath, storePath, { recursive: true })

    fs.unlinkSync(zipFilePath)
    deleteFolderRecursive(unzipFolderPath)
}

let npmRestoreEngine = async function () {
    await sh([
        "cd engine",
        "npm install --force",
        "cd ../"
    ])
}

const deleteFolderRecursive = function(path: string) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file) {
            let curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};
