import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export class FileStorage {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
  }

  /**
   * 保存上传的文件
   * @param projectId 项目ID
   * @param type 文件类型 (models, materials, textures)
   * @param file 上传的文件对象
   * @returns 相对文件路径
   */
  async saveFile(
    projectId: number,
    type: 'models' | 'materials' | 'textures',
    filename: string,
    buffer: Buffer
  ): Promise<string> {
    const projectDir = path.join(this.uploadsDir, 'projects', String(projectId), type);
    await this.ensureDir(projectDir);

    const filePath = path.join(projectDir, filename);
    await fs.writeFile(filePath, buffer);

    // 返回相对路径
    return path.join('projects', String(projectId), type, filename);
  }

  /**
   * 读取文件
   * @param relativePath 相对路径
   * @returns 文件内容
   */
  async readFile(relativePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(relativePath);

    // 安全检查：确保路径在uploads目录内
    if (!this.isPathSafe(fullPath)) {
      throw new Error('Invalid file path');
    }

    if (!existsSync(fullPath)) {
      throw new Error('File not found');
    }

    return fs.readFile(fullPath);
  }

  /**
   * 删除文件
   * @param relativePath 相对路径
   */
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);

    // 安全检查
    if (!this.isPathSafe(fullPath)) {
      throw new Error('Invalid file path');
    }

    if (existsSync(fullPath)) {
      await fs.unlink(fullPath);
    }
  }

  /**
   * 确保目录存在
   * @param dirPath 目录路径
   */
  async ensureDir(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 获取完整路径
   * @param relativePath 相对路径
   * @returns 完整路径
   */
  getFullPath(relativePath: string): string {
    return path.join(this.uploadsDir, relativePath);
  }

  /**
   * 检查路径是否安全（防止路径遍历攻击）
   * @param fullPath 完整路径
   * @returns 是否安全
   */
  private isPathSafe(fullPath: string): boolean {
    const normalizedPath = path.normalize(fullPath);
    const normalizedUploadsDir = path.normalize(this.uploadsDir);
    return normalizedPath.startsWith(normalizedUploadsDir);
  }

  /**
   * 保存缩略图
   * @param assetId 资产ID
   * @param buffer 图片buffer
   * @returns 相对路径
   */
  async saveThumbnail(assetId: number, buffer: Buffer): Promise<string> {
    const thumbnailDir = path.join(this.uploadsDir, 'thumbnails');
    await this.ensureDir(thumbnailDir);

    const filename = `asset_${assetId}.jpg`;
    const filePath = path.join(thumbnailDir, filename);
    await fs.writeFile(filePath, buffer);

    return path.join('thumbnails', filename);
  }

  /**
   * 获取文件大小
   * @param relativePath 相对路径
   * @returns 文件大小（字节）
   */
  async getFileSize(relativePath: string): Promise<number> {
    const fullPath = this.getFullPath(relativePath);

    if (!this.isPathSafe(fullPath)) {
      throw new Error('Invalid file path');
    }

    const stats = await fs.stat(fullPath);
    return stats.size;
  }

  /**
   * 检查文件是否存在
   * @param relativePath 相对路径
   * @returns 是否存在
   */
  fileExists(relativePath: string): boolean {
    const fullPath = this.getFullPath(relativePath);
    if (!this.isPathSafe(fullPath)) {
      return false;
    }
    return existsSync(fullPath);
  }

  /**
   * 生成唯一文件名
   * @param originalName 原始文件名
   * @returns 唯一文件名
   */
  generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    return `${nameWithoutExt}-${timestamp}-${random}${ext}`;
  }
}

// 导出单例
export const fileStorage = new FileStorage();
