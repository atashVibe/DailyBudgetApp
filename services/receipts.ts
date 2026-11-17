import * as Crypto from "expo-crypto";
import { Alert, Platform } from "react-native";
import { auth } from "./auth";

const endpoint = process.env.EXPO_PUBLIC_RECEIPTS_API_URL?.replace(/\/$/, "");
export const receiptsConfigured = Boolean(endpoint);
export type Receipt = {
  receiptId: string;
  uploadRequestId?: string;
  userId: string | null;
  familyId: string;
  transactionId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: number;
  updatedAt: number;
  status: "ready" | "deleting";
  transactionDate?: string;
};
export type ReceiptAccess = {
  administrator: boolean;
  administratorFamily: boolean;
  familyId: string;
  familyName: string;
  plan: string;
  tier: string;
  canUpload: boolean;
  canRead: boolean;
  canReplace: boolean;
  canDelete: boolean;
  deletionScheduledAt: number | null;
  limits: {
    maxFileBytes: number;
    maxReceiptsPerTransaction: number;
    maxStorageBytes: number;
  };
  usage: { liveBytes: number; reservedBytes: number; receiptCount: number };
};
export type ReceiptFile = {
  name: string;
  mimeType: string;
  bytes: Blob;
  size: number;
  requestId: string;
};

async function token() {
  if (!endpoint)
    throw new Error(
      "Receipt storage is not set up yet. Your budget entries are available as usual.",
    );
  if (!auth.currentUser) throw new Error("Please sign in to use receipts.");
  return auth.currentUser.getIdToken();
}
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${await token()}` },
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw Object.assign(
      new Error(
        details.message || "Receipt storage is unavailable. Please try again.",
      ),
      { status: response.status },
    );
  }
  return response;
}
export const getReceiptAccess = async (): Promise<ReceiptAccess> =>
  (await request("/access")).json();
export const listReceipts = async (
  transactionId?: string,
): Promise<Receipt[]> =>
  (
    await request(
      `/receipts${transactionId ? `?transactionId=${encodeURIComponent(transactionId)}` : ""}`,
    )
  ).json();
export const deleteReceipt = async (id: string) =>
  (
    await request(`/receipts/${encodeURIComponent(id)}`, { method: "DELETE" })
  ).json();
export const getReceiptAdminStats = async () =>
  (await request("/admin")).json();
export const updateReceiptAccess = async (targetId: string, action: string) =>
  (
    await request("/admin/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [action.endsWith("admin") ? "userId" : "familyId"]: targetId,
        action,
      }),
    })
  ).json();

export async function deleteAccountReceipts() {
  // Existing accounts without a configured receipt deployment remain usable.
  if (receiptsConfigured)
    await request("/delete-account-receipts", { method: "POST" });
}

function inferredMime(name: string) {
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.pdf$/i.test(name)) return "application/pdf";
  return "application/octet-stream";
}
export async function pickReceipt(
  kind: "camera" | "photo" | "pdf" | "attachment",
): Promise<ReceiptFile | null> {
  if (Platform.OS === "web") {
    const file = await new Promise<File | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept =
        kind === "attachment"
          ? "image/jpeg,image/png,application/pdf"
          : kind === "pdf"
            ? "application/pdf"
            : "image/jpeg,image/png";
      if (kind === "camera") input.setAttribute("capture", "environment");
      input.addEventListener(
        "change",
        () => resolve(input.files?.[0] || null),
        { once: true },
      );
      input.addEventListener("cancel", () => resolve(null), { once: true });
      input.click();
    });
    if (!file) return null;
    return {
      name: file.name,
      mimeType: file.type || inferredMime(file.name),
      bytes: file,
      size: file.size,
      requestId: Crypto.randomUUID(),
    };
  }
  if (kind === "attachment") {
    const source = await new Promise<"camera" | "files" | null>((resolve) => {
      Alert.alert(
        "Attach receipt",
        "Choose a source",
        [
          { text: "Camera", onPress: () => resolve("camera") },
          { text: "Photos or PDF", onPress: () => resolve("files") },
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        ],
        { cancelable: true, onDismiss: () => resolve(null) },
      );
    });
    if (!source) return null;
    if (source === "camera") return pickReceipt("camera");
  }
  if (kind === "camera") {
    const camera = await import("expo-image-picker");
    if (!(await camera.requestCameraPermissionsAsync()).granted)
      throw new Error("Camera permission is needed to photograph a receipt.");
    const result = await camera.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
      base64: false,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    const bytes = await (await fetch(asset.uri)).blob();
    const name = asset.fileName || `receipt-${Date.now()}.jpg`;
    return {
      name,
      mimeType: asset.mimeType || inferredMime(name),
      bytes,
      size: bytes.size,
      requestId: Crypto.randomUUID(),
    };
  }
  const picker = await import("expo-document-picker");
  const result = await picker.getDocumentAsync({
    type:
      kind === "attachment"
        ? ["image/jpeg", "image/png", "application/pdf"]
        : kind === "pdf"
          ? "application/pdf"
          : ["image/jpeg", "image/png"],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const bytes = await (await fetch(asset.uri)).blob();
  return {
    name: asset.name,
    mimeType: asset.mimeType || inferredMime(asset.name),
    bytes,
    size: bytes.size,
    requestId: Crypto.randomUUID(),
  };
}

export async function uploadReceipt(
  file: ReceiptFile,
  transactionId: string,
  progress: (percent: number) => void,
  replaceId?: string,
): Promise<Receipt> {
  const bearer = await token();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${endpoint}/upload`);
    xhr.timeout = 180000;
    xhr.setRequestHeader("Authorization", `Bearer ${bearer}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-Receipt-Mime", file.mimeType);
    xhr.setRequestHeader("X-Receipt-Filename", encodeURIComponent(file.name));
    xhr.setRequestHeader("X-Receipt-Transaction", transactionId);
    xhr.setRequestHeader("X-Receipt-Request", file.requestId);
    if (replaceId) xhr.setRequestHeader("X-Receipt-Replace", replaceId);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let response;
      try {
        response = JSON.parse(xhr.responseText);
      } catch {
        response = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(response);
      else
        reject(
          new Error(
            response.message ||
              "Upload failed. Your expense is saved; you can retry the receipt.",
          ),
        );
    };
    xhr.onerror =
      xhr.ontimeout =
      xhr.onabort =
        () =>
          reject(
            new Error(
              "Upload interrupted. Reload your receipts to check whether it completed, or retry the same file.",
            ),
          );
    xhr.send(file.bytes);
  });
}

async function saveOriginal(
  bytes: Blob,
  filename: string,
  mime: string,
  view: boolean,
  openedWindow?: Window | null,
) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(bytes);
    if (view && openedWindow) openedWindow.location.href = url;
    else {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60000);
    return;
  }
  const { File, Paths } = await import("expo-file-system");
  const sharing = await import("expo-sharing");
  if (!(await sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  const safeName = filename.replace(/[\\/\u0000-\u001f]/g, "_");
  const file = new File(Paths.cache, `${Crypto.randomUUID()}-${safeName}`);
  file.write(new Uint8Array(await bytes.arrayBuffer()));
  await sharing.shareAsync(file.uri, {
    mimeType: mime,
    dialogTitle: view ? "View original receipt" : "Save original receipt",
  });
}
export async function openReceipt(receipt: Receipt, view = false) {
  // Open synchronously on a user tap to avoid popup blockers, then fill it only
  // after an authenticated download. There is never a bearer token in the URL.
  const windowRef =
    Platform.OS === "web" && view ? window.open("about:blank", "_blank") : null;
  if (windowRef) windowRef.opener = null;
  try {
    const response = await request(
      `/file/${encodeURIComponent(receipt.receiptId)}`,
    );
    await saveOriginal(
      await response.blob(),
      receipt.originalFilename,
      receipt.mimeType,
      view,
      windowRef,
    );
  } catch (error) {
    windowRef?.close();
    throw error;
  }
}
export async function exportAllReceipts() {
  const response = await request("/export");
  await saveOriginal(
    await response.blob(),
    "dailybudget-receipts.zip",
    "application/zip",
    false,
  );
}

export async function startReceiptEntryDraft(
  familyId: string,
  draftId: string,
): Promise<{ draftId: string; committed?: boolean }> {
  return (
    await request("/entry-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId, draftId }),
    })
  ).json();
}
export async function commitReceiptEntryDraft(
  draftId: string,
  entry: {
    amount: number;
    categoryId: string;
    budgetAreaId: string;
    note: string;
    date: string;
  },
): Promise<{ entryId: string }> {
  return (
    await request("/entry-drafts/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId, entry }),
    })
  ).json();
}
export const newReceiptEntryId = () => Crypto.randomUUID();

export async function saveCategoryReceiptRequirement(data: {
  familyId: string;
  categoryId: string;
  required: boolean;
  create?: { name: string; type: string; budgetAreaId: string };
}) {
  return (
    await request("/categories/receipt-requirement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  ).json();
}
