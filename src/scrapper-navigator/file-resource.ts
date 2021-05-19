import { Page, Request} from "puppeteer";
import axios, {AxiosRequestConfig} from 'axios';
import fs from 'fs';
import path from 'path';
import {replaceReservedDirectoryCharacters} from '../utils/string-utils'
import asyncTimeout from "../utils/async-timeout";


export interface PageExtended extends Page{
  _client?: any;
}
export interface FileResource {
  url: string;
  name: string;
}

function goToAndIntercept(url: string, page: PageExtended) : Promise<Request>{

  return new Promise((resolve, reject) => {

    page.on('request', interceptedRequest => {

      // Only resolve when the redirects are done and the page reaches the target url
      if (interceptedRequest.url() === url) {
        interceptedRequest.abort();     //stop intercepting requests
        page.removeAllListeners("request");
        resolve(interceptedRequest);
      }
    });
    page.goto(url)
    .catch((err) => {
      console.error("goToAndIntercept", err);
    })

  })

}
export async function downloadFileResource(page: PageExtended, fileResource: FileResource, downloadPath: string) {
  await page.setRequestInterception(true);


  let cookies = await page.cookies();
  var dataCookies = await page._client.send('Network.getAllCookies');


  //console.log("dataCookies", dataCookies);

  console.log("FILE RESOURCE", fileResource);
  console.log("CURRENT PAGE URL", await page.url());

  const xRequest = await goToAndIntercept(fileResource.url, page);
  /*
  page.goto(fileResource.url)
  .catch((err) => {
    console.error("FILE RESOURCE", err);
  })

  const xRequest = await new Promise<Request>(resolve => {
    page.once('request', interceptedRequest => {
        interceptedRequest.abort();     //stop intercepting requests
        resolve(interceptedRequest);
    });
  });
  */
  
  const options : AxiosRequestConfig = {
    responseType: 'arraybuffer',
    method: xRequest.method(),
    url: xRequest.url(),
    data: xRequest.postData(),
    headers: xRequest.headers(),
    maxRedirects: 10
  }

  console.log("AXIOS FILE OPTIONS", options);
  

  options.headers["Cookie"] = dataCookies.cookies.map((ck:any) => ck.name + '=' + ck.value).join(';'); //cookies.map((ck) => ck.name + '=' + ck.value).join(';');
  await page.setRequestInterception(false);

  const response = await axios(options);
  console.log("OPTIONS", options)
  //console.log("Axios res", response);
  let data = response.data;
  console.log("DATA LENGTH", data.length);
  console.log("RESPONSE HEADERS", response.headers);
  console.log("IS BUFFER", Buffer.isBuffer(data));

  if (!(Buffer.isBuffer(data))) {
    console.log("DATA IS NOT BUFFER", data);
    return;
  } else {
    console.log("DATA IS BUFFER");
  }

  let filePath = path.join(downloadPath, replaceReservedDirectoryCharacters(fileResource.name));
  console.log("File Resource FilePath", filePath);
  if (fs.existsSync(filePath) === false) {
    //data.pipe(fs.createWriteStream(filePath))
    fs.writeFileSync(filePath, data, {encoding: "utf8"});
  }
  console.log("FILE Downloaded", fileResource.url, filePath);

}

export async function evaluateFileResources(page: Page) : Promise<FileResource[]>{
  return await page.evaluate(function(){
    let tempSingleRealFilesInfo: FileResource[] = [];
    let singleFileDoms = document.querySelectorAll(".resourceworkaround a");

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