import { useSceneStore } from '../../../stores/sceneStore';
import { useEditorStore } from '../../../stores/editorStore';
import { SceneFormatConverter } from './SceneFormatConverter';
import { ExternalSceneFile } from '../types';

export interface LoadResult {
  success: boolean;
  errorCount: number;
  errors: Array<{ objectName: string; error: string }>;
}

/**
 * 场景加载器服务
 * 负责读取、解析和加载场景文件
 */
export class SceneLoader {
  private converter = new SceneFormatConverter();

  /**
   * 加载场景文件
   */
  async loadSceneFile(file: File): Promise<LoadResult> {
    const { setImportProgress, addImportError, clearImportState, loadScene } =
      useSceneStore.getState();
    const { clearSelection } = useEditorStore.getState();

    try {
      // 清空之前的导入状态
      clearImportState();

      // 阶段1: 文件解析 (0-10%)
      setImportProgress({
        isImporting: true,
        percentage: 0,
        currentTask: '正在读取场景文件...',
      });

      const content = await this.readFile(file);

      setImportProgress({
        percentage: 5,
        currentTask: '正在解析场景数据...',
      });

      const externalScene = this.parseSceneFile(content);

      setImportProgress({
        percentage: 10,
        currentTask: '场景解析完成',
      });

      // 阶段2: 格式转换 (10-20%)
      setImportProgress({
        percentage: 10,
        currentTask: '正在转换场景格式...',
      });

      const internalScene = this.converter.convert(externalScene);

      setImportProgress({
        percentage: 20,
        currentTask: '格式转换完成',
      });

      // 阶段3: 场景加载 (20-30%)
      setImportProgress({
        percentage: 20,
        currentTask: '正在加载场景结构...',
      });

      // 清空当前选择
      clearSelection();

      // 加载场景到store
      loadScene(internalScene);

      setImportProgress({
        percentage: 30,
        currentTask: '场景结构加载完成',
      });

      // 阶段4: 应用配置 (30-40%)
      setImportProgress({
        percentage: 30,
        currentTask: '正在应用场景配置...',
      });

      // 应用相机配置(如果有)
      if (externalScene.camera) {
        this.applyCameraConfig(externalScene.camera);
      }

      setImportProgress({
        percentage: 40,
        currentTask: '配置应用完成',
      });

      // 阶段5: 完成 (40-100%)
      // 注: 3D模型的异步加载将在Task 5中实现,这里先跳到100%
      setImportProgress({
        percentage: 100,
        currentTask: '场景导入完成',
      });

      // 延迟500ms后清空进度对话框
      setTimeout(() => {
        setImportProgress({ isImporting: false });
      }, 500);

      const errors = useSceneStore.getState().importErrors;

      return {
        success: true,
        errorCount: errors.length,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '未知错误';

      addImportError({
        objectName: 'Scene',
        error: errorMessage,
      });

      setImportProgress({
        isImporting: false,
        percentage: 0,
        currentTask: '',
      });

      return {
        success: false,
        errorCount: 1,
        errors: [{ objectName: 'Scene', error: errorMessage }],
      };
    }
  }

  /**
   * 读取文件内容
   */
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          resolve(content);
        } else {
          reject(new Error('文件内容为空'));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * 解析场景JSON文件
   */
  private parseSceneFile(content: string): ExternalSceneFile {
    try {
      const parsed = JSON.parse(content);

      // 基本验证
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('无效的场景文件格式');
      }

      return parsed as ExternalSceneFile;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('JSON解析失败: 文件格式不正确');
      }
      throw error;
    }
  }

  /**
   * 应用相机配置
   */
  private applyCameraConfig(cameraConfig: ExternalSceneFile['camera']) {
    if (!cameraConfig) return;

    const { setCamera } = useEditorStore.getState();

    if (cameraConfig.position) {
      setCamera({
        position: cameraConfig.position,
        target: cameraConfig.target || [0, 0, 0],
      });
    }
  }
}
