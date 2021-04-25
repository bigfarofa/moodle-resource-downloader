
/**
 * 
 * @param contentValue 
 * @returns Returns the filename if it finds it, otherwise returns null
 */
export function getFileNameFromContentDisposition(contentValue : string) : string | null {
  let regxRes = /\=\"(.+)\"/.exec(contentValue);

  if (regxRes && regxRes[1]) {
    return regxRes[1];
  }
  return null;
}

export default getFileNameFromContentDisposition;