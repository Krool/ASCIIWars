export interface Scene {
  enter(): void;
  exit(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  /** If true, SceneManager skips its own update/render (scene runs its own loop). */
  ownsLoop?: boolean;
}

export class SceneManager {
  private currentScene: Scene | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private running = false;
  private lastTime = 0;
  private scenes = new Map<string, Scene>();
  private currentName = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    // Only set dimensions when they actually change — setting canvas.width
    // clears the buffer, which would blank the screen every frame.
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.style.width = window.innerWidth + 'px';
      this.canvas.style.height = window.innerHeight + 'px';
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  register(name: string, scene: Scene): void {
    this.scenes.set(name, scene);
  }

  switchTo(name: string): void {
    if (this.currentScene) {
      this.currentScene.exit();
    }
    this.currentScene = this.scenes.get(name) ?? null;
    this.currentName = name;
    if (this.currentScene) {
      this.currentScene.enter();
    }
  }

  get active(): string {
    return this.currentName;
  }

  start(initialScene: string): void {
    this.switchTo(initialScene);
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(time: number): void {
    if (!this.running) return;
    const dt = Math.min(time - this.lastTime, 200);
    this.lastTime = time;

    this.resizeCanvas();

    if (this.currentScene && !this.currentScene.ownsLoop) {
      // Apply DPR base transform before every render so scenes draw in CSS-pixel coords
      const dpr = window.devicePixelRatio || 1;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.currentScene.update(dt);
      this.currentScene.render(this.ctx);
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}
