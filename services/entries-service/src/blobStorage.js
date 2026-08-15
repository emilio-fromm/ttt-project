import { BlobServiceClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "UseDevelopmentStorage=true";
const containerName = process.env.AZURE_STORAGE_CONTAINER || "entry-images";

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// In docker-compose, entries-service reaches Azurite via the internal Docker network
// hostname "azurite" (see AZURE_STORAGE_CONNECTION_STRING), so that's the host baked into
// every URL the SDK generates. That's fine server-to-server, but the browser rendering a
// post-it's <img> can't resolve "azurite" at all -- it just gets a broken image with no
// visible error. AZURE_STORAGE_PUBLIC_HOST swaps the host/port back to one the browser can
// actually reach (e.g. "localhost:10000", since docker-compose also publishes that port to
// the host). Leave it unset in production, where AZURE_STORAGE_CONNECTION_STRING points at
// a real, already publicly-reachable Azure Storage account.
const publicHost = process.env.AZURE_STORAGE_PUBLIC_HOST;

function toPublicUrl(internalUrl) {
  if (!publicHost) return internalUrl;
  const url = new URL(internalUrl);
  const [hostname, port] = publicHost.split(":");
  url.hostname = hostname;
  url.port = port || "";
  return url.toString();
}

// `access: "blob"` makes each uploaded image readable via its plain URL (no SAS token),
// which is what PostIt.jsx relies on for a plain <img src>. Against a *real* Azure Storage
// account (Azurite doesn't care), this fails with "Public access is not permitted on this
// storage account" unless "Allow Blob public access" is turned on for the account first
// (Azure Portal -> Storage Account -> Configuration) -- new accounts default that to off.
let ensured = false;
async function ensureContainer() {
  if (ensured) return;
  await containerClient.createIfNotExists({ access: "blob" });
  ensured = true;
}

// Uploads a buffer, returns its public URL. The Azure Function (thumbnail-generator)
// listens on this same container for new blobs and writes back a `thumb-<name>` blob.
export async function uploadImage(buffer, originalName, mimeType) {
  await ensureContainer();
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "jpg";
  const blobName = `${uuidv4()}.${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  });
  return {
    imageUrl: toPublicUrl(blockBlobClient.url),
    blobName,
  };
}

export function guessThumbnailUrl(blobName) {
  const thumbBlobClient = containerClient.getBlockBlobClient(`thumb-${blobName}`);
  return toPublicUrl(thumbBlobClient.url);
}
