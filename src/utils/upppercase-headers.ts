


export interface Headers {
  [headerName: string] : string
}


function capitalizeFirstLetters(c: string) : string {
  let splitted = c.split("-");

  for (let i = 0; i < splitted.length; i++) {
    let word = splitted[i];
    let firstLetter = word.charAt(0);
    splitted[i] = word.replace(firstLetter, firstLetter.toUpperCase());
  }

  return splitted.join("-");
  
}
export function upperCaseHeaders(headers: Headers) : Headers{

  let newHeaders: Headers = {};
  
  for (const headerName in headers) {
    if (headers.hasOwnProperty(headerName)) {
      const headerValue = headers[headerName];
      let headerUppercased = capitalizeFirstLetters(headerName);
      newHeaders[headerUppercased] = headerValue;
    }
  }

  return newHeaders;
}


export default upperCaseHeaders;