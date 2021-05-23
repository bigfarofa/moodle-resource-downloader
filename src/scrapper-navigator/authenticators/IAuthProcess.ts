
import {
  AuthenticateConfig,
} from '../types';

export default interface IAuthProcess {
  authenticate(config: AuthenticateConfig) : void;
  
}