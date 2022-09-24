import EventEmitter  from 'events';
import {Page, ElementHandle, HTTPRequest} from 'puppeteer';
import asyncTimeout from '../utils/async-timeout';
import {ModulePage} from './module-page';
import path from 'path';

import {
  ModuleLink,
  ModulePageDonwloadResourcesConfig
} from './types';

import UserPasswAuth, {IUserPasswAuthenticateConfig} from './authenticators/UserPasswAuth';
import IAuthProcess from './authenticators/IAuthProcess';
export interface IScrapperNavigatorOptions {
  modulesPages?: string;
  authenticator: IAuthProcess
}


export class ScrapperNavigator extends EventEmitter {

  config: IScrapperNavigatorOptions;
  page: Page;
  modulesPages: ModulePage[] = []

  constructor(page: Page, config: IScrapperNavigatorOptions){
    super()
    this.config = config;
    this.page = page;
  }

  async authenticate() : Promise<void> {
    return this.config.authenticator.authenticate();
  }

  setAuthenticator(auth: IAuthProcess){
    this.config.authenticator = auth;
  }


  async loadModulesPages(modulesListPageUrl?: string, loadSections: boolean = false) {
    let _modulesListPageUrl = modulesListPageUrl || this.config.modulesPages;
    if (_modulesListPageUrl) {
      if (this.page.url() !== _modulesListPageUrl) {
        await this.page.goto(_modulesListPageUrl);
      }
    }


    //await this.page.screenshot({path: path.join(__dirname, '/../../screenshots/dashboard_moodle_page.png')});
    await this.page.select("#coc-filterterm", "all")
    console.log("Selected All modules");
    //await this.page.screenshot({path: path.join(__dirname, '/../../screenshots/selected_all.png')});
    

    


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

    let modulesList = tempModulesList.map((e: ModuleLink) => new ModulePage({name: e.name, url: e.url, sections: []}));

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

