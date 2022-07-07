import * as b2 from "./backblaze.ts";
import {
  PostgresCredentials,
  Config,
  AuthorizedAccount,
  ReadyAccount,
} from "./types.ts";

function configFromEnvironment(): Config {
  function requireEnv(name: string): string {
    const value = Deno.env.get(name);
    if (!value) {
      console.error("Missing required environment variable %o", name);
      Deno.exit(1);
    }
    return value;
  }

  return {
    backblaze: {
      keyId: requireEnv("B2_KEY_ID"),
      key: requireEnv("B2_KEY"),
    },
    postgres: {
      host: requireEnv("PG_HOST"),
      database: requireEnv("PG_DATABASE"),
      user: requireEnv("PG_USER"),
      password: requireEnv("PG_PASSWORD"),
    },
  };
}

async function dump(postgres: PostgresCredentials): Promise<string> {
  const dump = Deno.run({
    cmd: [
      "pg_dump",
      "-h",
      postgres.host,
      "-U",
      postgres.user,
      "-d",
      postgres.database,
    ],
    env: { PGPASSWORD: postgres.password },
    stdout: "piped",
  });

  const dumpOutput = new TextDecoder().decode(await dump.output());
  await dump.status();

  return dumpOutput;
}

async function authorize(config: Config): Promise<AuthorizedAccount> {
  const response = await fetch(b2.authorizeRequest(config));
  const result = b2.authorizeResult(await response.json());
  if (!result) throw "unable to authorize";
  return result;
}

async function prepareAccountForUpload(
  account: AuthorizedAccount
): Promise<ReadyAccount> {
  const response = await fetch(b2.prepareUploadRequest(account));
  const result = b2.prepareUploadResult(account, await response.json());
  if (!result) throw "unable to prepare upload";
  return result;
}

async function upload(
  account: ReadyAccount,
  file: { content: string; name: string; type: string }
): Promise<void> {
  const response = await fetch(b2.uploadRequest(account, file));

  if (response.status !== 200) {
    const text = await response.text();
    console.error(text);
    throw {
      error: "Error while uploading file",
      response,
      body: text,
    };
  }

  const result = await response.json();

  if (result.action !== "upload") {
    throw { error: "Unable to upload file", result };
  }
}

async function main() {
  console.log("Reading configuration...");
  const config = configFromEnvironment();

  console.log("Dumping data from database...");
  const dumpOutput = await dump(config.postgres);

  console.log("Connecting to B2...");
  const account = await prepareAccountForUpload(await authorize(config));

  console.log("Uploading data...");
  await upload(account, b2.dumpFile(config, new Date(), dumpOutput));

  console.log("Done!");
}

main();
