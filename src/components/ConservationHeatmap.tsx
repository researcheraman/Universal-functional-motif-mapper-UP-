import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface HeatmapProps {
  data: { system: string; motif: string; score: number }[];
}

export const ConservationHeatmap: React.FC<HeatmapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const margin = { top: 40, right: 40, bottom: 60, left: 100 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const systems = Array.from(new Set(data.map(d => d.system)));
    const motifs = Array.from(new Set(data.map(d => d.motif)));

    const x = d3.scaleBand()
      .range([0, width])
      .domain(motifs)
      .padding(0.05);

    const y = d3.scaleBand()
      .range([height, 0])
      .domain(systems)
      .padding(0.05);

    const color = d3.scaleSequential()
      .interpolator(d3.interpolateViridis)
      .domain([0, 1]);

    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .style("font-family", "'JetBrains Mono', monospace")
      .style("font-size", "9px")
      .style("text-transform", "uppercase");

    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-family", "'JetBrains Mono', monospace")
      .style("font-size", "9px")
      .style("text-transform", "uppercase");

    svg.selectAll()
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d.motif)!)
      .attr("y", d => y(d.system)!)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", d => color(d.score))
      .style("stroke-width", 1)
      .style("stroke", "#141414")
      .style("opacity", 1);

  }, [data]);

  return <svg ref={svgRef} className="w-full h-auto" />;
};
