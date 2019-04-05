import React, { Component } from 'react';
import { action, observable } from 'mobx';
import { observer } from 'mobx-react';
import './App.css';
import Flame from './images/flame.gif';

const WIDTH = 600;
const HEIGHT = 600;
const GRAVITY = -0.15;
const X_ACCEL = 0.5;
const BOUNCINESS = 0.8;
const RESISTANCE = 0.9;

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
}

interface PlatformModel extends Position, Size, Color {}

interface ImageModel extends Position {
  width: number | 'auto';
  height: number;
  src: string;
}

class Model {
  @observable balls: BallModel[] = [
    { id: 'ball1', x: 150, y: HEIGHT - 20, vx: 0, vy: 0, radius: 10, color: 'red' },
  ];
  @observable platforms: PlatformModel[] = [
    { x: 100, y: 100, width: 200, height: 10, color: 'orange' },
  ];
  @observable images: ImageModel[] = [
    { x: 150, y: 100, src: Flame, height: 150, width: 'auto' },
  ];

  keys: Set<string> = new Set<string>();

  @action update() {
    const { balls, platforms, keys } = this;
    for (let b of balls) {
      let stop = false;
      for (let platform of platforms) {
        if (
          b.y < platform.y + b.radius &&
          b.y > platform.y - b.radius &&
          b.x >= platform.x &&
          b.x <= platform.x + platform.width
        ) {
          b.y = platform.y + b.radius;
          if (b.vy < 0) {
            b.vy = -BOUNCINESS * b.vy;
          }
          if (Math.abs(b.vy) < 0.2) {
            b.vy = 0;
            stop = true;
          }
        }
      }

      if (!stop) {
        b.vy += GRAVITY;
        b.y += b.vy;
      }

      if (keys.has('ArrowLeft')) {
        b.vx -= X_ACCEL;
      } else if (keys.has('ArrowRight')) {
        b.vx += X_ACCEL;
        console.log('accel');
      }
      b.vx *= RESISTANCE;
      if (Math.abs(b.vx) < 0.05) {
        b.vx = 0;
      }

      b.x += b.vx;
    }
  }

  start() {
    setInterval(this.update.bind(this), 20);
  }
}

const model = new Model();
(window as any).model = model;

const Ball = observer(
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

@observer
class Game extends Component<{ model: Model }> {
  root: HTMLDivElement | null = null;

  render() {
    const { balls, platforms, images, keys } = this.props.model;
    return (
      <div
        ref={e => (this.root = e)}
        tabIndex={0}
        className="Game"
        style={{ width: WIDTH, height: HEIGHT }}
        onKeyDown={e => {
          keys.add(e.key);
          e.preventDefault();
          console.log(keys);
        }}
        onKeyUp={e => {
          keys.delete(e.key);
          e.preventDefault();
          console.log(keys);
        }}>
        {balls.map(ball => (
          <Ball ball={ball} key={key(ball)} />
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
