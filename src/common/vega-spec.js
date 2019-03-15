import { getData, renderVega } from "./mapd-connector";
import { conv4326To900913 } from "./map-utils";
import { getLabel, getColor } from "./config";
import { updateMap } from "../components/map";
import { updateCounterLabel } from '../components/counter-label';
import { updateDamageChart } from '../components/damage-chart';
import { scaleLinear } from 'd3-scale';
import { timeFormatter } from './time-utils';

function getMarkSize(neLat, zoom) {
  const pixelSize = 10
  const width = 10
  const numBinsX = Math.round(width / pixelSize)
  const markWidth = width / numBinsX
  const markHeight = 2 * markWidth / Math.sqrt(3.0)
  return [
    markWidth,
    markHeight
  ]
}

export const createVegaSpec = ({map, endDate, damageFilter}) => {

  const mapContainer = map.getContainer();
  const mapWidth = mapContainer.clientWidth;
  const mapHeight = mapContainer.clientHeight;
  
  const {_ne, _sw} = map.getBounds();
  const [xMax, yMax] = conv4326To900913([_ne.lng, _ne.lat]);
  const [xMin, yMin] = conv4326To900913([_sw.lng, _sw.lat]);
  const strokeZoomScale = scaleLinear().domain([map.getMinZoom(), map.getMaxZoom()]).range([6, 1]);

  // to see the pointmap, change the [0, 0] here, for example to [0.5, 10]
  const pointZoomScale = scaleLinear().domain([map.getMinZoom(), map.getMaxZoom()]).range([0, 0]);
  const [markWidth, markHeight] = getMarkSize(_ne.lat, map.getZoom());

  // const startDate = endDate.getTime() - 1000 * 60 * 60 * 2;
  // const startDateString = timeFormatter(startDate);
  const endDateString = timeFormatter(endDate);
  const ndviOpacity = 0.3;

  const vegaSpec = {
    width: mapWidth,
    height: mapHeight,
    data: [
      {
        name: "pointmapLayer0",
        sql: `SELECT conv_4326_900913_x(ST_X(omnisci_geo)) as x, 
          conv_4326_900913_y(ST_Y(omnisci_geo)) as y, 
          DAMAGE as color, 
          ca_butte_county_damaged_points_earliestdate.rowid 
        FROM ca_butte_county_damaged_points_earliestdate 
        WHERE ((ST_X(omnisci_geo) >= ${_sw.lng} AND ST_X(omnisci_geo) <= ${_ne.lng}) 
          AND (ST_Y(omnisci_geo) >= ${_sw.lat} AND ST_Y(omnisci_geo) <= ${_ne.lat}))
          AND perDatTime <= '${endDateString}'
        LIMIT 2000000`
      },
      {
        name: "backendChoroplethLayer1",
        format: "polys",
        geocolumn: "omnisci_geo",
        sql: `SELECT ca_butte_county_parcels.rowid as rowid 
        FROM ca_butte_county_parcels 
        WHERE (ca_butte_county_parcels.LandUse ILIKE '%RS%')`
      },
      // {
      //   name: "backendChoroplethLayer3",
      //   format: "polys",
      //   geocolumn: "omnisci_geo",
      //   sql: `SELECT s2_DAMAGE as color, 
      //     ca_butte_county_damaged_buildings_earliestdate.rowid as rowid 
      //     FROM ca_butte_county_damaged_buildings_earliestdate
      //     WHERE perDatTime <= '${endDateString}'`
      // },
      {  
      "name":"backendChoroplethLayer3",
      "format":"polys",
      "geocolumn":"omnisci_geo",
      "sql": `SELECT s2_DAMAGE as color,
        camp_fire_damaged_buildings_viirs_earliest_damage_date.rowid as rowid
        FROM camp_fire_damaged_buildings_viirs_earliest_damage_date
        WHERE ((
            camp_fire_damaged_buildings_viirs_earliest_damage_date.s2_DAMAGE = 'Destroyed (>50%)'
            OR camp_fire_damaged_buildings_viirs_earliest_damage_date.s2_DAMAGE = 'Affected (1-9%)'
            OR camp_fire_damaged_buildings_viirs_earliest_damage_date.s2_DAMAGE = 'Minor (10-25%)'
            OR camp_fire_damaged_buildings_viirs_earliest_damage_date.s2_DAMAGE = 'Major (26-50%)'))`
      },
      {  
        "name":"heatmap_querygeoheatLayer4",
        "sql":`SELECT reg_hex_horiz_pixel_bin_x(conv_4326_900913_x(ST_X(omnisci_geo)),
          ${xMin},${xMax},conv_4326_900913_y(ST_Y(omnisci_geo)),
          ${yMin},${yMax},
          ${markWidth},${markHeight},0,0,
          ${mapWidth},${mapHeight}) as x,
          reg_hex_horiz_pixel_bin_y(conv_4326_900913_x(ST_X(omnisci_geo)),
          ${xMin},${xMax},conv_4326_900913_y(ST_Y(omnisci_geo)),
          ${yMin},${yMax},
          ${markWidth},${markHeight},0,0,
          ${mapWidth},${mapHeight}) as y, avg(ndvi) as color
          FROM fire_prefire_ndvi
          WHERE ((ST_X(omnisci_geo) >= ${_sw.lng}
            AND ST_X(omnisci_geo) <= ${_ne.lng})
            AND (ST_Y(omnisci_geo) >= ${_sw.lat}
            AND ST_Y(omnisci_geo) <= ${_ne.lat}))
          GROUP BY x, y`
      },
      {  
        "name":"heatmap_querygeoheatLayer4_stats",
        "source":"heatmap_querygeoheatLayer4",
        "transform":[  
          {  
             "type":"aggregate",
             "fields":[  
                "color",
                "color",
                "color",
                "color"
             ],
             "ops":[  
                "min",
                "max",
                "avg",
                "stddev"
             ],
             "as":[  
                "minimum",
                "maximum",
                "mean",
                "deviation"
             ]
          },
          {  
             "type":"formula",
             "expr":"max(minimum, mean-2*deviation)",
             "as":"mincolor"
          },
          {  
             "type":"formula",
             "expr":"min(maximum, mean+2*deviation)",
             "as":"maxcolor"
          }
        ]
      }
    ],
    scales: [
      {
        name: "x",
        type: "linear",
        domain: [xMin, xMax],
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: [yMin, yMax],
        range: "height"
      },
      {
        name: "pointmapLayer0_fillColor",
        type: "ordinal",
        domain: [
          "Destroyed (>50%)",
          "Affected (1-9%)",
          "Minor (10-25%)",
          "Major (26-50%)",
          "Other"
        ],
        range: [
          getColor("Destroyed (>50%)"),
          getColor("Major (26-50%)"),
          getColor("Minor (10-25%)"),
          getColor("Affected (1-9%)"),
          getColor("Other")
        ],
        default: "rgba(214, 215, 214, 0.6)",
        nullValue: "rgba(214, 215, 214, 0.6)"
      },
      {
        name: "backendChoroplethLayer3_fillColor",
        type: "ordinal",
        domain: [
          "Destroyed (>50%)",
          "Affected (1-9%)",
          "Minor (10-25%)",
          "Major (26-50%)",
          "Other"
        ],
        range: [
          getColor("Destroyed (>50%)"),
          getColor("Major (26-50%)"),
          getColor("Minor (10-25%)"),
          getColor("Affected (1-9%)"),
          getColor("Other")
        ],
        default: "rgba(214, 215, 214, 0.6)",
        nullValue: "rgba(214, 215, 214, 0.6)"
      },
      {  
        "name":"heat_colorgeoheatLayer4",
        "type":"quantize",
        "domain":{  
          "data":"heatmap_querygeoheatLayer4_stats",
          "fields":[  
             "mincolor",
             "maxcolor"
          ]
        },
        "range":[  
          `rgba(242, 255, 246, ${ndviOpacity})`,
          `rgba(229, 252, 236, ${ndviOpacity})`,
          `rgba(201, 237, 212, ${ndviOpacity})`,
          `rgba(174, 226, 190, ${ndviOpacity})`,
          `rgba(150, 211, 168, ${ndviOpacity})`,
          `rgba(100, 173, 122, ${ndviOpacity})`,
          `rgba(60, 150, 86, ${ndviOpacity})`,
          `rgba(12, 127, 46, ${ndviOpacity})`,
          `rgba(0, 79, 23, ${ndviOpacity})`
        ],
        "default": `rgba(13,8,135,${ndviOpacity})`,
        "nullValue": `rgba(153,153,153,${ndviOpacity})`
      }
    ],
    projections: [
      {
        name: "mercator_map_projection",
        type: "mercator",
        bounds: {
          x: [_sw.lng, _ne.lng],
          y: [_sw.lat, _ne.lat]
        }
      }
    ],
    marks: [
      {
        type: "polys",
        from: { data: "backendChoroplethLayer1" },
        properties: {
          x: { field: "x" },
          y: { field: "y" },
          fillColor: { value: "rgba(39,174,239,0.2)" },
          strokeColor: "white",
          strokeWidth: 0,
          lineJoin: "miter",
          miterLimit: 10
        },
        transform: { projection: "mercator_map_projection" }
      },
      {  
         "type":"symbol",
         "from":{  
            "data":"heatmap_querygeoheatLayer4"
         },
         "properties":{  
            "shape":"hexagon-horiz",
            "xc":{  
               "field":"x"
            },
            "yc":{  
               "field":"y"
            },
            "width":10.05,
            "height":11.604740410711479,
            "fillColor":{  
               "scale":"heat_colorgeoheatLayer4",
               "field":"color"
            }
         }
      },
      {
        type: "polys",
        from: { data: "backendChoroplethLayer3" },
        properties: {
          x: { field: "x" },
          y: { field: "y" },
          fillColor: {
            scale: "backendChoroplethLayer3_fillColor",
            field: "color"
          },
          strokeColor: {
            scale: "backendChoroplethLayer3_fillColor",
            field: "color"
          },
          strokeWidth: strokeZoomScale(map.getZoom()),
          lineJoin: "miter",
          miterLimit: 10
        },
        transform: { projection: "mercator_map_projection" }
      },
      {
        type: "symbol",
        from: { data: "pointmapLayer0" },
        properties: {
          xc: { scale: "x", field: "x" },
          yc: { scale: "y", field: "y" },
          fillColor: { scale: "pointmapLayer0_fillColor", field: "color" },
          shape: "circle",
          width: pointZoomScale(map.getZoom()),
          height: pointZoomScale(map.getZoom())
        }
      }
    ]
  };
  return vegaSpec;
};

export const getDamageDataQuery = ({map, endDate}) => {
  const {_ne, _sw} = map.getBounds();
  const endDateString = timeFormatter(endDate);
  return `with filler as(
    select DAMAGE, 
    sum(0) as nonecount
    from ca_butte_county_damaged_points_earliestdate
    group by 1
  ),
  damagequery as (
    SELECT 
    ca_butte_county_damaged_points_earliestdate.DAMAGE, 
    COUNT(*) AS val 
    FROM ca_butte_county_damaged_points_earliestdate 
    WHERE (
        (ST_X(omnisci_geo) >= ${_sw.lng} AND ST_X(omnisci_geo) <= ${_ne.lng}) 
        AND 
        (ST_Y(omnisci_geo) >= ${_sw.lat} AND ST_Y(omnisci_geo) <= ${_ne.lat})
  ) AND perDatTime <= '${endDateString}'
    GROUP BY 1 
    ORDER BY val DESC 
    NULLS LAST 
    LIMIT 100
  )
  select
  filler.damage as key0,
  filler.nonecount + coalesce(damagequery.val,0) as val
  from filler
  left join damagequery on filler.damage = damagequery.damage;`;
}

export function updateVega(map, endDate, damageFilter = 'all') {
  // get data stats
  getData(getDamageDataQuery({map, endDate}))
    .then(result => {
      // NOTE: damage results are sorted by count values (see query above :)
      updateCounterLabel(result[0].val, getColor(result[0].key0));
      updateDamageChart(result);
    })
    .catch(error => {
      throw error;
    });


  // get vega tiles for the map
  const vegaSpec = createVegaSpec({map, endDate, damageFilter});
  renderVega(vegaSpec)
    .then(result => {
      updateMap(result);
    })
    .catch(error => {
      throw error;
    });
};
