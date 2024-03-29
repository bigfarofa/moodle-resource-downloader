import { Page, HTTPRequest} from "puppeteer";
import axios, {AxiosRequestConfig, Method as AxiosMethod} from 'axios';
import getFileNameFromContentDisposition from '../utils/get-filename-from-content-disposition';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';


export interface FolderFormResource {
  sesskey: string;
  id: string;
  action: string;
  method: string;
  submitButtonId?: string,
  pageName?: string
}

interface DownloadFolderFormResourceConfig {
  folderNameType: "resource_page_name" | "resource_download_name"
}

function interceptButtonClick(buttonSelector: string, page: Page) : Promise<HTTPRequest>{
  return new Promise((resolve, reject) => {

    page.once('request', interceptedRequest => {

      interceptedRequest.abort();     //stop intercepting requests
      resolve(interceptedRequest);
    });

    page.click(buttonSelector)
    .catch((err) => {
      console.error("interceptButtonClick click error", err);
    })
  })
}

export async function downloadFolderFormResource(page: Page, folderFormResource: FolderFormResource, downloadPath: string, config: DownloadFolderFormResourceConfig){
  if (folderFormResource.submitButtonId) {

    await page.setRequestInterception(true);


    const xRequest = await interceptButtonClick("#" + folderFormResource.submitButtonId, page);
    let currentPageUrl = page.url();
    
    const options: AxiosRequestConfig = {
      responseType: "arraybuffer",
      method: xRequest.method() as AxiosMethod,
      url: folderFormResource.action,
      data: xRequest.postData(),
      headers: xRequest.headers(),
    }
    let cookies = await page.cookies();
    options.headers.Cookie = cookies.map((ck) => ck.name + '=' + ck.value).join(';');
    options.headers["Accept-Encoding"] = "gzip, deflate, br";
    options.headers["Accept"] = "*/*";
    options.headers["Connection"] = "keep-alive";

    console.log(`FORM RESOURCE [${currentPageUrl}] REQUEST CONFIG`, options);

    

    await page.setRequestInterception(false);
    try {
      console.log("Submitting Form submission as request...", options);
      let response = await axios(options);
      console.log("Submitting Form submission as request...DONE");
      let fileNameHeaders = getFileNameFromContentDisposition(response.headers["content-disposition"]);
      console.log("Response headers", response.headers);
      console.log("Form Resource page name", folderFormResource.pageName);
      console.log("Form Resource fileNameheaders", fileNameHeaders);
      let fileName = "";
      if ((config.folderNameType === "resource_page_name" && folderFormResource.pageName) || !fileNameHeaders) {
        fileName = folderFormResource.pageName + "." + mime.extension(response.headers["content-type"]);
      } else if (fileNameHeaders) {
        fileName = fileNameHeaders;
      } else {
        throw new Error("FORM_FILENAME_NOT_SET");
      }

      let localFilePath = path.join(downloadPath, fileName);

      //console.log("Form File Resource FilePath", localFilePath);
      //test

      
      fs.writeFileSync(localFilePath, response.data);
      

      console.log("::: FOLDER RESOURCE DOWNLOADED :::");
      console.log("url:", currentPageUrl);
      console.log("pageName:", folderFormResource.pageName);
      console.log("action:", folderFormResource.action);
      console.log("path:", localFilePath);
      console.log("::::::::::::::::::::::::::::::::");
      

    } catch (e) {
      console.error("Submitting Form as request...Error");
      console.error(e);
      
    }

  } else {
    throw new Error("BUTTONID_NOT_PROVIDED");
  }
}

export async function evaluateFolderFormResources(page: Page) : Promise<FolderFormResource[]> {

  return await page.evaluate(function(){
    let tempFolderForms: FolderFormResource[] = [];
    let folderFormTagsDoms = document.querySelectorAll("#region-main form");

    if (folderFormTagsDoms) {
      let folderFormTagsArr = Array.from(folderFormTagsDoms);
      for (const formDom of folderFormTagsArr) {
        let fieldId = formDom.querySelector<HTMLInputElement>("input[name='id']");
        let fieldSesskey = formDom.querySelector<HTMLInputElement>("input[name='sesskey']");

        let idValue = (fieldId) ?  fieldId.value : null;
        let sesskey = (fieldSesskey) ?  fieldSesskey.value : null;
        let formAction = formDom.getAttribute("action");
        let formMethod = formDom.getAttribute("method");

        let buttonDom = formDom.querySelector("button");
        let buttonId = (buttonDom) ? buttonDom.id : "";
        let pageNameDom = document.querySelector("h2");
        let pageName = (pageNameDom) ? pageNameDom.innerHTML : undefined;

        if (idValue && sesskey && formAction && formMethod) {
          tempFolderForms.push({
            action: formAction,
            method: formMethod,
            sesskey: sesskey,
            id: idValue,
            submitButtonId: buttonId,
            pageName: pageName
          })
        }
      }
    }

    return tempFolderForms;
  })
  

}