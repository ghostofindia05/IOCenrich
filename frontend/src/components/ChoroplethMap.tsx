"use client";

import React, { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Tooltip } from "react-tooltip";
import * as countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// We'll define an interface for the incoming indicators
interface MapIndicator {
    id: string;
    value: string;
    geoip: string | null;
}

interface ChoroplethMapProps {
    indicators: MapIndicator[];
}

export function ChoroplethMap({ indicators }: ChoroplethMapProps) {
    const [tooltipContent, setTooltipContent] = useState<string>("");

    // Aggregate counts and grouping lists for the tooltip
    const { countMap, iocMap, maxCount } = useMemo(() => {
        const cMap: Record<string, number> = {};
        const iMap: Record<string, string[]> = {};
        let mx = 0;

        indicators.forEach((ind) => {
            let geo = ind.geoip;
            if (!geo) return;

            // Normalize to Alpha2
            if (geo.length === 3) {
                geo = countries.alpha3ToAlpha2(geo) || geo;
            } else if (geo.length > 3) {
                geo = countries.getAlpha2Code(geo, "en") || geo;
            }

            const numCode = countries.alpha2ToNumeric(geo);

            if (numCode) {
                cMap[numCode] = (cMap[numCode] || 0) + 1;
                if (!iMap[numCode]) iMap[numCode] = [];
                iMap[numCode].push(ind.value);

                if (cMap[numCode] > mx) mx = cMap[numCode];
            }
        });

        return { countMap: cMap, iocMap: iMap, maxCount: mx };
    }, [indicators]);

    // Create a color scale
    const colorScale = scaleLinear<string>()
        .domain([0, maxCount || 1])
        .range(["#1e293b", "#ef4444"]); // from tailwind slate-800 to red-500

    return (
        <div className="w-full h-[400px] relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
            <ComposableMap
                projectionConfig={{ scale: 140 }}
                style={{ width: "100%", height: "100%" }}
            >
                <ZoomableGroup center={[0, 0]} zoom={1} minZoom={1} maxZoom={8}>
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const id = geo.id; // numeric code
                                const count = countMap[id] || 0;
                                const iocs = iocMap[id] || [];
                                const fill = count > 0 ? colorScale(count) : "#0f172a";

                                // Formulate tooltip string
                                const countryName = geo.properties.name || "Unknown Region";
                                const tooltipRaw = count > 0
                                    ? `<strong>${countryName} (Count: ${count})</strong><br/>` +
                                    iocs.slice(0, 5).join("<br/>") +
                                    (iocs.length > 5 ? `<br/><em>+${iocs.length - 5} more...</em>` : "")
                                    : `${countryName} (No IOCs)`;

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={fill}
                                        stroke="#334155" // slate-700
                                        strokeWidth={0.5}
                                        onMouseEnter={() => {
                                            setTooltipContent(tooltipRaw);
                                        }}
                                        onMouseLeave={() => {
                                            setTooltipContent("");
                                        }}
                                        style={{
                                            default: { outline: "none", transition: "all 250ms" },
                                            hover: { fill: count > 0 ? "#f87171" : "#1e293b", outline: "none", cursor: "pointer" },
                                            pressed: { outline: "none" },
                                        }}
                                        data-tooltip-id="choropleth-tooltip"
                                        data-tooltip-html={tooltipContent}
                                    />
                                );
                            })
                        }
                    </Geographies>
                </ZoomableGroup>
            </ComposableMap>

            {/* Use an absolute positioned tooltip mapping over the element id */}
            <Tooltip
                id="choropleth-tooltip"
                className="z-50 !bg-slate-800 !text-slate-100 !border !border-slate-700 !rounded-md !p-3 shadow-xl"
                variant="dark"
            />
        </div>
    );
}
