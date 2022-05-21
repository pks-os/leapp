import * as crypto from "crypto";
import axios, { AxiosRequestConfig } from "axios";
import { SessionFactory } from "./session-factory";
import { SessionType } from "../models/session-type";
import { NamedProfilesService } from "./named-profiles-service";
import { LocalSecretDto } from "../models/web-dto/local-secret-dto";
import { AwsIamUserLocalSessionDto } from "../models/web-dto/aws-iam-user-local-session-dto";
import { SessionManagementService } from "./session-management-service";
import { EncryptionProvider } from "../pro/encryption/encryption.provider";
import { VaultProvider } from "../pro/vault/vault-provider";
import { UserProvider } from "../pro/user/user.provider";
import { HttpClientInterface } from "../pro/http/HttpClientInterface";
import { User } from "../pro/user/user";
import { SecretType } from "../models/web-dto/secret-type";
import { AwsSsoLocalIntegrationDto } from "../models/web-dto/aws-sso-local-integration-dto";
import { AwsSsoIntegrationService } from "./aws-sso-integration-service";
import { AwsIamUserSession } from "../models/aws-iam-user-session";
import { AwsIamRoleChainedLocalSessionDto } from "../models/web-dto/aws-iam-role-chained-local-session-dto";
import { AwsSessionService } from "./session/aws/aws-session-service";
import { AwsIamRoleChainedService } from "./session/aws/aws-iam-role-chained-service";
import { AwsIamUserService } from "./session/aws/aws-iam-user-service";

export class WebSyncService {
  private readonly encryptionProvider: EncryptionProvider;
  private readonly vaultProvider: VaultProvider;
  private readonly userProvider: UserProvider;
  private currentUser: User;

  constructor(
    private readonly sessionFactory: SessionFactory,
    private readonly namedProfilesService: NamedProfilesService,
    private readonly sessionManagementService: SessionManagementService,
    private readonly awsSsoIntegrationService: AwsSsoIntegrationService
  ) {
    const apiEndpoint = "http://localhost:3000";
    const httpClient: HttpClientInterface = {
      get: async <T>(url: string): Promise<T> => (await axios.get<T>(url, this.getHttpClientConfig())).data,
      post: async <T>(url: string, body: any): Promise<T> => (await axios.post<T>(url, body, this.getHttpClientConfig())).data,
      put: async <T>(url: string, body: any): Promise<T> => (await axios.put<T>(url, body, this.getHttpClientConfig())).data,
    };
    this.encryptionProvider = new EncryptionProvider((crypto as any).webcrypto);
    this.vaultProvider = new VaultProvider(apiEndpoint, httpClient, this.encryptionProvider);
    this.userProvider = new UserProvider(apiEndpoint, httpClient, this.encryptionProvider);
  }

  async syncSecrets(email: string, password: string): Promise<LocalSecretDto[]> {
    this.currentUser = await this.userProvider.signIn(email, password);
    const rsaKeys = await this.getRSAKeys(this.currentUser);
    const createSessionDtos = await this.vaultProvider.getSecrets(rsaKeys.privateKey);
    for (const localSecretDto of createSessionDtos) {
      await this.syncSecret(localSecretDto);
    }
    return createSessionDtos;
  }

  async syncSecret(localSecret: LocalSecretDto): Promise<void> {
    if (localSecret.secretType === SecretType.awsSsoIntegration) {
      const localIntegrationDto = localSecret as AwsSsoLocalIntegrationDto;
      await this.awsSsoIntegrationService.createIntegration({
        alias: localIntegrationDto.alias,
        portalUrl: localIntegrationDto.portalUrl,
        region: localIntegrationDto.region,
        browserOpening: localIntegrationDto.browserOpening,
        integrationId: localIntegrationDto.id,
      });
    } else if (localSecret.secretType === SecretType.awsIamUserSession) {
      const localSessionDto = localSecret as AwsIamUserLocalSessionDto;
      const sessionService = (await this.sessionFactory.getSessionService(SessionType.awsIamUser)) as AwsIamUserService;
      const profileId = await this.setupAwsSession(sessionService, localSessionDto.sessionId, localSessionDto.profileName);
      await sessionService.create({
        sessionName: localSessionDto.sessionName,
        accessKey: localSessionDto.accessKey,
        secretKey: localSessionDto.secretKey,
        region: localSessionDto.region,
        mfaDevice: localSessionDto.mfaDevice,
        profileId,
        sessionId: localSessionDto.sessionId,
      });
    } else if (localSecret.secretType === SecretType.awsIamRoleChainedSession) {
      const localSessionDto = localSecret as AwsIamRoleChainedLocalSessionDto;
      const sessionService = (await this.sessionFactory.getSessionService(SessionType.awsIamRoleChained)) as AwsIamRoleChainedService;
      const profileId = await this.setupAwsSession(sessionService, localSessionDto.sessionId, localSessionDto.profileName);
      await sessionService.create({
        sessionName: localSessionDto.sessionName,
        region: localSessionDto.region,
        roleArn: localSessionDto.roleArn,
        profileId,
        parentSessionId: localSessionDto.parentSessionId,
        roleSessionName: localSessionDto.roleSessionName,
        sessionId: localSessionDto.sessionId,
      });
    }
  }

  async setupAwsSession(sessionService: AwsSessionService, sessionId: string, profileName: string): Promise<string> {
    const localSession = this.sessionManagementService.getSessionById(sessionId) as AwsIamUserSession;
    if (localSession) {
      await sessionService.delete(sessionId);
      return localSession.profileId;
    } else {
      return this.namedProfilesService.mergeProfileName(profileName).id;
    }
  }

  async getRSAKeys(user: User): Promise<CryptoKeyPair> {
    const rsaKeyJsonPair = { privateKey: user.privateRSAKey, publicKey: user.publicRSAKey };
    return await this.encryptionProvider.importRsaKeys(rsaKeyJsonPair);
  }

  getHttpClientConfig(): AxiosRequestConfig {
    return this.currentUser
      ? {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          headers: { Authorization: `Bearer ${this.currentUser.accessToken}` },
        }
      : {};
  }
}
