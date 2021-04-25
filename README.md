# Moodle resource downloader

## About
Web scrapper built with [Puppeteer](https://developers.google.com/web/tools/puppeteer/) and Typescript, with its focus being downloading moodle resources.


## DISCLOSURE
This scrapper was developed based on the interface of a education institution that I'm part of. So it might not work on yours.


## Installation

- Install the dependencies: `npm install`
- Build the project: `npx tsc`

## Run configuration
You can run the scrapper by simply using `npm run start` or `node ./dist/main.js`.

There are some run configurations you can set up. Either via command line and/or configuration file (`scrapper-config.json`).


There is no `scrapper-config.json` because private information might be present there, so create one based on the file: `template-scrapper-config.json`.

### Config
If there there is a option that is present in both command line and configuration file, the CLI flag and JSON parameter will be seperated by a `|`.

- `--username <moodle-login-username>` | `username` The username you use to login
- `--download-path <path>` | `downloadPath` The path where the resources will be downloaded(By default it's the `./downloads` folder)
- `--no-headless` When this flag is on, Puppeteer will be executed with the option with the headless mode deactivated.
- `--wait-page-after-login | waitPageAfterLogin` - What page should the scrapper wait after authenticating.

