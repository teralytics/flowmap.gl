/*
 * Copyright 2019 Teralytics
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import * as React from 'react';
import Stats from 'stats.js';

export default function withStats<P>(Comp: React.ComponentType<P>) {
  return (props: P) => {
    class WithStats extends React.Component {
      private stats: Stats = new Stats();
      private statsContainer = React.createRef<HTMLDivElement>();
      private animateRef: number = 0;

      componentDidMount() {
        if (this.statsContainer.current) {
          this.stats.showPanel(0);
          this.statsContainer.current.appendChild(this.stats.dom);
        }
        const calcFPS = () => {
          this.stats.begin();
          this.stats.end();
          this.animateRef = window.requestAnimationFrame(calcFPS);
        };
        this.animateRef = window.requestAnimationFrame(calcFPS);
      }

      componentWillUnmount() {
        window.cancelAnimationFrame(this.animateRef);
      }

      render() {
        return (
          <>
            <Comp {...props} />
            <div ref={this.statsContainer} />
          </>
        );
      }
    }

    return <WithStats />;
  };
}
