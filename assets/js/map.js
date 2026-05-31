(function() {
  const mapPoints = document.getElementById('mapPoints');
  const mapBase = document.getElementById('mapBase');
  const mapViewport = document.querySelector('.map-viewport');
  const mapStage = document.querySelector('.map-stage');
  const mapShell = document.querySelector('.map-shell');
  const placePanel = document.getElementById('placePanel');
  const fallbackList = document.getElementById('placesFallback');
  const dataVersion = '20260531-places-2';
  let resetOriginTimer;

  if (!mapPoints || !mapBase || !placePanel) {
    return;
  }

  let bounds = {
    minLng: 73,
    maxLng: 135,
    minLat: 18,
    maxLat: 54,
    width: 720,
    height: 520
  };

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

  function getDisplayPoint(place) {
    const point = projectPoint(place.coordinates);
    const offset = Array.isArray(place.markerOffset) ? place.markerOffset : [0, 0];

    return {
      x: point.x + Number(offset[0] || 0),
      y: point.y + Number(offset[1] || 0)
    };
  }

  function createSvgElement(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
  }

  function renderMapBase(mapData) {
    if (!mapData || !Array.isArray(mapData.features)) {
      return;
    }

    if (mapData.bounds) {
      bounds = Object.assign({}, bounds, mapData.bounds);
    }

    mapBase.innerHTML = '';
    mapData.features.forEach(function(feature) {
      if (feature.name === '南海诸岛') {
        return;
      }

      const path = createSvgElement('path');
      path.classList.add('map-province');
      path.setAttribute('d', feature.path);
      path.setAttribute('data-name', feature.name || '');
      mapBase.appendChild(path);
    });
  }

  function renderPanel(place) {
    const photos = place.photos || [];

    placePanel.classList.add('is-active');
    if (mapShell) {
      mapShell.classList.add('has-active-place');
    }

    placePanel.innerHTML = [
      '<h3>' + escapeHtml(place.name) + '</h3>',
      '<p>' + escapeHtml(place.summary || '这里还可以补上一段属于这个地方的故事。') + '</p>',
      photos.length ? '<div class="place-photos">' + photos.map(function(src) {
        return '<img src="' + escapeAttribute(src) + '" alt="' + escapeAttribute(place.name + ' 的照片') + '">';
      }).join('') + '</div>' : ''
    ].join('');
  }

  function setActive(place, pointNode) {
    const projected = getDisplayPoint(place);

    document.querySelectorAll('.map-point').forEach(function(node) {
      node.classList.toggle('is-active', node === pointNode);
      node.setAttribute('aria-pressed', node === pointNode ? 'true' : 'false');
    });

    if (mapViewport) {
      mapViewport.dataset.active = place.id;
      focusMapOnPoint(projected);
    }

    renderPanel(place);
  }

  function focusMapOnPoint(point) {
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    const normalizedX = (point.x - centerX) / centerX;
    const normalizedY = (point.y - centerY) / centerY;
    const scale = 2.4;
    const shiftX = (centerX - point.x) * 0.56;
    const shiftY = (centerY - point.y) * 0.56;
    const originX = (point.x / bounds.width) * 100;
    const originY = (point.y / bounds.height) * 100;
    const tiltX = normalizedY * -2.4;
    const tiltY = normalizedX * 3.2;

    mapViewport.style.setProperty('--map-origin-x', originX.toFixed(2) + '%');
    mapViewport.style.setProperty('--map-origin-y', originY.toFixed(2) + '%');
    mapViewport.style.setProperty('--map-shift-x', shiftX.toFixed(1) + 'px');
    mapViewport.style.setProperty('--map-shift-y', shiftY.toFixed(1) + 'px');
    mapViewport.style.setProperty('--map-scale', scale.toFixed(2));
    mapViewport.style.setProperty('--map-tilt-x', tiltX.toFixed(2) + 'deg');
    mapViewport.style.setProperty('--map-tilt-y', tiltY.toFixed(2) + 'deg');

    if (mapStage) {
      mapStage.style.setProperty('--focus-x', originX.toFixed(2) + '%');
      mapStage.style.setProperty('--focus-y', originY.toFixed(2) + '%');
      mapStage.classList.add('is-focusing');
    }
  }

  function resetMapFocus() {
    document.querySelectorAll('.map-point').forEach(function(node) {
      node.classList.remove('is-active');
      node.setAttribute('aria-pressed', 'false');
    });

    if (mapViewport) {
      window.clearTimeout(resetOriginTimer);
      mapViewport.removeAttribute('data-active');
      mapViewport.style.setProperty('--map-shift-x', '0px');
      mapViewport.style.setProperty('--map-shift-y', '0px');
      mapViewport.style.setProperty('--map-scale', '1');
      mapViewport.style.setProperty('--map-tilt-x', '0deg');
      mapViewport.style.setProperty('--map-tilt-y', '0deg');
      resetOriginTimer = window.setTimeout(function() {
        mapViewport.classList.add('is-resetting-origin');
        mapViewport.style.setProperty('--map-origin-x', '50%');
        mapViewport.style.setProperty('--map-origin-y', '50%');
        window.requestAnimationFrame(function() {
          mapViewport.classList.remove('is-resetting-origin');
        });
      }, 820);
    }

    if (mapStage) {
      mapStage.classList.remove('is-focusing');
    }

    placePanel.classList.remove('is-active');
    if (mapShell) {
      mapShell.classList.remove('has-active-place');
    }
    renderEmptyPanel();
  }

  function renderEmptyPanel() {
    placePanel.innerHTML = '<p class="panel-kicker">选择一个地点</p><h3>足迹地图</h3><p>点击地图上的城市点位，查看照片和故事。</p>';
  }

  function renderPlaces(places) {
    mapPoints.innerHTML = '';

    places.forEach(function(place, index) {
      const projected = getDisplayPoint(place);
      const point = createSvgElement('g');
      const hitArea = createSvgElement('circle');
      const circle = createSvgElement('circle');
      const label = createSvgElement('text');
      const labelOffset = Array.isArray(place.labelOffset) ? place.labelOffset : [15, 5];

      point.classList.add('map-point');
      point.setAttribute('role', 'button');
      point.setAttribute('tabindex', '0');
      point.setAttribute('aria-label', '查看' + place.name + '的足迹');
      point.setAttribute('aria-pressed', 'false');
      point.setAttribute('transform', 'translate(' + projected.x.toFixed(1) + ' ' + projected.y.toFixed(1) + ')');

      hitArea.classList.add('map-point-hit');
      hitArea.setAttribute('r', '13');
      circle.setAttribute('r', '9');
      label.setAttribute('x', Number(labelOffset[0] || 15));
      label.setAttribute('y', Number(labelOffset[1] || 5));
      label.textContent = place.name;

      point.append(hitArea, circle, label);
      mapPoints.appendChild(point);

      point.addEventListener('click', function() {
        setActive(place, point);
      });

      point.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setActive(place, point);
        }
      });

    });

    placePanel.classList.remove('is-active');
    renderEmptyPanel();

    if (mapStage) {
      mapStage.addEventListener('click', function(event) {
        if (!event.target.closest('.map-point') && !event.target.closest('.place-panel')) {
          resetMapFocus();
        }
      });
    }

    if (fallbackList) {
      fallbackList.innerHTML = places.map(function(place) {
        return '<button type="button" data-place="' + escapeAttribute(place.id) + '">' + escapeHtml(place.name) + '</button>';
      }).join('');
    }
  }

  function showFallback(error) {
    placePanel.innerHTML = '<p class="panel-kicker">Map unavailable</p><h3>足迹暂时没有加载出来</h3><p>' + escapeHtml(error.message || '请稍后再试。') + '</p>';
  }

  Promise.all([
    fetch('assets/data/map/china-map.json?v=' + dataVersion).then(function(response) {
      if (!response.ok) {
        throw new Error('china-map.json 加载失败');
      }
      return response.json();
    }),
    fetch('assets/data/places.json?v=' + dataVersion).then(function(response) {
      if (!response.ok) {
        throw new Error('places.json 加载失败');
      }
      return response.json();
    })
  ])
    .then(function(results) {
      renderMapBase(results[0]);
      renderPlaces(results[1]);
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
