import axios from 'axios';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import prompts from 'prompts';

import {EnumAuthMethod, IScrapperConfig} from './IScrapperConfig';
import {escapeRegExpSpecialCharacters} from './utils/string-utils';
import * as scriptUtils from './utils/script-utils';
import ScrapperNavigator from './scrapper-navigator';
import UserPasswAuth from './scrapper-navigator/authenticators/UserPasswAuth';
import UserControlAuth from './scrapper-navigator/authenticators/UserControlAuth';
import { ModulePage } from './scrapper-navigator/module-page';
import IAuthProcess from './scrapper-navigator/authenticators/IAuthProcess';

let scrapperConfig: IScrapperConfig = {};

let scrapperConfigDir = "./scrapper-config.json";

let getArgParam = scriptUtils.buildGetParam(process.argv);
let hasArg = scriptUtils.buildHasArg(process.argv);

if(fs.existsSync(scrapperConfigDir)){
  scrapperConfig = JSON.parse(fs.readFileSync(scrapperConfigDir).toString());
}







async function execute() : Promise<void>{
  let userEmail: string | undefined = undefined;
  
  let defaultDownloadPath = __dirname + "/../downloads";
  let downloadPathInConfig = scrapperConfig.downloadPath || undefined;
  let resourcesDownloadPath = getArgParam("--download-path") || downloadPathInConfig || defaultDownloadPath;
  let fullResourcesDownloadPath = path.resolve(resourcesDownloadPath)
  let authMethod = getArgParam("--auth-method") || scrapperConfig.authMethod || EnumAuthMethod.USER_CONTROL;
  let authorizeUrl = getArgParam("--authorize-url") || scrapperConfig.authorizeUrl;
  let waitForPageAfterLogin = getArgParam("--wait-page-after-login") || scrapperConfig.waitPageAfterLogin;
  let modulesListPage = getArgParam("--modules-list-page") || scrapperConfig.modulesListPage || undefined;
  

  if (!authorizeUrl) {
    throw new Error("Authorization URL not provided.")
  }

  let cliArgHeadless = getArgParam("--headless");
  let isHeadless = false;
  if (cliArgHeadless && cliArgHeadless === "true") {
    isHeadless = true
  } else if (typeof scrapperConfig.headless === "boolean"){
    isHeadless = scrapperConfig.headless;
  }

  if (authMethod === EnumAuthMethod.USER_CONTROL) {
    isHeadless = false;
    console.log("Warning: disabling headless mode due to Auth Method being 'user-control'");
  }

  const responseTimeout = 1800000;
  const browser = await puppeteer.launch({
    headless: isHeadless,
    product: "chrome",
    timeout: responseTimeout
  });


  const page = await browser.newPage();

  page.setDefaultTimeout(responseTimeout);
  page.setDefaultNavigationTimeout(responseTimeout);

  let authenticator: IAuthProcess | undefined = undefined;

  
  if (authMethod === EnumAuthMethod.TERMINAL_USER_PASSW) {
    if (scrapperConfig.username) {
      userEmail = scrapperConfig.username;
    } else if (getArgParam("--username")) {
      userEmail = getArgParam("--username") as string;
    } else {
      let userResponse = await prompts({
        type: 'text',
        name: 'username',
        message: `Username:`
      })
      userEmail = userResponse.username;
    }
  
    let passwdResponse = await prompts({
      type: 'password',
      name: 'password',
      message: 'Password'
    });
  
  
    let userPassword = passwdResponse.password;
  
    if (!userEmail) {
      throw new Error("USERNAME IS REQUIRED");
    }
  
    if (!userPassword) {
      throw new Error("PASSWORD IS REQUIRED");
    }

    
    

    authenticator = new UserPasswAuth(page, {
      authorizeUrl: authorizeUrl,
      username: userEmail,
      password: userPassword,
      waitForPageAfterLogin: waitForPageAfterLogin,
      modulesListPage: modulesListPage,
    });

  } else {

    userEmail = getArgParam("--username") || scrapperConfig.username;
    authenticator = new UserControlAuth(page, {
      username: userEmail,
      authorizeUrl: authorizeUrl,
      waitForPageAfterLogin: waitForPageAfterLogin,
      modulesListPage: modulesListPage,
    });
  }

  


  
  let scrapperNavigator = new ScrapperNavigator(page, {authenticator: authenticator});

  await scrapperNavigator.authenticate();

  console.log("AUTHENTICATION DONE")

  await scrapperNavigator.loadModulesPages();
  console.log("MODULES LOAD DONE")


  console.log("::::::::::::::::::::::::::::::::::");
  console.log(":::::::::: MODULES LIST ::::::::::");
  console.log("::::::::::::::::::::::::::::::::::");
  for (let i = 0; i < scrapperNavigator.modulesPages.length; i++) {
    const modulePageDoc = scrapperNavigator.modulesPages[i];
    console.log(`[${i}] => ${modulePageDoc.name}`);
  }


  
  

  async function promptForModules(){
    let wrongModuleSelection = true;
    let confirmedChoice = false;
    let modulesToDownload: ModulePage[] = [];
    while (wrongModuleSelection || !confirmedChoice) {
      wrongModuleSelection = false;
      modulesToDownload = [];
      let moduleSelection = await prompts({
        type: 'text',
        name: 'moduleChoices',
        message: "Select the modules by typing the numbers seperated by commas. E.g 1,5,2:"
      })
      if (moduleSelection.moduleChoices === "exit") {
        throw new Error("REQUESTED_EXIT");
      }
      let moduleSelectionSplit = moduleSelection.moduleChoices.split(",");
      let wrongQueries = [];
      for (const moduleQuery of moduleSelectionSplit) {
        
        let moduleIndex = Number.parseInt(moduleQuery);
        let foundModulePage: ModulePage | undefined = undefined;
        if (!Number.isNaN(moduleIndex)) {

          if (moduleIndex < scrapperNavigator.modulesPages.length) {
            foundModulePage = scrapperNavigator.modulesPages[moduleIndex];
          } else {
            wrongQueries.push(moduleQuery);
          }
          
          
        } else {
          foundModulePage = scrapperNavigator.modulesPages.find((e) => {
            let regx = new RegExp(escapeRegExpSpecialCharacters(moduleQuery), "gim");
            return regx.test(e.name);
          })
          if (!foundModulePage) {
            wrongQueries.push(moduleQuery);
          }
        }

        if (foundModulePage) {
          modulesToDownload.push(foundModulePage);
        }
        if (wrongQueries.length > 0) {
          console.log("Error: Could not find modules with the following queries:");
          for (let i = 0; i < wrongQueries.length; i++) {
            const element = wrongQueries[i];
            console.log("=> ", element);
          }
        }

        wrongModuleSelection = (!foundModulePage || wrongQueries.length > 0);
      }

      if (!wrongModuleSelection) {
        console.log("::::::::::::::::::::::::::::::::::::::");
        console.log(":::::::::: SELECTED MODULES ::::::::::");
        console.log("::::::::::::::::::::::::::::::::::::::");
        for (const moduleDoc of modulesToDownload) {
          console.log(" =>", moduleDoc.name);
        }
        
        console.log("\nDownloads folder targeted at:", fullResourcesDownloadPath);
        let confirmChoiceInput = "";
        while (["y", "n"].indexOf(confirmChoiceInput.toLowerCase()) === -1) {
          let promptInput = await prompts({
            type: 'text',
            name: 'confirmChoice',
            message: "Do you confirm to download the resources of the following modules(y/n):"
          })
          if (promptInput.confirmChoice === "exit") {
            throw new Error("REQUESTED_EXIT");
          }
          confirmChoiceInput = promptInput.confirmChoice;
        }

        confirmedChoice = (confirmChoiceInput === "y");
      }

      
    }
    return modulesToDownload;
  
  }
  let modulesToDownload = [];
  try {
    modulesToDownload = await promptForModules(); 
  } catch (e) {
    console.error(e);
    return;
  }
   
  

  
  
  for (let i = 0; i < modulesToDownload.length; i++) {
    const modulePage = modulesToDownload[i];
    console.log("Downloading resources from the module:", modulePage.name);
    await scrapperNavigator.downloadModuleResources(modulePage, {
      folderNameType: "resource_download_name",
      localDownloadDirectory: resourcesDownloadPath,
      skipUnknownResourceNames: true,
      prefixSectionDirectoryWithNumber: true
    });
  }
  


  // Authorize
  // LoadMOdulesList
  // GetModules
  // PrintModules
  // Select wichh modules to Download
  // modulesToDownload = filter()
  // for each module
  //     module.download()

}


execute()
.then(() => {
  process.exit();
})
.catch((err) => {
  console.error(err);
  process.exit(1);
})