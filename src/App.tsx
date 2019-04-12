import React, { Component } from 'react';
import { action, observable } from 'mobx';
import { observer } from 'mobx-react';
import './App.css';
import Flame from './images/flame.gif';
import TennisBall from './images/tennisball.png';

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const GRAVITY = -0.25;
const X_ACCEL = 0.5;
const BOUNCINESS = 0.8;
const RESISTANCE = 0.93;

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface Color {
  color: string;
}

interface Speed {
  vx: number;
  vy: number;
}

interface BallModel extends Position, Speed, Color {
  radius: number;
  id: string;
  src: string;
  rotation: number;
}

interface PlatformModel extends Position, Size, Color {}

interface ImageModel extends Position {
  width: number | 'auto';
  height: number;
  src: string;
}

const randomPlatform = (): PlatformModel => ({
  x: Math.random() * 2 * WIDTH,
  y: 10 + Math.floor((Math.random() * (HEIGHT - 30)) / 100) * 100,
  width: 50 + Math.random() * 150,
  height: 10,
  color: 'orange',
});

class Model {
  private INITIAL_DATA = {
    gameOver: false,
    score: 0,
    offsetx: 0,
    balls: [],
    platforms: [],
    images: [],
  };

  @observable data: {
    gameOver: boolean;
    score: number;
    offsetx: number;
    balls: BallModel[];
    platforms: PlatformModel[];
    images: ImageModel[];
  } = this.INITIAL_DATA;

  keys: Set<string> = new Set<string>();
  unprocessedKeys: Set<string> = new Set<string>();

  constructor() {
    this.reset();
  }

  reset() {
    this.data = this.INITIAL_DATA;
    this.data.balls = [
      {
        id: 'ball1',
        x: 150,
        y: HEIGHT - 20,
        vx: 0,
        vy: 0,
        radius: 15,
        color: 'red',
        src: TennisBall,
        rotation: 0,
      },
    ];
    this.data.platforms = [
      { x: 100, y: 500, width: 200, height: 10, color: 'orange' },
    ];
    while (this.data.platforms.length < 25) {
      this.data.platforms.push(randomPlatform());
    }
    this.data.images = [
      { x: 150, y: 100, src: Flame, height: 150, width: 'auto' },
    ];
  }

  @action update() {
    var t0 = performance.now();

    const { data, keys, unprocessedKeys } = this;
    const { offsetx, balls, platforms } = data;

    if (keys.has('ArrowUp')) {
      unprocessedKeys.add('ArrowUp');
    }

    // is ball b horizontally within the platform, regardless of y
    const inx = (b: BallModel, platform: PlatformModel) =>
      b.x >= platform.x - b.radius / 2 &&
      b.x <= platform.x + platform.width + b.radius / 2;

    for (let b of balls) {
      if (data.gameOver && b.y < -100) {
        return;
      }

      let stop = false;

      for (let platform of platforms) {
        // corner collisions based on https://gamedev.stackexchange.com/a/10917
        let collision = false;
        for (let [sidex, cx, cy] of [
          [-1, platform.x, platform.y],
          [+1, platform.x + platform.width, platform.y],
          [-1, platform.x, platform.y - platform.height],
          [+1, platform.x + platform.width, platform.y - platform.height],
        ]) {
          collision =
            (sidex == -1 ? b.x < cx : b.x > cx) &&
            (b.x - cx) ** 2 + (b.y - cy) ** 2 < b.radius ** 2;
          if (collision) {
            let x = b.x - cx;
            let y = b.y - cy;
            let c = (-2 * (b.vx * x + b.vy * y)) / (x ** 2 + y ** 2);
            b.vx += c * x;
            b.vy += c * y;
            break;
          }
        }

        if (!collision) {
          if (
            b.y <= platform.y + b.radius &&
            b.y >= platform.y - b.radius &&
            inx(b, platform)
          ) {
            b.y = platform.y + b.radius;
            if (b.vy < 0) {
              b.vy = -BOUNCINESS * b.vy;
            }
            if (Math.abs(b.vy) < 0.2) {
              b.vy = 0;
              stop = true;
            }
            if (unprocessedKeys.has('ArrowUp') && b.vy >= 0) {
              unprocessedKeys.delete('ArrowUp');
              keys.delete('ArrowUp');
              b.vy -= GRAVITY * 20;
            }
          } else if (
            b.y >= platform.y - platform.height - b.radius &&
            b.y <= platform.y - platform.height + b.radius &&
            inx(b, platform)
          ) {
            b.y = platform.y - platform.height - b.radius;
            if (b.vy > 0) {
              b.vy = -BOUNCINESS * b.vy;
            }
          }
        }
      }

      if (!stop) {
        b.vy += GRAVITY;

        // update b.y with vy, but so as not to "pass" through platforms
        if (b.vy > 0) {
          let closestAbove = Math.min(
            ...platforms
              .filter(p => p.y - p.height >= b.y + b.radius && inx(b, p))
              .map(p => p.y - p.height)
          );
          b.y = Math.min(b.y + b.vy, closestAbove - b.radius);
        } else {
          let closestBelow = Math.max(
            ...platforms
              .filter(p => p.y <= b.y - b.radius && inx(b, p))
              .map(p => p.y)
          );
          b.y = Math.max(b.y + b.vy, closestBelow + b.radius);
        }
      }

      if (Math.abs(b.vy) >= -GRAVITY * 100) {
        b.vy = Math.sign(b.vy) * (-GRAVITY * 100);
      }

      if (keys.has('ArrowLeft')) {
        b.vx -= X_ACCEL;
      } else if (keys.has('ArrowRight')) {
        b.vx += X_ACCEL;
      }
      b.vx *= RESISTANCE;
      if (Math.abs(b.vx) < 0.05) {
        b.vx = 0;
      } else {
        b.x += b.vx;
        b.rotation += 4 * b.vx;
      }

      const left_margin = 0.125 * WIDTH;
      const right_margin = 0.4 * WIDTH;
      if (b.x - offsetx < left_margin) {
        data.offsetx = Math.max(0, b.x - left_margin);
      } else if (b.x - offsetx > right_margin) {
        data.offsetx = b.x - right_margin;
      }

      // keep ball in viewport
      if (b.x - b.radius < 0) {
        b.x = b.radius;
        b.vx = Math.abs(b.vx);
      }

      data.score = Math.max(data.score, Math.floor(b.x));

      // if (b.x + b.radius > WIDTH) {
      //   b.x = WIDTH - b.radius;
      //   b.vx = -Math.abs(b.vx);
      // }
      if (b.y - b.radius < 0) {
        data.gameOver = true;
        // b.y = b.radius;
        // b.vy = Math.abs(b.vy);
      }
      if (b.y + b.radius > HEIGHT) {
        b.y = HEIGHT - b.radius;
        b.vy = -Math.abs(b.vy);
      }

      // remove "past" platforms and add new ones
      data.platforms = platforms.filter(p => p.x + p.width >= b.x - 2 * WIDTH);
      while (
        data.platforms.filter(p => p.x >= b.x + 2 * WIDTH).length <
        Math.max(25 - data.score / 1000, 10)
      ) {
        data.platforms.push({
          ...randomPlatform(),
          x: b.x + 2 * WIDTH + Math.random() * 2 * WIDTH,
        });
      }
    }

    var t1 = performance.now();
    var timeTaken = t1 - t0;

    requestAnimationFrame(this.update.bind(this));
  }

  start() {
    requestAnimationFrame(this.update.bind(this));
  }
}

const model = new Model();
(window as any).model = model;

const Viewport = observer(
  ({ offsetx, children }: { offsetx: number; children: React.ReactNode[] }) => (
    <div className={'Viewport'}>{children}</div>
  )
);

const BallImage = observer(
  ({
    offsetx,
    ball: { x, y, radius, src, rotation },
  }: {
    offsetx: number;
    ball: BallModel;
  }) => (
    <img
      className="BallImage"
      src={src}
      style={{
        left: x - radius - offsetx,
        top: HEIGHT - y - radius,
        width: 2 * radius,
        height: 2 * radius,
        transform: `rotate(${rotation}deg)`,
      }}
    />
  )
);

const Platform = observer(
  ({
    offsetx,
    platform: { x, y, width, height, color },
  }: {
    offsetx: number;
    platform: PlatformModel;
  }) => (
    <div
      className="Platform"
      style={{
        left: x - offsetx,
        top: HEIGHT - y,
        width,
        height,
        backgroundColor: color,
      }}
    />
  )
);

const Image = observer(
  ({
    offsetx,
    image: { x, y, width, height, src },
  }: {
    offsetx: number;
    image: ImageModel;
  }) => (
    <div
      className="Image"
      style={{
        left: x - offsetx,
        top: HEIGHT - y - height,
        width,
        height,
        src,
      }}
    />
  )
);

const key = (p: Position): string => [p.x, p.y].toString();

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp'];

@observer
class Game extends Component<{
  model: Model;
}> {
  root: HTMLDivElement | null = null;

  render() {
    const { model } = this.props;
    const {
      gameOver,
      score,
      offsetx,
      balls,
      platforms,
      images,
    } = model.data;
    const { keys } = model;

    return (
      <div
        ref={e => (this.root = e)}
        tabIndex={0}
        className="Game"
        style={{ width: WIDTH, height: HEIGHT, maxWidth: WIDTH }}
        onKeyDown={e => {
          keys.add(e.key);
          // console.log(keys);
          if (KEYS.includes(e.key)) {
            e.preventDefault();
          }
        }}
        onKeyUp={e => {
          if (gameOver && e.key === 'Enter') {
            model.reset();
            model.start();
            return;
          }
          keys.delete(e.key);
          // console.log(keys);
          if (KEYS.includes(e.key)) {
            e.preventDefault();
          }
        }}>
        <Viewport offsetx={offsetx}>
          {balls.map(ball => (
            <BallImage offsetx={offsetx} ball={ball} key={key(ball)} />
          ))}
          {platforms.map(platform => (
            <Platform
              offsetx={offsetx}
              platform={platform}
              key={key(platform)}
            />
          ))}
          {images.map(image => (
            <Image offsetx={offsetx} image={image} key={key(image)} />
          ))}
          <span className={'Score'}>Score: {score}</span>
          {gameOver && <span className={'GameOver'}>Game Over</span>}
        </Viewport>
      </div>
    );
  }

  componentDidMount(): void {
    this.props.model.start();
    (this.root as HTMLDivElement).focus();
  }
}

export const App = () => <Game model={model} />;
