import multer from 'multer';
import type { RequestHandler } from 'express';

// 使用内存存储，稍后通过服务层保存到文件系统
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB限制（支持大型FBX文件）
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      // 3D模型格式
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream', // GLB, FBX等
      'application/x-tgif',

      // 图片格式
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',

      // JSON材质文件
      'application/json'
    ];

    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['glb', 'gltf', 'fbx', 'obj', 'png', 'jpg', 'jpeg', 'webp', 'json'];

    // 同时检查MIME类型和扩展名
    if (
      allowedMimeTypes.includes(file.mimetype) ||
      (fileExt && allowedExtensions.includes(fileExt))
    ) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype} (${file.originalname})`));
    }
  }
});

// 单文件上传
export const uploadSingle: RequestHandler = upload.single('file');

// 多文件上传（最多10个）
export const uploadMultiple: RequestHandler = upload.array('files', 10);
