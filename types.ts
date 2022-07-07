export type PostgresCredentials = {
  host: string;
  user: string;
  database: string;
  password: string;
};

export type Config = {
  backblaze: { keyId: string; key: string };
  postgres: PostgresCredentials;
};

export type AuthorizedAccount = {
  bucketId: string;
  bucketName: string;
  namePrefix: string;
  apiUrl: string;
  authorizationToken: string;
};

export type ReadyAccount = AuthorizedAccount & {
  uploadUrl: string;
  uploadAuthorizationToken: string;
};

