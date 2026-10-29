export function shouldShowAirRoute({ alwaysShow = false, previewHasFlyer = false, selectedAntiAir = false, activeFlyer = false, supported = true } = {}) {
  return Boolean(supported && (alwaysShow || previewHasFlyer || selectedAntiAir || activeFlyer));
}
