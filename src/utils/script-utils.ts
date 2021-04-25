
export function convertArgvToArray(processArgv: string[]) : string[] {
  return Array.from(processArgv);
}



export function buildGetParam(processArgv: string[]){

  let argArr = convertArgvToArray(processArgv);
  return function getParameter(param: string) : string | undefined {
    let indexParam = argArr.indexOf(param);
    if (indexParam === -1) {
      return undefined;
    }
    return argArr[indexParam + 1];
  }
}


export function buildHasArg(processArgv: string[]) {
  let argArr = convertArgvToArray(processArgv);
  return function hasArg(arg: string) : boolean{
    return !!(argArr.indexOf(arg) + 1);
  }
}