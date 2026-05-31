(function() {
  const themeToggle = document.getElementById('themeToggle');
  const icon = themeToggle ? themeToggle.querySelector('i') : null;

  function setTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    if (icon) {
      icon.classList.toggle('fa-sun', isDark);
      icon.classList.toggle('fa-moon', !isDark);
    }

    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  if (themeToggle) {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme ? savedTheme === 'dark' : prefersDark);

    themeToggle.addEventListener('click', function() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(!isDark);
    });
  }

  const wechatButton = document.getElementById('wechatButton');
  const wechatModal = document.getElementById('wechatModal');
  const wechatCloseTargets = document.querySelectorAll('[data-close-wechat]');

  function setWechatModal(isOpen) {
    if (!wechatModal) return;

    wechatModal.classList.toggle('is-open', isOpen);
    wechatModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body.classList.toggle('modal-open', isOpen);
  }

  if (wechatButton && wechatModal) {
    wechatButton.addEventListener('click', function() {
      setWechatModal(true);
    });

    wechatCloseTargets.forEach(function(target) {
      target.addEventListener('click', function() {
        setWechatModal(false);
      });
    });

    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && wechatModal.classList.contains('is-open')) {
        setWechatModal(false);
      }
    });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section').forEach(function(el) {
      observer.observe(el);
    });

    window.setTimeout(function() {
      document.querySelectorAll('.section').forEach(function(el) {
        el.classList.add('visible');
      });
    }, 900);
  } else {
    document.querySelectorAll('.section').forEach(function(el) {
      el.classList.add('visible');
    });
  }
})();
