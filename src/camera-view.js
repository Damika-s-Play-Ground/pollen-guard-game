export const CAMERA_MIN_ZOOM=1;
export const CAMERA_MAX_ZOOM=2.5;
export const CAMERA_ZOOM_STEP=.25;

export function createCameraView(){return {zoom:1,panX:0,panY:0,panMode:false};}

export function normalizeCameraView(view,width,height){
  const zoom=Math.max(CAMERA_MIN_ZOOM,Math.min(CAMERA_MAX_ZOOM,Number.isFinite(view?.zoom)?view.zoom:CAMERA_MIN_ZOOM));
  const maxPanX=(zoom-1)*Math.max(0,width)/2,maxPanY=(zoom-1)*Math.max(0,height)/2;
  return {zoom,panX:Math.max(-maxPanX,Math.min(maxPanX,Number.isFinite(view?.panX)?view.panX:0)),panY:Math.max(-maxPanY,Math.min(maxPanY,Number.isFinite(view?.panY)?view.panY:0)),panMode:Boolean(view?.panMode)};
}

export function zoomCameraView(view,direction,width,height){
  return normalizeCameraView({...view,zoom:view.zoom+Math.sign(direction)*CAMERA_ZOOM_STEP},width,height);
}

export function panCameraView(view,deltaX,deltaY,width,height){
  return normalizeCameraView({...view,panX:view.panX+deltaX,panY:view.panY+deltaY},width,height);
}

export function toggleCameraPan(view,enabled=!view.panMode){return {...view,panMode:Boolean(enabled)};}

export function resetCameraView(){return createCameraView();}

export function cameraTransform(view){return `translate3d(${view.panX}px,${view.panY}px,0) scale(${view.zoom})`;}
