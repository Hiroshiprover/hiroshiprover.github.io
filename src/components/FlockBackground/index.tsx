import {useEffect, useRef, type RefObject} from 'react';
import {CAMERA_DISTANCE, FlockSimulation, type Predator} from './simulation';
import {KESTREL_COUNT, KestrelSimulation} from './kestrels';

// 数量按画布面积自适应；增大上限/密度会增加模拟和绘制开销。
const MAX_PARTICLES = 2100; // 最大鸟数，同时决定预分配数组的容量。
const MIN_PARTICLES = 700; // 小屏最少鸟数。
const PARTICLE_DENSITY = 1.5 / 1100; // 每平方 CSS 像素对应的鸟数。
const STEP = 1 / 60; // 每秒最多正常推进 60 次模拟，不随屏幕刷新率加倍。
const SIMULATION_SPEED = 1.5; // 模拟时间倍率；越大飞得越快，也越快转向/避让。

// 微调大小优先改 BIRD_SIZE_SCALE：0.8 会把所有深度的三角形一起缩小20%。
// size 是 CSS 像素倍率：三角形总长=size*(BIRD_TIP+BIRD_TAIL)，总宽约=size*2*BIRD_WING。
const BIRD_SIZE_SCALE = 0.8; // 整体尺寸倍率，保持近远比例；不影响飞行速度/鸟数。
const KESTREL_SIZE_SCALE = 1.0; // 红隼独立尺寸倍率；1.0 比当前普通鸟的 0.8 大25%。
const BIRD_SIZE = 2.7; // 位于场景中间深度时的基础大小。
const MIN_BIRD_SIZE = 2.1; // 最远/最小的一档；过大会削弱近大远小的层次。
const MAX_BIRD_SIZE = 3.8; // 最近/最大的一档。
const BIRD_TIP = 3; // 尖端离鸟中心的距离倍率。
const BIRD_TAIL = 1.5; // 尾端距离倍率；保持 BIRD_TIP=2*BIRD_TAIL 可固定质心。
const BIRD_WING = 0.9; // 半翼宽倍率，增大后轮廓更宽。
const WING_DEFORMATION = 0.12; // 半翼宽的形变幅度，应小于 BIRD_WING。
const WING_FREQUENCY = 6; // 形变相位每秒推进的弧度数，越大变化越快。
const DRAW_MARGIN = Math.max(BIRD_SIZE_SCALE, KESTREL_SIZE_SCALE) * MAX_BIRD_SIZE * Math.max(BIRD_TIP,
  Math.hypot(BIRD_TAIL, BIRD_WING + WING_DEFORMATION)); // 放大后仍可完整画出贴边三角形。

const DEPTH_BANDS = 32; // 透明度分档；越多色差越细，批量填充次数也越多。
const FAR_OPACITY = 0.05; // 最远处的不透明度：浅色主题更淡，深色主题更暗。
const NEAR_OPACITY = 0.22; // 最近处的不透明度：浅色主题更深，深色主题更亮。
const MAX_DPR = 1.5; // 画布像素密度上限；提高会更锐利，也会增加显存/绘制开销。
const MAX_CANVAS_PIXELS = 2_500_000; // 主画布总像素上限，控制最大的内存开销。
const TITLE_DEPTH = 0; // 标题/副标题所在的三维深度；0 是鸟群椭球中心，负值靠近镜头。
const TITLE_FADE_DEPTH = 0.12; // 鸟进入文字前方后，经过多深的距离才完全显出遮挡；越大过渡越柔和。
const TITLE_OCCLUSION = 0.7; // 前景鸟遮住字形的强度，0 无遮挡，1 完全遮住；留一些文字以保持可读。
const MAX_TITLE_CANVAS_PIXELS = 200_000; // 只覆盖两行文字的小画布像素上限，单份RGBA最多约0.8MB。
const MOUSE_RADIUS_RATIO = 0.18; // 避让半径占画布短边的比例。
const MIN_MOUSE_RADIUS = 75; // 鼠标避让半径的最小 CSS 像素值。
const MAX_MOUSE_RADIUS = 180; // 鼠标避让半径的最大 CSS 像素值。

export default function FlockBackground({titleRef}: {titleRef: RefObject<HTMLElement | null>}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const foregroundRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const foreground = foregroundRef.current;
    if (!canvas || !foreground) return;
    const context = canvas.getContext('2d', {alpha: true});
    const frontContext = foreground.getContext('2d', {alpha: true});
    // 主题变化时用一个像素解析/合成CSS颜色；不在动画帧中读取像素。
    const paletteCanvas = document.createElement('canvas');
    paletteCanvas.width = paletteCanvas.height = 1;
    const paletteContext = paletteCanvas.getContext('2d', {alpha: false, willReadFrequently: true});
    if (!context || !frontContext || !paletteContext) return;

    const flock = new FlockSimulation(MAX_PARTICLES);
    const kestrels = new KestrelSimulation();
    // 复用投影缓冲：屏幕 x/y、大小、缓存的朝向 x/y；逐帧不创建鸟对象。
    const projected = new Float32Array((MAX_PARTICLES + KESTREL_COUNT) * 5);
    const depthNext = new Int32Array(MAX_PARTICLES + KESTREL_COUNT);
    const depthHeads = new Int32Array(DEPTH_BANDS);
    const predator: Predator = {active: false, x: 0, y: 0, radius: 0};
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1, height = 1, focal = 1;
    let color = '';
    const frontColors = new Array<string>(DEPTH_BANDS);
    let frontLeft = 0, frontTop = 0, frontWidth = 0, frontHeight = 0;
    let frame = 0;
    let previous = 0;
    let accumulator = 0;
    let elapsed = 0;
    let visible = true;
    let disposed = false;

    const project = (positions: Float32Array, velocities: Float32Array,
      count: number, indexOffset: number, sizeScale: number) => {
      for (let i = 0; i < count; i++) {
        const o = i * 3;
        const index = indexOffset + i;
        const r = index * 5;
        const z = positions[o + 2];
        const depth = CAMERA_DISTANCE + z;
        const scale = focal / depth;
        const x = width / 2 + positions[o] * scale;
        const y = height / 2 + positions[o + 1] * scale;
        if (x < -DRAW_MARGIN || x > width + DRAW_MARGIN ||
          y < -DRAW_MARGIN || y > height + DRAW_MARGIN) continue;
        projected[r] = x;
        projected[r + 1] = y;
        const perspective = CAMERA_DISTANCE / depth;
        // 透视倍率越大越靠近相机，额外的平方根轻微加强近大远小。
        projected[r + 2] = sizeScale * Math.max(MIN_BIRD_SIZE, Math.min(MAX_BIRD_SIZE,
          BIRD_SIZE * perspective * Math.sqrt(perspective)));
        // 朝向取透视投影的导数，也计入沿 z 轴的运动。
        const vx = velocities[o] - positions[o] * velocities[o + 2] / depth;
        const vy = velocities[o + 1] - positions[o + 1] * velocities[o + 2] / depth;
        const speedSq = vx * vx + vy * vy;
        if (speedSq * scale * scale > 4) {
          const inverseSpeed = 1 / Math.sqrt(speedSq);
          projected[r + 3] = vx * inverseSpeed;
          projected[r + 4] = vy * inverseSpeed;
        } else if (projected[r + 3] === 0 && projected[r + 4] === 0) {
          // 几乎沿相机视线飞行时保留上次朝向，避免尖端闪动。
          projected[r + 3] = 1;
        }
        const proximity = Math.max(0, Math.min(1,
          (flock.bounds.z - z) / (flock.bounds.z * 2)));
        // 最近的一档取四舍五入，最大透明度误差约为总跨度的 1/(2*(档数-1))。
        const band = Math.round(proximity * (DEPTH_BANDS - 1));
        depthNext[index] = depthHeads[band];
        depthHeads[band] = index;
      }
    };

    const triangle = (target: CanvasRenderingContext2D, i: number) => {
      const r = i * 5;
      const x = projected[r], y = projected[r + 1], size = projected[r + 2];
      const dx = projected[r + 3], dy = projected[r + 4];
      const tip = size * BIRD_TIP;
      const tail = size * BIRD_TAIL;
      const wing = size * (BIRD_WING + Math.sin(elapsed * WING_FREQUENCY + i * 2.399963) * WING_DEFORMATION);
      target.moveTo(x + dx * tip, y + dy * tip);
      target.lineTo(x - dx * tail - dy * wing, y - dy * tail + dx * wing);
      target.lineTo(x - dx * tail + dy * wing, y - dy * tail - dx * wing);
      target.closePath();
    };
    const birdDepth = (i: number) => i < MAX_PARTICLES ? flock.positions[i * 3 + 2] :
      kestrels.positions[(i - MAX_PARTICLES) * 3 + 2];
    const overlapsTitle = (i: number) => {
      const r = i * 5, x = projected[r], y = projected[r + 1];
      return x + DRAW_MARGIN >= frontLeft && x - DRAW_MARGIN <= frontLeft + frontWidth &&
        y + DRAW_MARGIN >= frontTop && y - DRAW_MARGIN <= frontTop + frontHeight;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      depthHeads.fill(-1);
      project(flock.positions, flock.velocities, flock.count, 0, BIRD_SIZE_SCALE);
      // 三只红隼共用深度分桶/填充，保留近远遮挡顺序，不增加绘制批次。
      project(kestrels.positions, kestrels.velocities, kestrels.count, MAX_PARTICLES, KESTREL_SIZE_SCALE);
      // 从远到近批量绘制，保持原来的明暗范围，细化深度过渡。
      for (let band = 0; band < DEPTH_BANDS; band++) {
        if (depthHeads[band] === -1) continue;
        context.globalAlpha = FAR_OPACITY + (NEAR_OPACITY - FAR_OPACITY) * band / (DEPTH_BANDS - 1);
        context.beginPath();
        for (let i = depthHeads[band]; i !== -1; i = depthNext[i]) {
          triangle(context, i);
        }
        context.fill();
      }
      context.globalAlpha = 1;

      if (frontWidth <= 0 || frontHeight <= 0) return;
      frontContext.clearRect(frontLeft, frontTop, frontWidth, frontHeight);
      // DOM文字在两个画布之间。前景仅重画文字附近的近鸟，远鸟由真实字形遮挡。
      for (let band = 0; band < DEPTH_BANDS; band++) {
        const nearZ = flock.bounds.z * (1 - 2 * (band + 0.5) / (DEPTH_BANDS - 1));
        if (depthHeads[band] === -1 || nearZ >= TITLE_DEPTH) continue;
        frontContext.fillStyle = frontColors[band];
        frontContext.globalAlpha = TITLE_OCCLUSION;
        frontContext.beginPath();
        let hasBirds = false;
        for (let i = depthHeads[band]; i !== -1; i = depthNext[i]) {
          if (birdDepth(i) <= TITLE_DEPTH - TITLE_FADE_DEPTH && overlapsTitle(i)) {
            triangle(frontContext, i);
            hasBirds = true;
          }
        }
        if (hasBirds) frontContext.fill();
        const farZ = flock.bounds.z * (1 - 2 * (band - 0.5) / (DEPTH_BANDS - 1));
        if (farZ <= TITLE_DEPTH - TITLE_FADE_DEPTH) continue;
        // 只有中心附近、尚在渐入的小部分鸟逐只绘制；用真实z而非档位计算遮挡强度。
        for (let i = depthHeads[band]; i !== -1; i = depthNext[i]) {
          const t = (TITLE_DEPTH - birdDepth(i)) / TITLE_FADE_DEPTH;
          if (t <= 0 || t >= 1 || !overlapsTitle(i)) continue;
          frontContext.globalAlpha = TITLE_OCCLUSION * t * t * (3 - 2 * t);
          frontContext.beginPath();
          triangle(frontContext, i);
          frontContext.fill();
        }
      }
      frontContext.globalAlpha = 1;
    };

    const animate = (timestamp: number) => {
      frame = 0;
      if (disposed || document.hidden || !visible || reducedMotion.matches) return;
      // 固定步长；慢帧最多补三步，避免卡顿后大量追帧。
      if (previous) accumulator += Math.min((timestamp - previous) / 1000, STEP * 3);
      previous = timestamp;
      while (accumulator >= STEP) {
        // 只改变模拟时间，不增加每帧计算次数。
        kestrels.step(STEP * SIMULATION_SPEED, flock);
        flock.step(STEP * SIMULATION_SPEED, predator, kestrels);
        accumulator -= STEP;
        elapsed += STEP;
      }
      draw();
      frame = requestAnimationFrame(animate);
    };

    const updatePlayback = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      accumulator = 0;
      predator.active = false;
      if (disposed || document.hidden || !visible) return;
      draw();
      if (!reducedMotion.matches) frame = requestAnimationFrame(animate);
    };

    const resizeForeground = (rect: DOMRect, dpr: number) => {
      const title = titleRef.current?.getBoundingClientRect();
      const left = title ? Math.max(0, title.left - rect.left - 2) : 0;
      const top = title ? Math.max(0, title.top - rect.top - 2) : 0;
      const w = title ? Math.max(0, Math.min(width, title.right - rect.left + 2) - left) : 0;
      const h = title ? Math.max(0, Math.min(height, title.bottom - rect.top + 2) - top) : 0;
      const ratio = Math.min(dpr, Math.sqrt(MAX_TITLE_CANVAS_PIXELS / Math.max(1, w * h)));
      const pixelsWide = Math.max(1, Math.floor(w * ratio));
      const pixelsHigh = Math.max(1, Math.floor(h * ratio));
      if (left === frontLeft && top === frontTop && w === frontWidth && h === frontHeight &&
        foreground.width === pixelsWide && foreground.height === pixelsHigh) return false;
      frontLeft = left; frontTop = top; frontWidth = w; frontHeight = h;
      foreground.style.left = `${left}px`;
      foreground.style.top = `${top}px`;
      foreground.style.width = `${w}px`;
      foreground.style.height = `${h}px`;
      if (foreground.width !== pixelsWide) foreground.width = pixelsWide;
      if (foreground.height !== pixelsHigh) foreground.height = pixelsHigh;
      if (w > 0 && h > 0) {
        const sx = pixelsWide / w, sy = pixelsHigh / h;
        frontContext.setTransform(sx, 0, 0, sy, -left * sx, -top * sy);
      }
      return true;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, rect.width);
      const nextHeight = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR,
        Math.sqrt(MAX_CANVAS_PIXELS / (nextWidth * nextHeight)));
      const pixelsWide = Math.max(1, Math.floor(nextWidth * dpr));
      const pixelsHigh = Math.max(1, Math.floor(nextHeight * dpr));
      if (width === nextWidth && height === nextHeight &&
          canvas.width === pixelsWide && canvas.height === pixelsHigh) {
        // 字体加载/文字换行可只改变标题尺寸，不重新推进模拟或重置动画时钟。
        if (resizeForeground(rect, dpr) && !document.hidden && visible) draw();
        return;
      }
      width = nextWidth;
      height = nextHeight;
      const horizontalExtent = width / height * 1.05;
      // 窄屏保留三维空间的横向厚度，再缩镜头；避免把鸟群压成一张薄片。
      const halfWidth = Math.max(0.95, Math.min(4, horizontalExtent));
      focal = height * 1.4 * Math.min(1, horizontalExtent / halfWidth);
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
      context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      flock.resize(halfWidth);
      kestrels.resize(halfWidth);
      flock.count = Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, Math.round(width * height * PARTICLE_DENSITY)));
      predator.radius = Math.max(MIN_MOUSE_RADIUS, Math.min(MAX_MOUSE_RADIUS,
        Math.min(width, height) * MOUSE_RADIUS_RATIO)) / focal;
      resizeForeground(rect, dpr);
      updatePlayback();
    };

    const updateTheme = () => {
      const style = getComputedStyle(canvas);
      // 直接读取主题的目标文字颜色，避免缓存 CSS 过渡中的中间色。
      color = style.getPropertyValue('--ifm-font-color-base').trim() || style.color;
      // 页面背景可能含透明色：按祖先层叠到白色底，再预混合原有鸟色/透明度。
      // 若直接把同色半透明鸟放在同色文字上，会看不出谁在前面。
      const backgrounds: string[] = [];
      const themeBackground = style.getPropertyValue('--ifm-background-color').trim();
      for (let element = canvas.parentElement; element; element = element.parentElement) {
        // Infima把背景变量应用在html；读取目标值，避免缓存主题切换中的中间背景色。
        backgrounds.push(element === document.documentElement && themeBackground ?
          themeBackground : getComputedStyle(element).backgroundColor);
      }
      paletteContext.globalAlpha = 1;
      paletteContext.fillStyle = '#fff';
      paletteContext.fillRect(0, 0, 1, 1);
      for (let i = backgrounds.length - 1; i >= 0; i--) {
        paletteContext.fillStyle = backgrounds[i];
        paletteContext.fillRect(0, 0, 1, 1);
      }
      const base = paletteContext.getImageData(0, 0, 1, 1).data;
      const background = `rgb(${base[0]}, ${base[1]}, ${base[2]})`;
      for (let band = 0; band < DEPTH_BANDS; band++) {
        paletteContext.globalAlpha = 1;
        paletteContext.fillStyle = background;
        paletteContext.fillRect(0, 0, 1, 1);
        paletteContext.globalAlpha = FAR_OPACITY + (NEAR_OPACITY - FAR_OPACITY) * band / (DEPTH_BANDS - 1);
        paletteContext.fillStyle = color;
        paletteContext.fillRect(0, 0, 1, 1);
        const pixel = paletteContext.getImageData(0, 0, 1, 1).data;
        frontColors[band] = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
      }
      if (!document.hidden && visible) draw();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!event.isPrimary || reducedMotion.matches || !visible || document.hidden) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      predator.active = x >= 0 && x <= width && y >= 0 && y <= height;
      predator.x = (x - width / 2) / focal;
      predator.y = (y - height / 2) / focal;
    };
    const clearPredator = () => { predator.active = false; };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') clearPredator();
    };

    updateTheme();
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    if (titleRef.current) resizeObserver.observe(titleRef.current);
    const themeObserver = new MutationObserver(updateTheme);
    themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updatePlayback();
    });
    intersectionObserver.observe(canvas);
    reducedMotion.addEventListener('change', updatePlayback);
    document.addEventListener('visibilitychange', updatePlayback);
    document.addEventListener('pointerleave', clearPredator);
    window.addEventListener('pointermove', onPointerMove, {passive: true});
    window.addEventListener('pointerup', onPointerUp, {passive: true});
    window.addEventListener('pointercancel', clearPredator);
    window.addEventListener('blur', clearPredator);
    window.addEventListener('scroll', clearPredator, {passive: true});
    window.addEventListener('resize', resize, {passive: true});

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener('change', updatePlayback);
      document.removeEventListener('visibilitychange', updatePlayback);
      document.removeEventListener('pointerleave', clearPredator);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', clearPredator);
      window.removeEventListener('blur', clearPredator);
      window.removeEventListener('scroll', clearPredator);
      window.removeEventListener('resize', resize);
      // 切换页面立即释放画布 backing store。
      canvas.width = canvas.height = 1;
      foreground.width = foreground.height = 1;
    };
  }, [titleRef]);

  return <>
    <canvas ref={canvasRef} className="flock-bg" aria-hidden="true" />
    <canvas ref={foregroundRef} className="flock-bg flock-bg--foreground" width={1} height={1} aria-hidden="true" />
  </>;
}
