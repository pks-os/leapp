import { Integration } from "../integration";
import { IntegrationType } from "../integration-type";

export class AwsSsoIntegration extends Integration {
  constructor(
    id: string,
    alias: string,
    public portalUrl: string,
    public region: string,
    public browserOpening: string,
    public accessTokenExpiration: string
  ) {
    super(id, alias, IntegrationType.awsSso, false);
  }

  /*get isOnline(): Promise<boolean> {
    const expiration = new Date(this.accessTokenExpiration).getTime();
    const now = new Date().getTime();
    return Promise.resolve(!!this.accessTokenExpiration && now < expiration);
  }*/
}
