import IAuthProcess from './IAuthProcess';
import {AuthenticateConfig} from '../types';
import { Page } from 'puppeteer';
import asyncTimeout from '../../utils/async-timeout';

export interface IUserControlAuthConfig {
  authorizeUrl: string;
  modulesListPage?: string;
  waitForPageAfterLogin?: string;
  username?: string;
}



export default class UserControlAuth implements IAuthProcess {
  page: Page;
  config: IUserControlAuthConfig;
  constructor(page: Page, config: IUserControlAuthConfig) {
    this.page = page;
    this.config = config;
  }

  async authenticate(){
    let config = this.config;
    await this.page.goto(config.authorizeUrl);

    if (config.username) {
      await this.page.type('[name="UserName"]', config.username);
      await asyncTimeout(1000);
      await this.page.click("#nextButton");
    }
    if (config.waitForPageAfterLogin) {

      await this.page.waitForResponse(config.waitForPageAfterLogin);
      //await this.procedureWaitForPageAfterLogin(this.page, config.waitForPageAfterLogin);
    }
    if (config.modulesListPage) {
      await this.page.goto(config.modulesListPage);
    }
    console.log("MOODLE PAGE YEAH!");
  }

  procedureWaitForPageAfterLogin(page: Page, waitForPageAfterLoginUrl: string) : Promise<void>{
    return new Promise((resolve, reject) => {
      page.once("requestfinished", function(e){
        if(e.url() === waitForPageAfterLoginUrl) {
          resolve();
        }
      })
    })
    
  
  
  }

}