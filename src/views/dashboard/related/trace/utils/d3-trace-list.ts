/**</template>
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as d3 from "d3";
import d3tip from "d3-tip";
import type { Trace } from "@/types/trace";

export default class ListGraph {
  private barHeight = 48;
  private handleSelectSpan: Nullable<(i: Trace) => void> = null;
  private el: Nullable<HTMLDivElement> = null;
  private i = 0;
  private width = 0;
  private height = 0;
  private svg: any = null;
  private tip: any = null;
  private row: any[] = [];
  private data: any = [];
  private min = 0;
  private max = 0;
  private list: any[] = [];
  private xScale: any = null;
  private xAxis: any = null;
  private sequentialScale: any = null;
  private root: any = null;
  constructor(el: HTMLDivElement, handleSelectSpan: (i: Trace) => void) {
    this.handleSelectSpan = handleSelectSpan;
    this.el = el;
    this.width = el.getBoundingClientRect().width - 10;
    this.height = el.getBoundingClientRect().height - 10;
    this.svg = d3
      .select(this.el)
      .append("svg")
      .attr("class", "trace-list-dowanload")
      .attr("width", this.width > 0 ? this.width : 10)
      .attr("height", this.height > 0 ? this.height : 10)
      .attr("transform", `translate(-5, 0)`);
    this.tip = (d3tip as any)()
      .attr("class", "d3-tip")
      .offset([-8, 0])
      .html((d: any) => {
        return `
          <div class="mb-5">${d.data.label}</div>
          ${d.data.dur ? '<div class="sm">SelfDuration: ' + d.data.dur + "ms</div>" : ""}
          ${
            d.data.endTime - d.data.startTime
              ? '<div class="sm">TotalDuration: ' + (d.data.endTime - d.data.startTime) + "ms</div>"
              : ""
          }
          `;
      });
    this.svg.call(this.tip);
  }
  diagonal(d: any) {
    return `M ${d.source.y} ${d.source.x + 5}
    L ${d.source.y} ${d.target.x - 30}
    L${d.target.y} ${d.target.x - 20}
    L${d.target.y} ${d.target.x - 5}`;
  }
  init(data: any, row: any[], fixSpansSize: number) {
    d3.select(".trace-xaxis").remove();
    this.row = row;
    this.data = data;
    this.min = d3.min(this.row.map((i) => i.startTime));
    this.max = d3.max(this.row.map((i) => i.endTime - this.min)) || 0;
    this.list = Array.from(new Set(this.row.map((i) => i.serviceCode)));
    this.xScale = d3
      .scaleLinear()
      .range([0, this.width * 0.387])
      .domain([0, this.max]);
    this.xAxis = d3.axisTop(this.xScale).tickFormat((d: any) => {
      if (d === 0) return 0;
      if (d >= 1000) return d / 1000 + "s";
      return d;
    });
    this.svg.attr("height", (this.row.length + fixSpansSize + 1) * this.barHeight);
    this.svg
      .append("g")
      .attr("class", "trace-xaxis")

      .attr("transform", `translate(${this.width * 0.618 - 20},${30})`)
      .call(this.xAxis);
    this.sequentialScale = d3
      .scaleSequential()
      .domain([0, this.list.length + 1])
      .interpolator(d3.interpolateCool);
    this.root = d3.hierarchy(this.data, (d) => d.children);
    this.root.x0 = 0;
    this.root.y0 = 0;
  }
  draw(callback: any) {
    this.update(this.root, callback);
  }
  click(d: any, scope: any) {
    if (!d.data.type) return;
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    scope.update(d);
  }
  update(source: any, callback: any) {
    const t = this;
    const nodes = this.root.descendants();
    let index = -1;
    this.root.eachBefore((n: any) => {
      n.x = ++index * this.barHeight + 24;
      n.y = n.depth * 12;
    });
    const node = this.svg.selectAll(".trace-node").data(nodes, (d: any) => d.id || (d.id = ++this.i));
    const nodeEnter = node
      .enter()
      .append("g")
      .attr("transform", `translate(${source.y0},${source.x0})`)
      .attr("class", "trace-node")
      .attr("style", "cursor: pointer")
      .style("opacity", 0)
      .on("mouseover", function (event: any, d: Trace) {
        t.tip.show(d, this);
      })
      .on("mouseout", function (event: any, d: Trace) {
        t.tip.hide(d, this);
      })
      .on("click", (event: any, d: Trace) => {
        if (this.handleSelectSpan) {
          this.handleSelectSpan(d);
        }
      });
    nodeEnter
      .append("rect")
      .attr("height", 42)
      .attr("ry", 2)
      .attr("rx", 2)
      .attr("y", -22)
      .attr("x", 20)
      .attr("width", "100%")
      .attr("fill", "rgba(0,0,0,0)");
    nodeEnter
      .append("text")
      .attr("x", 13)
      .attr("y", 5)
      .attr("fill", "#E54C17")
      .html((d: any) => (d.data.isError ? "◉" : ""));
    nodeEnter
      .append("text")
      .attr("class", "node-text")
      .attr("x", 35)
      .attr("y", -6)
      .attr("fill", "#333")
      .html((d: any) => {
        if (d.data.label === "TRACE_ROOT") {
          return "";
        }
        const label = d.data.label.length > 30 ? `${d.data.label.slice(0, 30)}...` : `${d.data.label}`;
        return label;
      });
    nodeEnter
      .append("circle")
      .attr("r", 10)
      .attr("cx", (d: any) => {
        const events = d.data.attachedEvents;
        if (events && events.length > 9) {
          return 272;
        } else {
          return 270;
        }
      })
      .attr("cy", -5)
      .attr("fill", "none")
      .attr("stroke", "#e66")
      .style("opacity", (d: any) => {
        const events = d.data.attachedEvents;
        if (events && events.length) {
          return 0.5;
        } else {
          return 0;
        }
      });
    nodeEnter
      .append("text")
      .attr("x", 267)
      .attr("y", -1)
      .attr("fill", "#e66")
      .style("font-size", "10px")
      .text((d: any) => {
        const events = d.data.attachedEvents;
        if (events && events.length) {
          return `${events.length}`;
        } else {
          return "";
        }
      });
    nodeEnter
      .append("text")
      .attr("class", "node-text")
      .attr("x", 35)
      .attr("y", 12)
      .attr("fill", "#ccc")
      .style("font-size", "11px")
      .text((d: any) => `${d.data.layer || ""} ${d.data.component ? "- " + d.data.component : d.data.component || ""}`);
    nodeEnter
      .append("rect")
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("height", 4)
      .attr("width", (d: any) => {
        if (!d.data.endTime || !d.data.startTime) return 0;
        return this.xScale(d.data.endTime - d.data.startTime) + 1 || 0;
      })
      .attr("x", (d: any) =>
        !d.data.endTime || !d.data.startTime
          ? 0
          : this.width * 0.618 - 20 - d.y + this.xScale(d.data.startTime - this.min) || 0,
      )
      .attr("y", -2)
      .style("fill", (d: any) => `${this.sequentialScale(this.list.indexOf(d.data.serviceCode))}`);
    nodeEnter
      .transition()
      .duration(400)
      .attr("transform", (d: any) => `translate(${d.y + 5},${d.x})`)
      .style("opacity", 1);
    nodeEnter
      .append("circle")
      .attr("r", 3)
      .style("cursor", "pointer")
      .attr("stroke-width", 2.5)
      .attr("fill", (d: any) =>
        d._children ? `${this.sequentialScale(this.list.indexOf(d.data.serviceCode))}` : "rbga(0,0,0,0)",
      )
      .style("stroke", (d: any) =>
        d.data.label === "TRACE_ROOT" ? "" : `${this.sequentialScale(this.list.indexOf(d.data.serviceCode))}`,
      )
      .on("click", (d: any) => {
        this.click(d, this);
      });
    node
      .transition()
      .duration(400)
      .attr("transform", (d: any) => `translate(${d.y + 5},${d.x})`)
      .style("opacity", 1)
      .select("circle")
      .attr("fill", (d: any) => (d._children ? `${this.sequentialScale(this.list.indexOf(d.data.serviceCode))}` : ""));

    // Transition exiting nodes to the parent's new position.
    node
      .exit()
      .transition()
      .duration(400)
      .attr("transform", `translate(${source.y},${source.x})`)
      .style("opacity", 0)
      .remove();
    const link = this.svg.selectAll(".trace-link").data(this.root.links(), function (d: any) {
      return d.target.id;
    });

    link
      .enter()
      .insert("path", "g")
      .attr("class", "trace-link")
      .attr("fill", "rgba(0,0,0,0)")
      .attr("stroke", "rgba(0, 0, 0, 0.1)")
      .attr("stroke-width", 2)
      .attr("transform", `translate(5, 0)`)
      .attr("d", () => {
        const o = { x: source.x0 + 40, y: source.y0 };
        return this.diagonal({ source: o, target: o });
      })
      .transition()
      .duration(400)
      .attr("d", this.diagonal);

    link.transition().duration(400).attr("d", this.diagonal);

    link
      .exit()
      .transition()
      .duration(400)
      .attr("d", () => {
        const o = { x: source.x + 35, y: source.y };
        return this.diagonal({ source: o, target: o });
      })
      .remove();
    this.root.each(function (d: any) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
    if (callback) {
      callback();
    }
  }
  resize() {
    if (!this.el) {
      return;
    }
    this.width = this.el.getBoundingClientRect().width - 20;
    this.height = this.el.getBoundingClientRect().height - 10;
    this.svg.attr("width", this.width).attr("height", this.height);
    this.svg.select("g").attr("transform", () => `translate(160, 0)`);
    const transform = d3.zoomTransform(this.svg).translate(0, 0);
    d3.zoom().transform(this.svg, transform);
  }
}
