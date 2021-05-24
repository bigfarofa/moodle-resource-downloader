import IAuthProcess from './IAuthProcess';
import {AuthenticateConfig} from '../types';
import { Page } from 'puppeteer';
import asyncTimeout from '../../utils/async-timeout';


export interface IUserPasswAuthenticateConfig extends AuthenticateConfig {
  username: string;
  password: string;
  goToPageAfterLogin?: string;
  waitForPageAfterLogin?: string;
}



/**
 * Inputs user and password in the name of the user.
 * If the login requires 2 Factor authenticatication,
 * it might be useful to run the script in non-headless mode.
 * 
 */
export default class UserPasswAuth implements IAuthProcess {
  page: Page;
  config: IUserPasswAuthenticateConfig;
  constructor(page: Page, config: IUserPasswAuthenticateConfig) {
    this.page = page;
    this.config = config;
  }
  async authenticate(){
    let username = "";
    let config = this.config;
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

    console.log("[WARNING] If you're using 2 Factor Authentication, remember to check your phone for any prompts.");
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
    return;
  }
}