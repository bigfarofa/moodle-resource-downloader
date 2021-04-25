/**
 * Based on this stackoverflow comment: https://stackoverflow.com/a/32276364
 * Just a simple prompt with a question argument.
 */
const { stdin, stdout } = process;
export function prompt(text: string) : Promise<string> {
  return new Promise((resolve, reject) => {
    stdin.resume();
    stdout.write(text);

    stdin.on('data', data => resolve(data.toString().trim()));
    stdin.on('error', err => reject(err));
  });
}

export default prompt;