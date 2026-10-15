import { Ball } from './types';

/**
 * 2D Spatial Hash Grid for fast broadphase ball-ball collision detection.
 * Keeps ball pairs query at O(N) instead of O(N^2).
 */
export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<number, number[]>;
  private width: number;
  private height: number;
  private cols: number;

  constructor(width: number, height: number, cellSize: number = 40) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.grid = new Map();
  }

  clear(): void {
    this.grid.clear();
  }

  private getKey(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  insert(ball: Ball, index: number): void {
    const minCx = Math.max(0, Math.floor((ball.x - ball.radius) / this.cellSize));
    const maxCx = Math.min(this.cols - 1, Math.floor((ball.x + ball.radius) / this.cellSize));
    const minCy = Math.max(0, Math.floor((ball.y - ball.radius) / this.cellSize));
    const maxCy = Math.min(Math.ceil(this.height / this.cellSize) - 1, Math.floor((ball.y + ball.radius) / this.cellSize));

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = this.getKey(cx, cy);
        let list = this.grid.get(key);
        if (!list) {
          list = [];
          this.grid.set(key, list);
        }
        list.push(index);
      }
    }
  }

  getPotentialCollisions(ball: Ball, ballIndex: number): number[] {
    const minCx = Math.max(0, Math.floor((ball.x - ball.radius) / this.cellSize));
    const maxCx = Math.min(this.cols - 1, Math.floor((ball.x + ball.radius) / this.cellSize));
    const minCy = Math.max(0, Math.floor((ball.y - ball.radius) / this.cellSize));
    const maxCy = Math.min(Math.ceil(this.height / this.cellSize) - 1, Math.floor((ball.y + ball.radius) / this.cellSize));

    const potential = new Set<number>();
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = this.getKey(cx, cy);
        const list = this.grid.get(key);
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const otherIdx = list[i];
            if (otherIdx > ballIndex) {
              potential.add(otherIdx);
            }
          }
        }
      }
    }
    return Array.from(potential);
  }
}
