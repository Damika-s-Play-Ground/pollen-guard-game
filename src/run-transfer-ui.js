export const MAX_RUN_IMPORT_BYTES = 5 * 1024 * 1024;

const IMPORT_FAILURE_COPY = Object.freeze({
  'invalid-json': 'This file is not valid JSON.',
  'invalid-format': 'This is not a Pollen Guard run export.',
  'invalid-format-version': 'The export version is invalid.',
  'future-format': 'This export was made by a newer game version.',
  'missing-run': 'This export does not contain a run.',
  'future-run': 'This run uses a newer game version.',
  'invalid-run': 'The run data failed validation and was not imported.'
});

export function runImportFailureMessage(reason) {
  return IMPORT_FAILURE_COPY[reason] || 'The selected run could not be imported.';
}

export function runImportWriteFailureMessage(result) {
  if (result.reason === 'future-primary' || result.reason === 'future-backup') {
    return 'A newer saved version was preserved; this import did not replace it.';
  }
  if (result.reason === 'backup-write-failed') {
    return 'Import was not saved because the recovery backup could not be updated. Your previous run is preserved.';
  }
  if (result.reason === 'read-failed') {
    return 'Storage could not be read, so the import was not saved. Saved-run availability could not be checked.';
  }
  if (result.reason === 'invalid-next') {
    return 'The imported garden failed save validation. Existing save files were left untouched.';
  }
  if (result.reason === 'future-next') {
    return 'This import uses a newer game version and was not saved.';
  }
  if (result.reason === 'primary-write-failed' && result.preservedPrimary) {
    return 'The import could not be saved. Your previous saved garden is still available.';
  }
  return 'The import could not be saved. Check Resume for any earlier saved garden.';
}

export function renderRunTransferStatus(element, message) {
  element.textContent = message;
}

export function bindRunTransferControls({ exportButton, importButton, fileInput, onExport, onImport }) {
  exportButton.onclick = onExport;
  importButton.onclick = () => fileInput.click();
  fileInput.onchange = async event => {
    try { await onImport(event.target.files?.[0]); }
    finally { event.target.value = ''; }
  };
}
