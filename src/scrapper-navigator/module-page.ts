
import {Page, ElementHandle, HTTPRequest} from 'puppeteer';
import axios, { AxiosRequestConfig } from 'axios';
import path from 'path';
import fs from 'fs';
import getFileNameFromContentDisposition from '../utils/get-filename-from-content-disposition';
import mime from 'mime-types';
import {FileResource, downloadFileResource, evaluateFileResources, PageExtended} from './file-resource';
import {FolderFormResource, downloadFolderFormResource, evaluateFolderFormResources} from './folder-form-resource';
import {replaceReservedDirectoryCharacters, labelizeInteger} from '../utils/string-utils';


import asyncTimeout from '../utils/async-timeout';


import {
  ModulePageSection,
  ModulePageInfo,
  SectionResource,
  ModulePageDonwloadResourcesConfig
} from './types';



export class ModulePage {
  name: string;
  url: string;
  sections: ModulePageSection[];

  constructor(info: ModulePageInfo){
    this.name = info.name;
    this.url = info.url;
    this.sections = info.sections;
  }

  getModuleDestinationPath(downloadRootDirectory: string) {

    let name = replaceReservedDirectoryCharacters(this.name);
    return path.join(downloadRootDirectory, name)
  }

  getFileDestinationPath(downloadRootDirectory: string, sectionName: string, fileName: string){
    let name = replaceReservedDirectoryCharacters(this.name);
    sectionName = replaceReservedDirectoryCharacters(sectionName);
    fileName = replaceReservedDirectoryCharacters(fileName);
    return path.join(downloadRootDirectory, name, sectionName, fileName);
  }

  getSectionDirectoryPath(downloadRootDirectory: string, sectionName: string){
    let name = replaceReservedDirectoryCharacters(this.name);
    sectionName = replaceReservedDirectoryCharacters(sectionName);
    return path.join(downloadRootDirectory, name, sectionName);
  }

  async loadSections(page: Page){
    console.log("GO TO MODULE", this.name, this.url);
    await page.goto(this.url);

    try {
      await page.click("#toggles-all-opened");  
    } catch (e) {
      console.log("Page does not Show All Sections toggle")
      console.error(e);
      
    }
    

    let modulePageSections: ModulePageSection[] = await page.evaluate(function(){
      let doesPageHasToggableSections = true;
      let allSectionDivs =  Array.from(document.querySelectorAll(".ctopics .section.main"));
      if (allSectionDivs.length === 0) {
        doesPageHasToggableSections = false;
        allSectionDivs = Array.from(document.querySelectorAll(".section.main"));
      }


      let modulePageSections: ModulePageSection[] = []
      for (const sectionDiv of allSectionDivs) {
        let sectionName: string | null = "";
        let sectionNameDiv = sectionDiv.querySelector(".sectionname");
        let documentATags = Array.from(sectionDiv.querySelectorAll(".aalink"));
        let activityFoldersDOMNodes = Array.from(sectionDiv.querySelectorAll(".foldertree .fp-filename-icon a"));

        let sectionLocalDirectory = null;
        if (sectionNameDiv) {
          if (doesPageHasToggableSections) {
            sectionName = sectionNameDiv.textContent;
          } else {
            let sectionNameLink = sectionDiv.querySelector("span a");
            if (sectionNameLink) {
              sectionName = sectionNameLink.textContent;
            }
            
          }
          
        }

        if (!sectionName) {
          continue;
        }
        let sectionResources: SectionResource[] = [];

        for (const fileElem of documentATags) {
          //console.log("FileLink", fileElem);
          if (sectionName) {
            sectionResources.push({
              url: fileElem.getAttribute("href") as string,
            })
          }
          
        }
        
        for (const activityFolderDom of activityFoldersDOMNodes) {

          let fileUrl = activityFolderDom.getAttribute("href");
          let fileName = activityFolderDom.textContent;
          if (fileUrl) {
            sectionResources.push({
              type: "fileResource",
              url: fileUrl,
              name: fileName || undefined
            })
          }
          
        }
        modulePageSections.push({
          name: sectionName,
          sectionResources: sectionResources
        })

      }

      return modulePageSections;

    })

    this.sections = modulePageSections;
  }

  async downloadResources(page: Page, config: ModulePageDonwloadResourcesConfig){
    let currentUrl = await page.url();
    if (this.url !== currentUrl) {
      await page.goto(this.url);
    }

    if (this.sections.length === 0) {
      console.log("Loading Sections...");
      await this.loadSections(page);
      console.log("Loading Sections...DONE");
    }

    let modulePageDirectory = this.getModuleDestinationPath(config.localDownloadDirectory);
    if (!fs.existsSync(modulePageDirectory)) {
      fs.mkdirSync(modulePageDirectory);
    }
    console.log("SECTIONS", this.sections);
    for (let i = 0; i < this.sections.length ; i++) {
      let sectionInfo = this.sections[i];
      for (const sectionResource of sectionInfo.sectionResources) {

        await asyncTimeout(500);
        let sectionDirectoryPath = this.getSectionDirectoryPath(config.localDownloadDirectory, sectionInfo.name);
        if (config.prefixSectionDirectoryWithNumber){
          let labelNumber = labelizeInteger(i, 3);
          let prefixedSectionName = "[" + labelNumber + "]" + " " + sectionInfo.name;
          sectionDirectoryPath = this.getSectionDirectoryPath(config.localDownloadDirectory, prefixedSectionName);
        }
        

        if (sectionResource.type) {
          console.log("sectionResource", sectionResource);
          if (sectionResource.type === "fileResource") {
            if (sectionResource.name) {
              let fileResource: FileResource = {
                name: sectionResource.name,
                url: sectionResource.url
              }
              try {
                await downloadFileResource(page as PageExtended, fileResource, sectionDirectoryPath);
                
              } catch (e) {
                console.error(e);
              }
            }
            continue;
          }
          
        }

        // Inside Resource Page
        await page.goto(sectionResource.url);

        let detectedFiles = {
          fileResources: await evaluateFileResources(page),
          folderForms: await evaluateFolderFormResources(page)
        }

        // Download Files

        // Download Single File Resources
        

        if (!fs.existsSync(sectionDirectoryPath)) {
          fs.mkdirSync(sectionDirectoryPath);
        }

        console.log("sectionDirectoryPath", sectionDirectoryPath);
        for (let i = 0; i < detectedFiles.fileResources.length; i++) {
          const fileResource = detectedFiles.fileResources[i];

          try {
            await downloadFileResource(page, fileResource, sectionDirectoryPath);
          } catch (e) {
            console.error(e);
          }
          
        }


        // Download Folder via form
        for (let i = 0; i < detectedFiles.folderForms.length; i++) {
          let formInfo = detectedFiles.folderForms[i];
          console.log("PAGE URL", await page.url());
          console.log("PAGE FORMINFO", formInfo);
          try {
            await downloadFolderFormResource(page, formInfo, sectionDirectoryPath, {
              folderNameType: config.folderNameType
            });
          } catch (e) {
            console.error(e);
          }
          
        }
      }
    }
  }


}