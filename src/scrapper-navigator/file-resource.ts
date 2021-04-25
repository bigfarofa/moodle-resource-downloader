import { Page, Request} from "puppeteer";
import axios, {AxiosRequestConfig} from 'axios';
import fs from 'fs';
import path from 'path';
import {replaceReservedDirectoryCharacters} from '../utils/string-utils'

export interface FileResource {
  url: string;
  name: string;
}


export async function downloadFileResource(page: Page, fileResource: FileResource, downloadPath: string) {
  await page.setRequestInterception(true);

  page.goto(fileResource.url)
  .catch((err) => {
    console.error(err);
  })

  const xRequest = await new Promise<Request>(resolve => {
    page.once('request', interceptedRequest => {
        interceptedRequest.abort();     //stop intercepting requests
        resolve(interceptedRequest);
    });
  });

  
  let cookies = await page.cookies();
  const options : AxiosRequestConfig = {
    //responseType: 'arraybuffer',
    method: xRequest.method(),
    url: xRequest.url(),
    data: xRequest.postData(),
    headers: xRequest.headers()
  }
  options.headers["Cookie"] = cookies.map((ck) => ck.name + '=' + ck.value).join(';');
  await page.setRequestInterception(false);

  const response = await axios(options);
  console.log("OPTIONS", options)
  //console.log("Axios res", response);
  let data = response.data;
  //console.log(data);

  let filePath = path.join(downloadPath, replaceReservedDirectoryCharacters(fileResource.name));
  console.log("File Resource FilePath", filePath);
  if (fs.existsSync(filePath) === false) {
    fs.writeFileSync(filePath, data);
  }
  console.log("FILE Downloaded", fileResource.url, filePath);

}

export async function evaluateFileResources(page: Page) : Promise<FileResource[]>{
  return await page.evaluate(function(){
    let tempSingleRealFilesInfo: FileResource[] = [];
    let singleFileDoms = document.querySelectorAll("#region-main a");

    if (singleFileDoms) {
      let mainATags = Array.from(singleFileDoms);
      if (mainATags) {
        for (const tag of mainATags) {
          let tagHref = tag.getAttribute("href") as string;
          let extensionExtractionRegexp = new RegExp(/^.+\.([a-zA-Z]+)$/).exec(tagHref);
          if (extensionExtractionRegexp) {
            let extensionName = extensionExtractionRegexp[1];
            
            let name = tag.innerHTML;
            let dedicatedNameClass = tag.querySelector(".fp-filename");
            if (dedicatedNameClass) {
              name = dedicatedNameClass.innerHTML;
            }

            tempSingleRealFilesInfo.push({
              url: tagHref,
              name: name
            })
            
          }
          
        }
      }
    }

    return tempSingleRealFilesInfo;

  })
}