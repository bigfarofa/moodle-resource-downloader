
export function asyncTimeout(ms: number) : Promise<void>{
  return new Promise((resolve, reject) => {
    setTimeout(function(){
      resolve();
    }, ms)
  })
}

export default asyncTimeout;
  