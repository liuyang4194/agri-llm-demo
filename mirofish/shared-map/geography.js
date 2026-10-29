/* Geography and region colouring extracted verbatim from fact.js. */
const WORLD_SEAM=-25;const worldLongitude=lng=>lng<WORLD_SEAM?lng+360:lng;
  function seamHalf(ring, west) {
    const inside = p => west ? p[0] < WORLD_SEAM : p[0] >= WORLD_SEAM;
    const clipped = [];
    let prev = ring[ring.length - 1];
    for (const point of ring) {
      if (inside(prev) !== inside(point)) {
        const t = (WORLD_SEAM - prev[0]) / (point[0] - prev[0]);
        clipped.push([WORLD_SEAM, prev[1] + t * (point[1] - prev[1])]);
      }
      if (inside(point)) clipped.push(point);
      prev = point;
    }
    if (clipped.length < 3) return null;
    const result = clipped.map(([lng, lat]) => [west ? lng + 360 : lng, lat]);
    if (result[0][0] !== result[result.length - 1][0] || result[0][1] !== result[result.length - 1][1]) result.push(result[0].slice());
    return result;
  }
  function worldGeoJSON(pacific = false) {
    const raw = window.__WORLD110 || [];
    const depth = x => { let d = 0; while (Array.isArray(x) && x.length) { d++; x = x[0]; } return d; };
    const features = raw.map(o => {
      const d = depth(o.c);
      const original = d >= 4 ? o.c : [d === 3 ? o.c : [o.c]];
      const coordinates = pacific ? original.flatMap(polygon => {
        const outer = polygon[0];
        if (outer.some(p => p[0] < WORLD_SEAM) && outer.some(p => p[0] >= WORLD_SEAM)) {
          return [seamHalf(outer, true), seamHalf(outer, false)].filter(Boolean).map(ring => [ring]);
        }
        return [polygon.map(ring => ring.map(([lng, lat]) => [worldLongitude(lng), lat]))];
      }) : original;
      return { type: 'Feature', properties: { name: o.n }, geometry: { type: 'MultiPolygon', coordinates } };
    });
    if (!pacific) return { type: 'FeatureCollection', features };
    const repeated = [-1, 0, 1].flatMap(copy => features.map(feature => ({
      type: 'Feature',
      properties: { name: copy ? feature.properties.name + '@' + copy : feature.properties.name, originalName: feature.properties.name },
      geometry: { type: 'MultiPolygon', coordinates: feature.geometry.coordinates.map(poly => poly.map(ring => ring.map(([lng, lat]) => [lng + copy * 360, lat]))) }
    })));
    return { type: 'FeatureCollection', features: repeated };
  }
  const MAP_PALETTE = {
    land: '#cfe9bd', land2: '#b6dfa4', line: 'rgba(224,128,118,.55)', ink: '#22303f',
    regions: ['#cfe9bd', '#e2efc6', '#b6dfa4', '#eae7c4', '#c9e6cd', '#d7e4b2', '#bcdcc9', '#e8f0d8'],
    tipBg: 'rgba(255,255,255,.98)', tipLine: 'rgba(30,58,92,.22)', mass: 'rgba(47,111,208,.22)', dot: '#2f6fd0'
  };
  const palette = () => MAP_PALETTE;
  /* 共享至少两个边界顶点才算相邻；贪心图着色保证接壤区域异色。 */
  function regionColors(features) {
    const byVertex = new Map(), neighbors = new Map();
    features.forEach(({ name, coordinates }) => {
      neighbors.set(name, new Set());
      const seen = new Set();
      const visit = value => {
        if (Array.isArray(value) && typeof value[0] === 'number') {
          seen.add(value[0].toFixed(3) + ',' + value[1].toFixed(3));
        } else if (Array.isArray(value)) value.forEach(visit);
      };
      visit(coordinates);
      seen.forEach(key => {
        if (!byVertex.has(key)) byVertex.set(key, []);
        byVertex.get(key).push(name);
      });
    });
    const pairs = new Map();
    byVertex.forEach(names => {
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
        const key = [names[i], names[j]].sort().join('|');
        pairs.set(key, (pairs.get(key) || 0) + 1);
      }
    });
    pairs.forEach((count, pair) => {
      if (count < 2) return;
      const [a, b] = pair.split('|');
      neighbors.get(a).add(b); neighbors.get(b).add(a);
    });
    const colors = new Map();
    [...neighbors.keys()].sort((a, b) => neighbors.get(b).size - neighbors.get(a).size || a.localeCompare(b)).forEach(name => {
      const used = new Set([...neighbors.get(name)].map(next => colors.get(next)));
      let index = 0; while (used.has(index)) index++;
      colors.set(name, index);
    });
    return colors;
  }
  let countryColors, provinceColors;
  const regionIndex = (name, level) => {
    if (level === 'L1') {
      if (!countryColors) countryColors = regionColors((window.__WORLD110 || []).map(x => ({ name: x.n, coordinates: x.c })));
      return countryColors.get(String(name).replace(/@[-\d]+$/, '')) || 0;
    }
    if (!provinceColors) provinceColors = regionColors(((window.__CHINA_GEO || {}).features || []).map(x => ({ name: x.properties.name, coordinates: x.geometry.coordinates })));
    return provinceColors.get(name) || 0;
  };
  const regionFill = (name, p, level = 'L1') => p.regions[regionIndex(name, level) % p.regions.length];

window.V03Fact={worldGeoJSON,mapRegionColor:(name,level)=>regionFill(name,MAP_PALETTE,level)};
