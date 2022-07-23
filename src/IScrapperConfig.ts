export enum EnumAuthMethod {
  TERMINAL_USER_PASSW = "terminal-user-passw",
  USER_CONTROL = "user-control"
}
export interface IScrapperConfig {
  username?: string;
  downloadPath?: string;
  authorizeUrl?: string;
  waitPageAfterLogin?: string;
  goToPageAfterLogin?: string;
  authMethod?: EnumAuthMethod;
  headless?: boolean;
}