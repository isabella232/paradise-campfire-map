import { default as vegaEmbed } from "vega-embed";
import { getLabel, getColor, POI_END_DATE_STRING } from "../common/config";
import { zoomOut } from "../components/map";
import { dispatcher } from "../common/dispatcher";

let damageChart = null;
export function initDamageChart() {
  damageChart = document.querySelector("#damage-chart");
  let showAllDamageLink = document.querySelector("#show-all-damage-link");
  showAllDamageLink.addEventListener("click", onShowAllDamageLinkClick);
}

function onShowAllDamageLinkClick(event) {
  showDamage("all");
}

function showDamage(damage = "all") {
  dispatcher.call("damageFilter", null, damage); // null = that/this context
  if (damage === "all") {
    // zoom out for full area damage display
    zoomOut();
  }
}

export function updateDamageChart(damageData) {
  const chartData = damageData.map(damage => {
    return {
      label: getLabel(damage.key0),
      damageKey: damage.key0,
      color: getColor(damage.key0),
      count: damage.val
    };
  });

  // damage bar chart vega spec
const vegaSpec = {
    width: 190,
    height: 120,
    padding: 5,
    title: {
      text: POI_END_DATE_STRING,
      font: "Arial",
      fontWeight: "normal",
      fontSize: 13
    },
    data: {
      values: chartData
    },
    encoding: {
      x: {
        field: "count",
        type: "quantitative",
        axis: {
          title: "",
          tickCount: 3,
          format: ",d",
          grid: false
        }
      },
      y: {
        field: "label",
        type: "ordinal",
        axis: {
          title: ""
        }
      },
      color: {
        field: "color",
        type: "nominal",
        scale: null
      },
      tooltip: {
        field: "count",
        type: "quantitative",
        format: ",d"
      },
      fillOpacity: {
        condition: {
          selection: "select", 
          value: 1
        }, 
        value: 0.8
      },
      strokeWidth: {
        condition: {
          selection: "highlight", 
          value: 1
        }, 
        value: 0.5
      }
    },
    layer: [
      {
        mark: {
          type: "bar",
          stroke: "#333",
          cursor: "pointer"  
        }
      },
      {
        mark: {
          type: "text",
          align: "left",
          baseline: "middle",
          fontSize: 13,
          fontWeight: "bold",
          dx: 3
        },
        encoding: {
          text: {
            field: "count",
            type: "quantitative",
            format: ",d"
          }
        },
        selection: {
          "highlight": {type: "single", empty: "none", on: "mouseover"},
          "select": {type: "multi"},  
          "barSelection": {
            fields: ["damageKey"],
            on: "click",
            type: "single"
          }
        }
      },
    ],
    config: {
      scale: {bandPaddingInner: 0.2},
      axis: {labelColor: "#666", "labelFontSize": 12, labelFontWeight: "bold"},
      axisBottom: {labelColor: "#999"}
    }
  };

  // render vega damage chart
  vegaEmbed("#damage-chart", vegaSpec, { mode: "vega-lite" }).then(result => {
    // add damage bar selection handler
    result.view.addSignalListener("barSelection", (name, value) => {
      showDamage(value.damageKey[0])
    });
  });
}

export default damageChart;
