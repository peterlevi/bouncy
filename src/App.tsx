import React, { Component } from 'react';
import { action, observable } from 'mobx';
import { observer } from 'mobx-react';
import './App.css';
import Flame from './images/flame.gif';
import TennisBall from './images/tennisball.png';

const WIDTH = 600;
const HEIGHT = 600;
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

class Model {
  @observable data: {
    balls: BallModel[];
    platforms: PlatformModel[];
    images: ImageModel[];
  } = { balls: [], platforms: [], images: [] };

  keys: Set<string> = new Set<string>();

  constructor() {
    this.reset();
  }

  reset() {
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
      { x: 400, y: 400, width: 200, height: 10, color: 'orange' },
      { x: 200, y: 300, width: 200, height: 10, color: 'orange' },
      { x: 300, y: 200, width: 200, height: 10, color: 'orange' },
      { x: 50, y: 100, width: 200, height: 10, color: 'orange' },
      { x: 0, y: 10, width: WIDTH, height: 10, color: 'orange' },
    ];
    this.data.images = [
      { x: 150, y: 100, src: Flame, height: 150, width: 'auto' },
    ];
  }

  @action update() {
    var t0 = performance.now();

    const { keys } = this;
    const { balls, platforms } = this.data;

    for (let b of balls) {
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
            b.x >= platform.x - b.radius / 2 &&
            b.x <= platform.x + platform.width + b.radius / 2
          ) {
            b.y = platform.y + b.radius;
            if (b.vy < 0) {
              b.vy = -BOUNCINESS * b.vy;
            }
            if (Math.abs(b.vy) < 0.2) {
              b.vy = 0;
              stop = true;
            }
            if (keys.has('ArrowUp') && b.vy >= 0) {
              b.vy -= GRAVITY * 20;
            }
          } else if (
            b.y >= platform.y - platform.height - b.radius &&
            b.y <= platform.y - platform.height + b.radius &&
            b.x >= platform.x - b.radius / 2 &&
            b.x <= platform.x + platform.width + b.radius / 2
          ) {
            b.y = platform.y - platform.height - b.radius;
            if (b.vy > 0) {
              b.vy = -BOUNCINESS * b.vy;
            }
          }
        }
      }

      //   // ball-side collisions based on https://stackoverflow.com/a/48598489
      //   // Buggier around corners than my custom solution above, needs investigatiing.
      //   if (
      //     !collision &&
      //     b.y < platform.y + b.radius &&
      //     b.y > platform.y - platform.height - b.radius &&
      //     b.x > platform.x - b.radius &&
      //     b.x < platform.x + platform.width + b.radius
      //   ) {
      //     // Choose which side of the box is closest to the circle's centre
      //     var dists = [
      //       Math.abs(b.x - platform.x),
      //       Math.abs(b.x - (platform.x + platform.width)),
      //       Math.abs(b.y - platform.y),
      //       Math.abs(b.y - (platform.y - platform.height)),
      //     ];
      //     // Get minimum value's index in array
      //     var i = dists.indexOf(Math.min.apply(Math, dists));
      //     // ... that will be the side that dictates the bounce
      //     if (i < 2) {
      //       b.vx = (i == 0 ? -1 : 1) * Math.abs(b.vx);
      //     } else {
      //       b.vy = (i == 2 ? 1 : -1) * Math.abs(b.vy) * BOUNCINESS;
      //     }
      //     if (Math.abs(b.vy) < 0.2) {
      //       b.vy = 0;
      //       stop = true;
      //     }
      //     if (keys.has('ArrowUp') && b.vy >= 0) {
      //       b.vy += -GRAVITY * 20;
      //     }
      //   }
      // }

      if (!stop) {
        b.vy += GRAVITY;
        b.y += b.vy;
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

      // keep ball in viewport
      if (b.x - b.radius < 0) {
        b.x = b.radius;
        b.vx = Math.abs(b.vx);
      }
      if (b.x + b.radius > WIDTH) {
        b.x = WIDTH - b.radius;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y - b.radius < 0) {
        b.y = b.radius;
        b.vy = Math.abs(b.vy);
      }
      if (b.y + b.radius > HEIGHT) {
        b.y = HEIGHT - b.radius;
        b.vy = -Math.abs(b.vy);
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

const BallDiv = observer(
  ({ ball: { x, y, radius, color } }: { ball: BallModel }) => (
    <div
      className="Ball"
      style={{
        left: x - radius,
        top: HEIGHT - y - radius,
        width: 2 * radius,
        height: 2 * radius,
        backgroundColor: color,
      }}
    />
  )
);

const BallImage = observer(
  ({ ball: { x, y, radius, src, rotation } }: { ball: BallModel }) => (
    <img
      className="BallImage"
      src={src}
      style={{
        left: x - radius,
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
    platform: { x, y, width, height, color },
  }: {
    platform: PlatformModel;
  }) => (
    <div
      className="Platform"
      style={{
        left: x,
        top: HEIGHT - y,
        width,
        height,
        backgroundColor: color,
      }}
    />
  )
);

const Image = observer(
  ({ image: { x, y, width, height, src } }: { image: ImageModel }) => (
    <div
      className="Image"
      style={{
        left: x,
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
    const { balls, platforms, images } = this.props.model.data;
    const { keys } = this.props.model;

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
          keys.delete(e.key);
          // console.log(keys);
          if (KEYS.includes(e.key)) {
            e.preventDefault();
          }
        }}>
        {balls.map(ball => (
          <BallImage ball={ball} key={key(ball)} />
        ))}
        {platforms.map(platform => (
          <Platform platform={platform} key={key(platform)} />
        ))}
        {images.map(image => (
          <Image image={image} key={key(image)} />
        ))}
      </div>
    );
  }

  componentDidMount(): void {
    this.props.model.start();
    (this.root as HTMLDivElement).focus();
  }
}

export const App = () => <Game model={model} />;
