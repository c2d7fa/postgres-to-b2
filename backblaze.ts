import * as bb64 from "https://deno.land/x/bb64@1.1.0/mod.ts";
import * as sha1 from "https://deno.land/x/sha1@v1.0.3/mod.ts";
import * as encodeurl from "https://deno.land/x/encodeurl@1.0.0/mod.ts";

import { Config, AuthorizedAccount, ReadyAccount } from "./types.ts";

export function authorizeRequest(config: Config): Request {
  return new Request(
    `https://api.backblazeb2.com/b2api/v2/b2_authorize_account`,
    {
      headers: {
        Authorization: `Basic ${bb64.Base64.fromString(
          `${config.backblaze.keyId}:${config.backblaze.key}`
        ).toString()}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
}

export function authorizeResult(json: unknown): AuthorizedAccount | null {
  if (typeof json !== "object" || json === null) return null;

  const data = json as any;

  try {
    const bucketId = data.allowed.bucketId;
    const bucketName = data.allowed.bucketName;
    const namePrefix = data.allowed.namePrefix;
    const apiUrl = data.apiUrl;
    const authorizationToken = data.authorizationToken;

    return { bucketId, bucketName, namePrefix, apiUrl, authorizationToken };
  } catch (_) {
    return null;
  }
}

export function prepareUploadRequest(account: AuthorizedAccount): Request {
  const content = JSON.stringify({ bucketId: account.bucketId });
  const contentLength = content.length;

  return new Request(`${account.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: "POST",
    headers: {
      Authorization: account.authorizationToken,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": `${contentLength}`,
    },
    body: content,
  });
}

export function prepareUploadResult(
  account: AuthorizedAccount,
  json: unknown
): ReadyAccount | null {
  if (typeof json !== "object" || json === null) return null;

  const data = json as any;

  try {
    return {
      ...account,
      uploadUrl: data.uploadUrl,
      uploadAuthorizationToken: data.authorizationToken,
    };
  } catch (_) {
    return null;
  }
}

export function uploadRequest(
  account: ReadyAccount,
  file: { content: string; name: string; type: string }
) {
  const content = new TextEncoder().encode(file.content);
  const contentLength = content.length;
  const contentSha1 = sha1.sha1(content, undefined, "hex");

  return new Request(account.uploadUrl, {
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
}

export function dumpFile(
  config: Config,
  now: Date,
  dump: string
): { content: string; type: string; name: string } {
  const filename = now.toJSON().replaceAll(":", "-").replace(".", "-");
  return {
    content: dump,
    name: `${config.postgres.database}-${filename}.sql`,
    type: "text/plain",
  };
}

export function listRequest(config: Config, account: AuthorizedAccount) {
  return new Request(`${account.apiUrl}/b2api/v2/b2_list_file_names`, {
    method: "POST",
    headers: {
      Authorization: account.authorizationToken,
    },
    body: JSON.stringify({
      bucketId: account.bucketId,
      prefix: `${account.namePrefix}${config.postgres.database}`,
    }),
  });
}

export function listResult(json: unknown) {
  if (typeof json !== "object" || json === null) return null;

  const data = json as any;

  try {
    return data.files.map((file) => ({ name: file.fileName, id: file.fileId }));
  } catch (_) {
    return null;
  }
}

export function removeRequest(config: Config, account: AuthorizedAccount, file: {name: string, id: string}) {
  return new Request(`${account.apiUrl}/b2api/v2/b2_delete_file_version`, {
    method: "POST",
    headers: {
    Authorization: account.authorizationToken,},
    body: JSON.stringify({
      fileId: file.id,
      fileName: file.name,
    }),
  });
}
