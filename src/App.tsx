import React, { Component } from "react";
import { action, observable } from "mobx";
import { observer } from "mobx-react";
import "./App.css";

const HEIGHT = 600;

interface IBall {
  x: number;
  y: number;
  radius: number;
}

interface IPlatform {
  x: number;
  y: number;
  width: number;
}

class Model {
  @observable ball: IBall = { x: 50, y: 300, radius: 10 };
  @observable platforms: IPlatform[] = [{ x: 100, y: 100, width: 200 }];

  @action update() {
    this.ball.x += 1;
  }

  start() {
    setInterval(this.update.bind(this), 20);
  }
}

const model = new Model();
(window as any).model = model;


const Ball = observer(({
  ball: { x, y, radius },
  color = "red"
}: {
  ball: IBall;
  color?: any;
}) => (
  <div
    className="Ball"
    style={{
      left: x - radius,
      top: HEIGHT - (y - radius),
      width: 2 * radius,
      height: 2 * radius,
      backgroundColor: color
    }}
  />
));

const Platform = observer(({ x, y, width }: IPlatform) => (
  <div
    className="Platform"
    style={{
      left: x,
      top: HEIGHT - y,
      width
    }}
  />
));

@observer
class Game extends Component<{ model: Model }> {
  render() {
    const { ball, platforms } = this.props.model;
    return (
      <div className="root">
        <Ball ball={ball} />
        {platforms.map(platform => (
          <Platform {...platform} key={[platform.x, platform.y].toString()} />
        ))}
      </div>
    );
  }

  componentDidMount(): void {
    this.props.model.start();
  }
}

export const App = () => <Game model={model} />;
