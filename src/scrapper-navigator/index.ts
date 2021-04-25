import EventEmitter  from 'events';
import {Page, ElementHandle, Request} from 'puppeteer';
import asyncTimeout from '../utils/async-timeout';
import axios, { AxiosRequestConfig } from 'axios';
import path from 'path';
import fs from 'fs';
import getFileNameFromContentDisposition from '../utils/get-filename-from-content-disposition';
import mime from 'mime-types';
import {FileResource, downloadFileResource, evaluateFileResources} from './file-resource';
import {FolderFormResource, downloadFolderFormResource, evaluateFolderFormResources} from './folder-form-resource';
import {replaceReservedDirectoryCharacters, labelizeInteger} from '../utils/string-utils';
import {ModulePage} from './module-page';

import {
  ModulePageSection,
  ModuleLink,
  ModulePageInfo,
  DownloadResourcesConfig,
  IScrapperNavigatorOptions,
  AuthenticateConfig,
  SectionResource,
  ModulePageDonwloadResourcesConfig
} from './types';


export class ScrapperNavigator extends EventEmitter {

  config?: IScrapperNavigatorOptions = {};
  page: Page;
  modulesPages: ModulePage[] = []

  constructor(page: Page, config?: IScrapperNavigatorOptions){
    super()
    this.config = config;
    this.page = page;
  }

  async authenticate(config: AuthenticateConfig) : Promise<Page> {
    let username = "";
    if (config && config.username) {
      username = config.username;
    } else if (this.config && this.config.username) {
      username = this.config.username;
    } else {
      throw new Error("USERNAME_REQUIRED");
    }

    if (!config.password) {
      throw new Error("PASSWORD_REQUIRED");
    }

    if (!config.authorizeUrl) {
      throw new Error("AUTHORIZE_URL_REQUIRED");
    }

    let password = config.password;

    await this.page.goto(config.authorizeUrl);
    await this.page.screenshot({path: './screenshots/login.png'});
    console.log("Login Page entered")
    await this.page.type('[name="UserName"]', username);
    console.log("Username typed");
    await this.page.screenshot({path: './screenshots/email_inserted.png'});
    await asyncTimeout(1000);
    await this.page.click("#nextButton");
    await this.page.waitForSelector("#passwordInput", {
      visible: true
    });
    await asyncTimeout(1000);
    console.log("PAssword input is visible");
    await this.page.screenshot({path: './screenshots/submitted_username.png'});
    await this.page.type('#passwordInput', password);
    console.log("PAssword input inputted");
    await this.page.screenshot({path: './screenshots/password_filled.png'});
    await asyncTimeout(1000);
    await this.page.click("#submitButton");
    console.log("Form submitted");

    if (config.waitForPageAfterLogin) {
      await this.page.waitForResponse(config.waitForPageAfterLogin);
    }
    if (config.goToPageAfterLogin) {
      await this.page.goto(config.goToPageAfterLogin);
    }
    console.log("MOODLE PAGE YEAH!");
    await this.page.screenshot({path: './screenshots/dashboard_moodle_page.png'});
    await this.page.select("#coc-filterterm", "all")
    console.log("Selected All modules");
    await this.page.screenshot({path: './screenshots/selected_all.png'});

    return this.page;
  }


  async loadModulesPages(modulesListPageUrl?: string, loadSections: boolean = false) {
    if (modulesListPageUrl) {
      if (this.page.url() !== modulesListPageUrl) {
        this.page.goto(modulesListPageUrl);
      }
    }
    let tempModulesList = await this.page.evaluate(function(){


      let modulesLinksDoms = document.querySelectorAll("#coc-courselist h3 a");
      let modulesLinksArr = Array.from(modulesLinksDoms);
      return modulesLinksArr.map((moduleATag) : ModuleLink => {
        return {
          name: moduleATag.getAttribute("title") as string,
          url: moduleATag.getAttribute("href") as string
        }
      });
    })

    let modulesList = tempModulesList.map((e) => new ModulePage({name: e.name, url: e.url, sections: []}));

    // Load Sections
    if (loadSections) {
      for (let moduleIndex = 0; moduleIndex < modulesList.length; moduleIndex++) {
        let currentModule = modulesList[moduleIndex];
        if (!currentModule) {
          continue;
        }
        currentModule.loadSections(this.page); 
      }
    }
    
    this.modulesPages = modulesList;
    return this;
  }

  async downloadModuleResources(modulePages: ModulePage | ModulePage[], downloadResourceConfig: ModulePageDonwloadResourcesConfig) {
    
    let modulePageList = [];
    
    if (Array.isArray(modulePages)) {
      modulePageList = modulePages;
    } else {
      modulePageList = [modulePages];
    }
    
    for (let i = 0; i < modulePageList.length; i++) {
      const modulePage =  modulePageList[i];
      await modulePage.downloadResources(this.page, downloadResourceConfig);
    }
    return this;
  }


  async downloadAllResourcesFromAllModules(downloadResourceConfig: ModulePageDonwloadResourcesConfig){
    return this.downloadModuleResources(this.modulesPages, downloadResourceConfig);
  }
}

export default ScrapperNavigator;

