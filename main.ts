import * as bb64 from "https://deno.land/x/bb64@1.1.0/mod.ts";
import * as sha1 from "https://deno.land/x/sha1@v1.0.3/mod.ts";
import * as encodeurl from "https://deno.land/x/encodeurl@1.0.0/mod.ts";

const keyId = Deno.env.get("B2_KEY_ID");
const key = Deno.env.get("B2_KEY");

for (const env of [keyId, key]) {
  if (typeof env !== "string") {
    console.error("Must specify B2_KEY_ID and B2_KEY!");
    Deno.exit(1);
  }
}

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

async function authorize(args: {
  keyId: string;
  key: string;
}): Promise<AuthorizedAccount> {
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
): Promise<ReadyAcocunt> {
  const content = JSON.stringify({ bucketId: account.bucketId });
  const contentLength = content.length;

  const response = await fetch(`${account.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: account.authorizationToken,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": contentLength,
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
  const contentLength = file.content.length;
  const contentSha1 = sha1.sha1(file.content, "utf8", "hex");

  const response = await fetch(account.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: account.uploadAuthorizationToken,
      "X-Bz-File-Name": encodeurl.encodeUrl(
        `${account.namePrefix}${file.name}`
      ),
      "Content-Type": file.type,
      "Content-Length": contentLength,
      "X-Bz-Content-Sha1": contentSha1,
    },
    body: file.content,
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

const account = await prepareAccountForUpload(await authorize({ key, keyId }));
upload(account, {
  content: "hello this is a test",
  name: "test1.txt",
  type: "text/plain",
});
