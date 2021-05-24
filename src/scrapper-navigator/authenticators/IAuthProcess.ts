
export default interface IAuthProcess {
  authenticate() : Promise<void>;
}