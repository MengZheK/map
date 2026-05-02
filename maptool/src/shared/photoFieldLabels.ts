/**
 * photos.json 单条 Photo 字段说明（用于界面标注）
 */
export const PHOTO_JSON_FIELD_HELP: Record<string, string> = {
  id: "保存时按 p0001 规则自动生成",
  src: "图片地址（COS URL），必填",
  categoryId: "对应栏目分类 id",
  description: "照片说明",
  lon: "经度 WGS84",
  lat: "纬度 WGS84",
  locationName: "地点名称",
  altitudeM: "海拔（米）",
  cameraMake: "相机厂商",
  cameraModel: "相机型号",
  focalLengthMm: "焦距（毫米）",
  aperture: "光圈 F 值",
  shutterTime: "快门展示文案，如 1/250s",
  iso: "ISO 感光度",
  lensModel: "镜头型号",
  takenYear: "拍摄年份（数字）",
  takenAt: "拍摄日期 YYYY-MM-DD",
  shutterSec: "快门秒数（数值，可与 shutterTime 并存）",
};
