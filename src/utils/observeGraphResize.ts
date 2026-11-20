import type { Graph } from '@antv/g6';

/** 同步容器与画布尺寸，保留当前缩放和平移。 */
export const observeGraphResize = (graph: Graph) => {
  const container = graph.getContainer();
  const canvasElement: unknown = graph.get('canvas').get('el');
  const canvas =
    canvasElement instanceof HTMLCanvasElement ? canvasElement : undefined;
  const context = canvas?.getContext('2d');
  const snapshot = context ? document.createElement('canvas') : undefined;
  const snapshotContext = snapshot?.getContext('2d');
  let frameId: number | undefined;

  const updateSize = () => {
    frameId = undefined;
    if (graph.destroyed || !container.isConnected) return;

    const { clientWidth: width, clientHeight: height } = container;
    if (
      width <= 0 ||
      height <= 0 ||
      (width === graph.getWidth() && height === graph.getHeight())
    ) {
      return;
    }

    if (
      !canvas ||
      !context ||
      !snapshot ||
      !snapshotContext ||
      canvas.width <= 0 ||
      canvas.height <= 0
    ) {
      graph.changeSize(width, height);
      return;
    }

    // G6 下一帧才重绘；先保存旧画面，避免调整 Canvas 尺寸后出现空白帧。
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshotContext.drawImage(canvas, 0, 0);

    graph.changeSize(width, height);

    // 按实际像素恢复，避免设备像素比导致画面被重复缩放。
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(snapshot, 0, 0);
    context.restore();
  };

  const observer = new ResizeObserver(() => {
    if (frameId === undefined) {
      frameId = window.requestAnimationFrame(updateSize);
    }
  });
  observer.observe(container);
  updateSize();

  return () => {
    observer.disconnect();
    if (frameId !== undefined) {
      window.cancelAnimationFrame(frameId);
    }
    if (snapshot) {
      snapshot.width = 0;
      snapshot.height = 0;
    }
  };
};
