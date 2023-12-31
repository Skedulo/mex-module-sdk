import {createReadStream, existsSync, readFileSync} from 'fs';
const FormData = require('form-data'); // npm install --save form-dataÏ
import axios, {AxiosError} from "axios";
import lodash from "lodash";
import * as fs from "fs";
import {DEFAULT_ADMIN_TENANT_TOKEN, DEFAULT_TENANT_ENVIRONMENT_URL} from "../config";

let exec = require('child_process').exec;

export async function run(argv: any) {
    try {
        let token = argv["t"] ?? DEFAULT_ADMIN_TENANT_TOKEN
        let folder = argv["f"]
        let url = argv["u"] ?? DEFAULT_TENANT_ENVIRONMENT_URL

        let uploadJson = JSON.parse(readFileSync(`./${folder}/upload_config.json`).toString())

        let formName = uploadJson.name
        let formDefId = uploadJson.defId
        let engineVersion = uploadJson.engineVersion
        let customFunctionFeatures = uploadJson.customFunctionFeatures

        async function uploadResourceFile() {
            logProcess("Start processing resource file")

            const staticResourcesObject: any = {}

            if (existsSync(`./${folder}/mex_definition/static_resources/regex.js`)) {
                console.log("Detect regex file")
                staticResourcesObject.regex = readFileSync(`./${folder}/mex_definition/static_resources/regex.js`).toString()
            }

            let localesObject = {}

            let promise = new Promise<void>((resolve, reject) => {
                fs.readdir(`./${folder}/mex_definition/static_resources/locales`, (err, files) => {
                    files.forEach(file => {
                        console.log("Detect local file", file, file.replace(".json", ""));
                        localesObject[file.replace(".json", "")] = JSON.parse(readFileSync(`./${folder}/mex_definition/static_resources/locales/${file}`).toString())
                    });

                    resolve();
                });
            })

            await promise;

            staticResourcesObject.locales = localesObject

            let resultFromUploadFile = await axios.post(`${url}/form/resources`, staticResourcesObject,{
                headers: {
                    "Authorization" : "Bearer " + token,
                    'Content-Type': 'application/json'
                }
            })

            if (resultFromUploadFile.status != 200)
                throw new Error("failed to upload resource file")

            console.log("Resource file uploaded successfully", resultFromUploadFile.data.result)

            logProcess("Finish processing resource file", true)

            return resultFromUploadFile.data.result
        }

        async function uploadCustomFunction(mexDefUID: string) {
            logProcess("Start processing custom function")

            if (!existsSync(`./${folder}/custom_functions`)) {
                logProcess("Done processing custom function - (Not having custom function)", true)
                return
            }

            await sh(`./zip_custom_function.sh -f ${folder}`)

            const formData = new FormData();
            formData.append("file", createReadStream(`./${folder}/custom_functions/customfunction.tar.gz`));
            if (customFunctionFeatures) {
                formData.append("features", JSON.stringify(customFunctionFeatures));
            }

            let resultFromUploadFile = await axios.post(`${url}/form/definition/cf/source/${mexDefUID}`, formData, {
                headers: {
                    "Authorization" : "Bearer " + token,
                    "X-Skedulo-Name": "static_resources.zip",
                    "X-Skedulo-Description": formName
                }
            })

            if (resultFromUploadFile.status != 200)
                throw new Error("Failed to load form definition")

            logProcess("Done processing custom function", true)
        }

        async function deleteFormIfExisted() {
            logProcess("Start processing existing form")

            let results = await axios.get(`${url}/form/definition/all`,{
                headers: {
                    "Authorization" : "Bearer " + token
                }
            })

            if (results.status != 200)
                throw new Error("Failed to load form definition")

            let existingForms = lodash.filter<any>(results.data.result, function (item:any) { return item.defId == formDefId })

            if (existingForms !== null) {
                let promises: any[] = []

                // has existing forms, removing
                lodash.forEach(existingForms, async (form:any) => {
                    console.log("Removing form UID", form.uid)

                    promises.push(axios.delete(`${url}/form/definition/${form.uid}`,{
                        headers: {
                            "Authorization" : "Bearer " + token
                        }
                    }))
                })

                await Promise.all(promises)
            }

            logProcess("End processing existing form", true)
        }

        async function uploadMexDef(resourceId: string) {

            logProcess("Start Uploading mex def")

            let metadata = JSON.parse(readFileSync(`./${folder}/mex_definition/metadata.json`).toString())
            metadata.staticResourcesId = resourceId
            const ui = JSON.parse(readFileSync(`./${folder}/mex_definition/ui_def.json`).toString())
            const staticFetch = JSON.parse(readFileSync(`./${folder}/mex_definition/staticFetch.json`).toString())
            const instanceFetch = JSON.parse(readFileSync(`./${folder}/mex_definition/instanceFetch.json`).toString())

            const formBody:any = {
                ui,
                name: formName,
                defId: formDefId,
                engineVersion,
                metadata,
                staticFetch,
                instanceFetch
            }

            if (existsSync(`./${folder}/mex_definition/onlineSearch.json`)) {
                const onlineSearch = JSON.parse(readFileSync(`./${folder}/mex_definition/onlineSearch.json`).toString())

                formBody.onlineSearch = onlineSearch
            }

            let result = await axios.post(`${url}/form/definition`, formBody, {
                headers: {
                    "Authorization" : "Bearer " + token
                }
            })

            console.log("Upload mex def result", JSON.stringify(result.data))

            logProcess("Done Uploading mex def", true)

            return result.data.result.uid
        }

        async function buildForm(mexDefUID: string) {

            logProcess(`Start building form: ${mexDefUID}`)

            await axios.post(`${url}/form/definition/build/${mexDefUID}`, null,{
                headers: {
                    "Authorization" : "Bearer " + token
                }
            })

            // wait for 6o secs
            let waited = 0;

            let response;

            while(waited <= 120) {

                response =  await axios.get(`${url}/form/definition/uid/${mexDefUID}`,{
                    headers: {
                        "Authorization" : "Bearer " + token
                    }
                })

                if (response.data.result.status == 'Validated' || response.data.result.status == 'Failed') {
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, 5000));

                waited += 5;

                console.log(`Waited for ${waited} secs with response status`, response.data.result.status)
            }

            if (response.data.result.status == 'Failed') {
                throw new Error("Build failed with FormId: " + mexDefUID)
            }

            logProcess("Done building Form", true)
        }

        async function installForm(mexDefUID: string) {

            logProcess("Start installed form")

            await axios.post(`${url}/form/definition/install/${mexDefUID}`, {},{
                headers: {
                    "Authorization" : "Bearer " + token
                }
            })

            logProcess("Done install Form", true)
        }

        await deleteFormIfExisted()
        let resourceId = await uploadResourceFile()
        let mexDefUID = await uploadMexDef(resourceId)
        await uploadCustomFunction(mexDefUID)
        await buildForm(mexDefUID)
        await installForm(mexDefUID)

        let response =  await axios.get(`${url}/form/definition/uid/${mexDefUID}`,{
            headers: {
                "Authorization" : "Bearer " + token
            }
        })

        if (response.data.result.status == 'Installed') {
            logProcess("SUCCESSFULLY: Form is deployed successfully", true)
        }
        else {
            logProcess("FAILED: Form is failed to build/deploy", true)
        }

        console.log("response", response.data)

        console.log("Install successfully");

    } catch (err) {
        if (err instanceof AxiosError) {
            console.log("error when calling API", err.request)
            console.log("api response", JSON.stringify(err.response.data))
        } else {
            console.log("error", err)
        }

        console.log("Failed:", err.message);
    }
}

function logProcess(message: string, end?: boolean) {
    console.log(`------ ${message} ------`)

    if (end)
        console.log("")
}

async function sh(cmd) {
    return new Promise(function (resolve, reject) {
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}
