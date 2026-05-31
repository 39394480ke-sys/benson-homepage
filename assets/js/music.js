(function() {
  const albumFrame = document.getElementById('albumFrame');
  const albumDeck = document.getElementById('albumDeck');
  const title = document.getElementById('trackTitle');
  const artist = document.getElementById('trackArtist');
  const album = document.getElementById('trackAlbum');
  const listenLink = document.getElementById('listenLink');
  const prevButton = document.getElementById('prevTrack');
  const nextButton = document.getElementById('nextTrack');
  const projectList = document.getElementById('projectList');

  let tracks = [];
  let activeTrack = 0;
  let shiftTimer = null;
  let hasBuiltOrbit = false;

  function renderTrack(index) {
    if (!tracks.length) {
      return;
    }

    const nextTrack = (index + tracks.length) % tracks.length;
    const direction = getSlideDirection(activeTrack, nextTrack, tracks.length);
    activeTrack = nextTrack;
    const track = tracks[activeTrack];

    renderAlbumOrbit(direction);
    title.textContent = track.title;
    artist.textContent = track.artist || '未知歌手';
    album.textContent = track.album ? '专辑：' + track.album : '';
    listenLink.href = track.url || '#';
  }

  function renderPlaylist(data) {
    tracks = Array.isArray(data.tracks) ? data.tracks : [];

    if (!tracks.length) {
      title.textContent = '歌单还没有歌曲';
      artist.textContent = '把网易云歌单链接配置到脚本后，这里会自动出现。';
      return;
    }

    renderTrack(0);
  }

  function renderAlbumOrbit(direction) {
    if (!albumDeck || !tracks.length) {
      return;
    }

    if (!hasBuiltOrbit) {
      buildAlbumOrbit();
    }

    albumDeck.classList.remove('is-shifting-next', 'is-shifting-prev');

    if (direction === 'next' || direction === 'prev') {
      albumDeck.classList.add(direction === 'next' ? 'is-shifting-next' : 'is-shifting-prev');
      window.clearTimeout(shiftTimer);
      shiftTimer = window.setTimeout(function() {
        albumDeck.classList.remove('is-shifting-next', 'is-shifting-prev');
      }, 760);
    }

    albumDeck.querySelectorAll('.album-card').forEach(function(card) {
      const index = Number(card.dataset.trackIndex);
      const offset = getShortestOffset(index, activeTrack, tracks.length);
      const visible = Math.abs(offset) <= 3;

      card.classList.toggle('is-active', offset === 0);
      card.classList.toggle('is-hidden', !visible);
      card.style.cssText = getAlbumCardStyle(visible ? offset : 99);
    });
  }

  function buildAlbumOrbit() {
    albumDeck.innerHTML = '';

    tracks.forEach(function(track, index) {
      const card = document.createElement('button');
      const image = document.createElement('img');

      card.type = 'button';
      card.className = 'album-card';
      card.dataset.trackIndex = String(index);
      card.setAttribute('aria-label', '选择 ' + track.title);
      image.src = track.cover || 'assets/img/gallery/music-placeholder.svg';
      image.alt = track.title + ' 的专辑封面';
      card.appendChild(image);
      albumDeck.appendChild(card);

      card.addEventListener('click', function() {
        if (index !== activeTrack) {
          renderTrack(index);
        }
      });
    });

    hasBuiltOrbit = true;
  }

  function getAlbumCardStyle(offset) {
    const layouts = {
      '-3': { x: -205, y: -4, z: -190, ry: 72, scale: 0.44, opacity: 0.38, blur: 1.1, zIndex: 1 },
      '-2': { x: -150, y: -2, z: -135, ry: 64, scale: 0.56, opacity: 0.56, blur: 0.7, zIndex: 2 },
      '-1': { x: -86, y: 0, z: -70, ry: 52, scale: 0.72, opacity: 0.78, blur: 0.2, zIndex: 3 },
      '0': { x: 0, y: 0, z: 72, ry: 0, scale: 1, opacity: 1, blur: 0, zIndex: 8 },
      '1': { x: 86, y: 0, z: -70, ry: -52, scale: 0.72, opacity: 0.78, blur: 0.2, zIndex: 3 },
      '2': { x: 150, y: -2, z: -135, ry: -64, scale: 0.56, opacity: 0.56, blur: 0.7, zIndex: 2 },
      '3': { x: 205, y: -4, z: -190, ry: -72, scale: 0.44, opacity: 0.38, blur: 1.1, zIndex: 1 }
    };
    const hidden = { x: 0, y: 18, z: -260, ry: 0, scale: 0.36, opacity: 0, blur: 1.2, zIndex: 0 };
    const item = layouts[String(offset)] || hidden;

    return [
      'position: absolute;',
      'left: 50%;',
      'top: 50%;',
      'width: 190px;',
      'aspect-ratio: 1;',
      'border: 0;',
      'padding: 0;',
      'border-radius: 8px;',
      'overflow: hidden;',
      'background: var(--luka-soft);',
      'box-shadow: 0 18px 34px var(--luka-shadow);',
      'transition: transform 0.72s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.46s ease, filter 0.46s ease;',
      'will-change: transform, opacity, filter;',
      'transform: translate(-50%, -50%) translate3d(' + item.x + 'px, ' + item.y + 'px, ' + item.z + 'px) rotateY(' + item.ry + 'deg) scale(' + item.scale + ');',
      'opacity: ' + item.opacity + ';',
      'z-index: ' + item.zIndex + ';',
      'filter: blur(' + item.blur + 'px) saturate(' + (offset === 0 ? 1 : 0.82) + ') brightness(' + (offset === 0 ? 1 : 0.92) + ');',
      'pointer-events: ' + (Math.abs(offset) <= 3 ? 'auto' : 'none') + ';'
    ].join(' ');
  }

  function getShortestOffset(index, active, total) {
    let offset = index - active;
    const half = total / 2;

    if (offset > half) {
      offset -= total;
    } else if (offset < -half) {
      offset += total;
    }

    return offset;
  }

  function getSlideDirection(from, to, total) {
    if (from === to) {
      return 'none';
    }

    return getShortestOffset(to, from, total) > 0 ? 'next' : 'prev';
  }

  function wireMusicControls() {
    if (prevButton) {
      prevButton.addEventListener('click', function() {
        renderTrack(activeTrack - 1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function() {
        renderTrack(activeTrack + 1);
      });
    }

  }

  function renderProjects(projects) {
    if (!projectList) {
      return;
    }

    if (!Array.isArray(projects) || !projects.length) {
      projectList.innerHTML = '<p>项目还在整理中。</p>';
      return;
    }

    projectList.innerHTML = projects.map(function(project) {
      const links = Array.isArray(project.links) ? project.links : [];

      return [
        '<article class="project-item">',
        '<img class="project-thumb" src="' + escapeAttribute(project.image || 'assets/img/projects/project-1.svg') + '" alt="' + escapeAttribute(project.title || '项目图片') + '">',
        '<div class="project-copy">',
        '<p class="project-period">' + escapeHtml(project.period || '') + '</p>',
        '<h3>' + escapeHtml(project.title || '未命名项目') + '</h3>',
        '<p>' + escapeHtml(project.summary || '') + '</p>',
        project.growth ? '<p class="project-growth"><strong>成长：</strong>' + escapeHtml(project.growth) + '</p>' : '',
        links.length ? '<div class="project-links">' + links.map(function(link) {
          return '<a href="' + escapeAttribute(link.url || '#') + '" target="_blank" rel="noopener">' + escapeHtml(link.label || 'Link') + '</a>';
        }).join('') + '</div>' : '',
        '</div>',
        '</article>'
      ].join('');
    }).join('');
  }

  wireMusicControls();

  fetch('assets/data/playlist.json?v=' + Date.now())
    .then(function(response) {
      if (!response.ok) {
        throw new Error('playlist.json 加载失败');
      }
      return response.json();
    })
    .then(renderPlaylist)
    .catch(function(error) {
      title.textContent = '歌单暂时没有加载出来';
      artist.textContent = error.message || '请稍后再试。';
    });

  fetch('assets/data/projects.json')
    .then(function(response) {
      if (!response.ok) {
        throw new Error('projects.json 加载失败');
      }
      return response.json();
    })
    .then(renderProjects)
    .catch(function() {
      if (projectList) {
        projectList.innerHTML = '<p>项目数据暂时没有加载出来。</p>';
      }
    });

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
