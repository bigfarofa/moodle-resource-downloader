export interface IScrapperNavigatorOptions {
  username?: string;
  modulesPages?: string;
}

export interface AuthenticateConfig {
  username: string;
  password: string;
  authorizeUrl: string;
  goToPageAfterLogin?: string;
  waitForPageAfterLogin?: string;
}


export interface ModuleLink {
  name: string;
  url: string;
}

export interface SectionResource {
  type?: "fileResource" | "resourcePage",
  name?: string;
  url: string;
}

export interface ModulePageSection {
  name: string;
  sectionResources: SectionResource[];
}

export interface ModulePageInfo {
  name: string;
  url: string;
  sections: ModulePageSection[];
}


export interface DownloadResourcesConfig {
  localDownloadDirectory: string;
  folderNameType: "resource_page_name" | "resource_download_name",
  skipUnknownResourceNames: boolean;
}

export interface ModulePageDonwloadResourcesConfig extends DownloadResourcesConfig {
  prefixSectionDirectoryWithNumber: boolean;
}

