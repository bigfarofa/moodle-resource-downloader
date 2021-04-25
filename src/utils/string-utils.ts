export function replaceReservedDirectoryCharacters(str: string, replaceBy: string = ""){
  return str.replace(new RegExp(/[\/\\]/g), replaceBy);
}


/**
 * 
 * @param num 
 * @param labelLength 
 * @example
 * labelizeInteger(3, 3) -> "003"
 * labelizeInteger(10, 4) -> "0010"
 */
export function labelizeInteger(num: string | number, labelLength: number){

  let str = num.toString();
  let zeros = "";
  let missingLength = labelLength - str.length;
  for (let i = 0; i < missingLength; i++) {
    zeros += "0";
  }
  return zeros + str;
  
}

/**
 * Escapes Regex special characters withing a string
 * @param text String
 * @returns 
 */
export function escapeRegExpSpecialCharacters(text: String){
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}