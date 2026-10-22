export function runSaveFailureMessage(result) {
  if (result.reason === 'backup-write-failed') {
    return 'Current changes were not saved because the recovery backup could not be updated. Your previous run is preserved.';
  }
  if (result.reason === 'future-backup') {
    return 'Current changes were not saved because a newer recovery backup was preserved. Your current saved run is still available.';
  }
  if (result.reason === 'read-failed') {
    return 'Storage could not be read, so this garden was not saved. Your garden remains playable; saved-run availability could not be checked.';
  }
  if (result.reason === 'invalid-next') {
    return 'This garden failed save validation, so no save was written. Existing save files were left untouched.';
  }
  if (result.reason === 'future-next') {
    return 'This save uses a newer game version and was not written.';
  }
  if (result.reason === 'primary-write-failed' && result.preservedPrimary) {
    return 'This update could not be saved. Your previous saved garden is still available.';
  }
  return 'This update could not be saved. Check Resume for any earlier saved garden.';
}
