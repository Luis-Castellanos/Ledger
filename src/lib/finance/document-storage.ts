export function canCreateDocumentMetadataOnly() {
  return process.env.NODE_ENV !== "production" || process.env.DOCUMENT_STORAGE_MODE === "metadata-only";
}

export function documentStorageUnavailableResponse() {
  return {
    error: "Document upload storage is not configured.",
    message: "Uploads are disabled until production object storage is configured.",
  };
}
