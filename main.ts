import * as bb64 from "https://deno.land/x/bb64@1.1.0/mod.ts";
import * as sha1 from "https://deno.land/x/sha1@v1.0.3/mod.ts";
import * as encodeurl from "https://deno.land/x/encodeurl@1.0.0/mod.ts";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error("Missing required environment variable %o", name);
    Deno.exit(1);
  }
  return value;
}

const keyId = requireEnv("B2_KEY_ID");
const key = requireEnv("B2_KEY");

const pgHost = requireEnv("PG_HOST");
const pgDb = requireEnv("PG_DATABASE");
const pgUser = requireEnv("PG_USER");
const pgPass = requireEnv("PG_PASSWORD");

console.log("Dumping data from database...");

const dump = Deno.run({
  cmd: ["pg_dump", "-h", pgHost, "-U", pgUser, "-d", pgDb],
  env: { PGPASSWORD: pgPass },
  stdout: "piped",
});

const dumpOutput = new TextDecoder().decode(await dump.output());
await dump.status();

type AuthorizedAccount = {
  bucketId: string;
  bucketName: string;
  namePrefix: string;
  apiUrl: string;
  authorizationToken: string;
};

type ReadyAccount = AuthorizedAccount & {
  uploadUrl: string;
  uploadAuthorizationToken: string;
};

async function authorize(): Promise<AuthorizedAccount> {
  const authorizeAccountResponse = await fetch(
    `https://api.backblazeb2.com/b2api/v2/b2_authorize_account`,
    {
      headers: {
        Authorization: `Basic ${bb64.Base64.fromString(
          `${keyId}:${key}`
        ).toString()}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );

  const authorizeAccountResponseValue = await authorizeAccountResponse.json();

  const bucketId = authorizeAccountResponseValue.allowed.bucketId;
  const bucketName = authorizeAccountResponseValue.allowed.bucketName;
  const namePrefix = authorizeAccountResponseValue.allowed.namePrefix;
  const apiUrl = authorizeAccountResponseValue.apiUrl;
  const authorizationToken = authorizeAccountResponseValue.authorizationToken;

  return { bucketId, bucketName, namePrefix, apiUrl, authorizationToken };
}

async function prepareAccountForUpload(
  account: AuthorizedAccount
): Promise<ReadyAccount> {
  const content = JSON.stringify({ bucketId: account.bucketId });
  const contentLength = content.length;

  const response = await fetch(`${account.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: account.authorizationToken,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": `${contentLength}`,
    },
    body: content,
  });

  const result = await response.json();

  return {
    ...account,
    uploadUrl: result.uploadUrl,
    uploadAuthorizationToken: result.authorizationToken,
  };
}

async function upload(
  account: ReadyAccount,
  file: { content: string; name: string; type: string }
): Promise<void> {
  const content = new TextEncoder().encode(dumpOutput);
  const contentLength = content.length;
  const contentSha1 = sha1.sha1(content, undefined, "hex");

  const response = await fetch(account.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: account.uploadAuthorizationToken,
      "X-Bz-File-Name": encodeurl.encodeUrl(
        `${account.namePrefix}${file.name}`
      ),
      "Content-Type": file.type,
      "Content-Length": `${contentLength}`,
      "X-Bz-Content-Sha1": contentSha1.toString(),
    },
    body: content,
  });

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

console.log("Connecting to B2...");

const account = await prepareAccountForUpload(await authorize());

console.log("Uploading data...");

const filename = new Date().toJSON().replace(":", "-").replace(".", "-");

upload(account, {
  content: dumpOutput,
  name: `${pgDb}-${filename}.sql`,
  type: "text/plain",
});

console.log("Done!");
