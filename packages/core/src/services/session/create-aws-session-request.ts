import { CreateSessionRequest } from "./create-session-request";

export interface CreateAwsSessionRequest extends CreateSessionRequest {
  profileId: string;
  region: string;
}
