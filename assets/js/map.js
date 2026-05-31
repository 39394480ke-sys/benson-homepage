(function() {
  const mapPoints = document.getElementById('mapPoints');
  const provincePoints = document.getElementById('provincePoints');
  const mapBase = document.getElementById('mapBase');
  const mapViewport = document.querySelector('.map-viewport');
  const mapStage = document.querySelector('.map-stage');
  const mapShell = document.querySelector('.map-shell');
  const mapStatus = document.getElementById('mapStatus');
  const placePanel = document.getElementById('placePanel');
  const fallbackList = document.getElementById('placesFallback');
  const dataVersion = '20260601-map-location-2';

  if (!mapPoints || !provincePoints || !mapBase || !placePanel) {
    return;
  }

  const provinceByPlace = {
    hongkong: '广东',
    huizhou: '广东',
    macau: '广东',
    yangjiang: '广东',
    guangzhou: '广东',
    foshan: '广东',
    shanwei: '广东',
    shantou: '广东',
    zhongshan: '广东',
    qingyuan: '广东',
    xiamen: '福建',
    ganzhou: '江西',
    guilin: '广西',
    hangzhou: '浙江',
    shanghai: '上海',
    suzhou: '江苏',
    taiyuan: '山西',
    weinan: '陕西',
    wuhan: '湖北',
    xining: '青海',
    lanzhou: '甘肃',
    haixi: '青海',
    zhangye: '甘肃',
    jiayuguan: '甘肃',
    jiuquan: '甘肃',
    jinzhong: '山西',
    zhuhai: '广东',
    xian: '陕西',
    nanao: '广东',
    lijiang: '云南',
    nanjing: '江苏',
    beijing: '北京'
  };

  const provinceLabelOffsets = {
    广东: [18, 22],
    福建: [14, 8],
    江西: [-48, 6],
    广西: [-48, 12],
    浙江: [14, 16],
    上海: [14, -16],
    江苏: [-48, -10],
    山西: [14, -10],
    陕西: [-48, 4],
    湖北: [14, -12],
    青海: [-48, 4],
    甘肃: [-48, -10],
    云南: [-48, 10],
    北京: [14, -10]
  };

  const cityLabelOffsets = {
    guangzhou: [15, -14],
    foshan: [-42, -12],
    qingyuan: [-44, -14],
    huizhou: [15, -14],
    shantou: [14, -14],
    shanwei: [14, 20],
    zhongshan: [15, 22],
    hongkong: [14, 22],
    macau: [-40, 22],
    yangjiang: [-48, 22],
    hangzhou: [-42, 22],
    suzhou: [14, -14],
    shanghai: [14, 16]
  };

  let bounds = {
    minLng: 73,
    maxLng: 135,
    minLat: 18,
    maxLat: 54,
    width: 720,
    height: 520
  };
  let places = [];
  let placesByProvince = {};
  let provinceBounds = {};
  let activeProvince = null;
  let activePlace = null;
  let currentMapScale = 1;

  function projectPoint(coordinates) {
    const lng = coordinates[0];
    const lat = coordinates[1];
    const padding = Number(bounds.padding || 0);
    const drawableWidth = bounds.width - padding * 2;
    const drawableHeight = bounds.height - padding * 2;
    const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * drawableWidth;
    const y = padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * drawableHeight;
    return { x, y };
  }

  function getDisplayPoint(place, useOffsets) {
    const point = projectPoint(place.coordinates);
    const offset = useOffsets && Array.isArray(place.markerOffset) ? place.markerOffset : [0, 0];

    return {
      x: point.x + Number(offset[0] || 0),
      y: point.y + Number(offset[1] || 0)
    };
  }

  function createSvgElement(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
  }

  function getPathBounds(pathData) {
    const numbers = String(pathData || '').match(/-?\d+(?:\.\d+)?/g) || [];
    const xs = [];
    const ys = [];

    for (let index = 0; index < numbers.length - 1; index += 2) {
      xs.push(Number(numbers[index]));
      ys.push(Number(numbers[index + 1]));
    }

    if (!xs.length || !ys.length) return null;

    return {
      minX: Math.min.apply(null, xs),
      maxX: Math.max.apply(null, xs),
      minY: Math.min.apply(null, ys),
      maxY: Math.max.apply(null, ys)
    };
  }

  function mergeBounds(boundsList) {
    const usable = boundsList.filter(Boolean);
    if (!usable.length) return null;

    return {
      minX: Math.min.apply(null, usable.map(function(item) { return item.minX; })),
      maxX: Math.max.apply(null, usable.map(function(item) { return item.maxX; })),
      minY: Math.min.apply(null, usable.map(function(item) { return item.minY; })),
      maxY: Math.max.apply(null, usable.map(function(item) { return item.maxY; }))
    };
  }

  function boundsCenter(item) {
    return {
      x: (item.minX + item.maxX) / 2,
      y: (item.minY + item.maxY) / 2
    };
  }

  function renderMapBase(mapData) {
    if (!mapData || !Array.isArray(mapData.features)) return;

    if (mapData.bounds) {
      bounds = Object.assign({}, bounds, mapData.bounds);
    }

    mapBase.innerHTML = '';
    provinceBounds = {};

    const featuresByName = {};
    mapData.features.forEach(function(feature) {
      if (feature.name === '南海诸岛') return;
      featuresByName[feature.name] = feature;
      provinceBounds[feature.name] = getPathBounds(feature.path);
    });

    if (provinceBounds['广东']) {
      provinceBounds['广东'] = mergeBounds([
        provinceBounds['广东'],
        provinceBounds['香港'],
        provinceBounds['澳门']
      ]);
    }

    mapData.features.forEach(function(feature) {
      if (feature.name === '南海诸岛') return;

      const path = createSvgElement('path');
      const provinceName = feature.name || '';
      const hasPlaces = Boolean(placesByProvince[provinceName] && placesByProvince[provinceName].length);
      const isPearlDeltaExtra = provinceName === '香港' || provinceName === '澳门';

      path.classList.add('map-province');
      if (hasPlaces || isPearlDeltaExtra) {
        path.classList.add('has-places');
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        path.setAttribute('aria-label', '查看' + (isPearlDeltaExtra ? '广东' : provinceName) + '足迹');
      }
      path.setAttribute('d', feature.path);
      path.setAttribute('data-name', provinceName);
      mapBase.appendChild(path);

      if (hasPlaces || isPearlDeltaExtra) {
        const targetProvince = isPearlDeltaExtra ? '广东' : provinceName;
        path.addEventListener('click', function(event) {
          if (activePlace && activeProvince) {
            event.stopPropagation();
            closePanel();
            setMapMode('province');
            setStatus(activeProvince + '视图：点击城市点位查看照片');
            focusOnProvince(activeProvince);
            return;
          }

          if (activeProvince) {
            event.stopPropagation();
            enterGlobal();
            return;
          }

          event.stopPropagation();
          enterProvince(targetProvince);
        });
        path.addEventListener('keydown', function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            enterProvince(targetProvince);
          }
        });
      }
    });
  }

  function groupPlaces(rawPlaces) {
    placesByProvince = {};
    places = rawPlaces.map(function(place) {
      const province = place.province || provinceByPlace[place.id] || '其他';
      return Object.assign({}, place, { province: province });
    });

    places.forEach(function(place) {
      if (!placesByProvince[place.province]) {
        placesByProvince[place.province] = [];
      }
      placesByProvince[place.province].push(place);
    });
  }

  function renderProvinceEntrances() {
    provincePoints.innerHTML = '';

    Object.keys(placesByProvince).forEach(function(provinceName) {
      const itemBounds = provinceBounds[provinceName];
      if (!itemBounds) return;

      const center = boundsCenter(itemBounds);
      const placesCount = placesByProvince[provinceName].length;
      const point = createSvgElement('g');
      const hitArea = createSvgElement('circle');
      const circle = createSvgElement('circle');
      const label = createSvgElement('text');
      const count = createSvgElement('text');
      const labelOffset = provinceLabelOffsets[provinceName] || [14, 5];

      point.classList.add('province-point');
      point.setAttribute('role', 'button');
      point.setAttribute('tabindex', '0');
      point.setAttribute('aria-label', '查看' + provinceName + placesCount + '个足迹');
      point.setAttribute('transform', 'translate(' + center.x.toFixed(1) + ' ' + center.y.toFixed(1) + ')');

      hitArea.classList.add('province-point-hit');
      hitArea.setAttribute('r', '16');
      circle.classList.add('province-point-dot');
      circle.setAttribute('r', '9');
      count.classList.add('province-point-count');
      count.setAttribute('text-anchor', 'middle');
      count.setAttribute('dominant-baseline', 'central');
      count.textContent = placesCount;
      label.classList.add('province-point-label');
      label.setAttribute('x', Number(labelOffset[0] || 14));
      label.setAttribute('y', Number(labelOffset[1] || 5));
      label.textContent = provinceName;

      point.append(hitArea, circle, count, label);
      provincePoints.appendChild(point);

      point.addEventListener('click', function(event) {
        event.stopPropagation();
        enterProvince(provinceName);
      });

      point.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          enterProvince(provinceName);
        }
      });
    });
  }

  function renderCityPoints(provinceName) {
    mapPoints.innerHTML = '';
    const provincePlaces = placesByProvince[provinceName] || [];

    provincePlaces.forEach(function(place) {
      const projected = getDisplayPoint(place, false);
      const point = createSvgElement('g');
      const hitArea = createSvgElement('circle');
      const circle = createSvgElement('circle');
      const label = createSvgElement('text');
      const labelOffset = cityLabelOffsets[place.id] || place.labelOffset || [14, 4];

      point.classList.add('map-point');
      point.setAttribute('role', 'button');
      point.setAttribute('tabindex', '0');
      point.setAttribute('aria-label', '查看' + place.name + '的足迹');
      point.setAttribute('aria-pressed', 'false');
      point.setAttribute('transform', 'translate(' + projected.x.toFixed(1) + ' ' + projected.y.toFixed(1) + ')');
      point.dataset.labelX = Number(labelOffset[0] || 14);
      point.dataset.labelY = Number(labelOffset[1] || 4);

      hitArea.classList.add('map-point-hit');
      hitArea.setAttribute('r', '8');
      circle.setAttribute('r', '3.2');
      label.setAttribute('x', Number(labelOffset[0] || 14));
      label.setAttribute('y', Number(labelOffset[1] || 4));
      label.textContent = place.name;

      point.append(hitArea, circle, label);
      mapPoints.appendChild(point);

      point.addEventListener('click', function(event) {
        event.stopPropagation();
        setActiveCity(place, point);
      });

      point.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setActiveCity(place, point);
        }
      });
    });

    updateCityPointVisualScale(currentMapScale);
  }

  function setMapMode(mode) {
    if (!mapStage) return;
    mapStage.dataset.mapMode = mode;
  }

  function updateProvinceHighlight(provinceName) {
    document.querySelectorAll('.map-province').forEach(function(node) {
      const name = node.getAttribute('data-name');
      const isActive = name === provinceName || (provinceName === '广东' && (name === '香港' || name === '澳门'));
      node.classList.toggle('is-active-province', Boolean(provinceName && isActive));
    });
  }

  function setStatus(text) {
    if (mapStatus) {
      mapStatus.textContent = text;
    }
  }

  function focusOnBounds(itemBounds, options) {
    if (!mapViewport || !itemBounds) return;

    const opts = options || {};
    const center = boundsCenter(itemBounds);
    const boxWidth = Math.max(1, itemBounds.maxX - itemBounds.minX);
    const boxHeight = Math.max(1, itemBounds.maxY - itemBounds.minY);
    const paddingFactor = opts.paddingFactor || 1.85;
    const maxScale = opts.maxScale || 5.2;
    const minScale = opts.minScale || 1.65;
    const scale = Math.max(minScale, Math.min(maxScale, Math.min(bounds.width / (boxWidth * paddingFactor), bounds.height / (boxHeight * paddingFactor))));
    const panelBias = opts.panelBias || 0;
    const shiftX = (bounds.width / 2 - center.x) * 0.72 - panelBias;
    const shiftY = (bounds.height / 2 - center.y) * 0.72;
    const originX = (center.x / bounds.width) * 100;
    const originY = (center.y / bounds.height) * 100;
    const normalizedX = (center.x - bounds.width / 2) / (bounds.width / 2);
    const normalizedY = (center.y - bounds.height / 2) / (bounds.height / 2);
    currentMapScale = scale;

    window.clearTimeout(mapViewport._originTimer);
    mapViewport.style.setProperty('--map-origin-x', originX.toFixed(2) + '%');
    mapViewport.style.setProperty('--map-origin-y', originY.toFixed(2) + '%');
    mapViewport.style.setProperty('--map-shift-x', shiftX.toFixed(1) + 'px');
    mapViewport.style.setProperty('--map-shift-y', shiftY.toFixed(1) + 'px');
    mapViewport.style.setProperty('--map-scale', scale.toFixed(2));
    mapViewport.style.setProperty('--map-tilt-x', (normalizedY * -1.8).toFixed(2) + 'deg');
    mapViewport.style.setProperty('--map-tilt-y', (normalizedX * 2.3).toFixed(2) + 'deg');
    updateCityPointVisualScale(scale);
  }

  function updateCityPointVisualScale(scale) {
    const safeScale = Math.max(1, Number(scale) || 1);
    const dotRadius = 3.2 / safeScale;
    const hitRadius = 10 / safeScale;
    const strokeWidth = 1.6 / safeScale;
    const labelSize = 8 / safeScale;
    const labelStroke = 4 / safeScale;

    document.querySelectorAll('.map-point').forEach(function(point) {
      const hitArea = point.querySelector('.map-point-hit');
      const circle = point.querySelector('circle:not(.map-point-hit)');
      const label = point.querySelector('text');
      const labelX = Number(point.dataset.labelX || 14);
      const labelY = Number(point.dataset.labelY || 4);

      if (hitArea) {
        hitArea.setAttribute('r', hitRadius.toFixed(2));
      }

      if (circle) {
        circle.setAttribute('r', dotRadius.toFixed(2));
        circle.style.strokeWidth = strokeWidth.toFixed(2);
      }

      if (label) {
        label.setAttribute('x', (labelX / safeScale).toFixed(2));
        label.setAttribute('y', (labelY / safeScale).toFixed(2));
        label.style.fontSize = labelSize.toFixed(2) + 'px';
        label.style.strokeWidth = labelStroke.toFixed(2) + 'px';
      }
    });
  }

  function focusOnPoint(point, options) {
    const spread = Number((options && options.spread) || 44);
    const itemBounds = {
      minX: point.x - spread,
      maxX: point.x + spread,
      minY: point.y - spread,
      maxY: point.y + spread
    };
    focusOnBounds(itemBounds, Object.assign({ paddingFactor: 2.6, minScale: 3.4, maxScale: 5.8, panelBias: 36 }, options));

    if (mapStage) {
      mapStage.style.setProperty('--focus-x', ((point.x / bounds.width) * 100).toFixed(2) + '%');
      mapStage.style.setProperty('--focus-y', ((point.y / bounds.height) * 100).toFixed(2) + '%');
      mapStage.classList.add('is-focusing');
    }
  }

  function resetTransform() {
    if (!mapViewport) return;

    mapViewport.style.setProperty('--map-shift-x', '0px');
    mapViewport.style.setProperty('--map-shift-y', '0px');
    mapViewport.style.setProperty('--map-scale', '1');
    mapViewport.style.setProperty('--map-tilt-x', '0deg');
    mapViewport.style.setProperty('--map-tilt-y', '0deg');
    currentMapScale = 1;
    updateCityPointVisualScale(1);
    mapViewport._originTimer = window.setTimeout(function() {
      mapViewport.classList.add('is-resetting-origin');
      mapViewport.style.setProperty('--map-origin-x', '50%');
      mapViewport.style.setProperty('--map-origin-y', '50%');
      window.requestAnimationFrame(function() {
        mapViewport.classList.remove('is-resetting-origin');
      });
    }, 780);
  }

  function enterGlobal() {
    activeProvince = null;
    activePlace = null;
    setMapMode('global');
    setStatus('全国视图：点击有足迹的省份');
    provincePoints.classList.remove('is-hidden');
    mapPoints.innerHTML = '';
    updateProvinceHighlight(null);
    resetTransform();
    closePanel();
    renderEmptyPanel('点击有足迹的省份，进入省份视角后再选择城市。');
  }

  function enterProvince(provinceName) {
    if (!placesByProvince[provinceName] || !placesByProvince[provinceName].length) return;

    activeProvince = provinceName;
    activePlace = null;
    setMapMode('province');
    setStatus(provinceName + '视图：点击城市点位查看照片');
    provincePoints.classList.add('is-hidden');
    updateProvinceHighlight(provinceName);
    renderCityPoints(provinceName);
    closePanel();
    focusOnProvince(provinceName);
    renderEmptyPanel('正在查看' + provinceName + '，点击城市点位打开照片和简介；点击空白处回到全国视图。');
  }

  function focusOnProvince(provinceName) {
    focusOnBounds(provinceBounds[provinceName], { paddingFactor: provinceName === '广东' ? 1.75 : 1.7, minScale: 1.85, maxScale: provinceName === '广东' ? 3.35 : 5.3 });
  }

  function setActiveCity(place, pointNode) {
    const projected = getDisplayPoint(place, false);
    activePlace = place;

    document.querySelectorAll('.map-point').forEach(function(node) {
      node.classList.toggle('is-active', node === pointNode);
      node.setAttribute('aria-pressed', node === pointNode ? 'true' : 'false');
    });

    setMapMode('city');
    setStatus(place.province + ' / ' + place.name);
    focusOnPoint(projected);
    renderPanel(place);
  }

  function closePanel() {
    activePlace = null;
    placePanel.classList.remove('is-active');
    if (mapShell) {
      mapShell.classList.remove('has-active-place');
    }
    document.querySelectorAll('.map-point').forEach(function(node) {
      node.classList.remove('is-active');
      node.setAttribute('aria-pressed', 'false');
    });
    if (mapStage) {
      mapStage.classList.remove('is-focusing');
    }
  }

  function renderEmptyPanel(message) {
    placePanel.innerHTML = '<p class="panel-kicker">地图足迹</p><h3>三段式足迹地图</h3><p>' + escapeHtml(message || '先选择省份，再选择城市。') + '</p>';
  }

  function renderPanel(place) {
    const photos = place.photos || [];

    placePanel.classList.add('is-active');
    if (mapShell) {
      mapShell.classList.add('has-active-place');
    }

    placePanel.innerHTML = [
      '<p class="panel-kicker">' + escapeHtml(place.province) + '</p>',
      '<h3>' + escapeHtml(place.name) + '</h3>',
      '<p>' + escapeHtml(place.summary || '这里还可以补上一段属于这个地方的故事。') + '</p>',
      photos.length ? '<div class="place-photos">' + photos.map(function(src) {
        return '<img src="' + escapeAttribute(src) + '" alt="' + escapeAttribute(place.name + ' 的照片') + '">';
      }).join('') + '</div>' : ''
    ].join('');
  }

  function wireStageBlankClick() {
    if (!mapStage || mapStage._mapBlankClickWired) return;
    mapStage._mapBlankClickWired = true;

    mapStage.addEventListener('click', function(event) {
      if (event.target.closest('.map-point') || event.target.closest('.province-point') || event.target.closest('.place-panel')) {
        return;
      }

      if (activePlace && activeProvince) {
        closePanel();
        setMapMode('province');
        setStatus(activeProvince + '视图：点击城市点位查看照片');
        focusOnProvince(activeProvince);
        return;
      }

      if (activeProvince) {
        enterGlobal();
      }
    });
  }

  function renderFallback() {
    if (!fallbackList) return;
    fallbackList.innerHTML = places.map(function(place) {
      return '<button type="button" data-place="' + escapeAttribute(place.id) + '">' + escapeHtml(place.name) + '</button>';
    }).join('');
  }

  function showFallback(error) {
    placePanel.innerHTML = '<p class="panel-kicker">Map unavailable</p><h3>足迹暂时没有加载出来</h3><p>' + escapeHtml(error.message || '请稍后再试。') + '</p>';
  }

  Promise.all([
    fetch('assets/data/map/china-map.json?v=' + dataVersion).then(function(response) {
      if (!response.ok) throw new Error('china-map.json 加载失败');
      return response.json();
    }),
    fetch('assets/data/places.json?v=' + dataVersion).then(function(response) {
      if (!response.ok) throw new Error('places.json 加载失败');
      return response.json();
    })
  ])
    .then(function(results) {
      groupPlaces(results[1]);
      renderMapBase(results[0]);
      renderProvinceEntrances();
      renderFallback();
      renderEmptyPanel('点击有足迹的省份，进入省份视角后再选择城市。');
      wireStageBlankClick();
      setMapMode('global');
    })
    .catch(showFallback);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char];
    });
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }
})();
