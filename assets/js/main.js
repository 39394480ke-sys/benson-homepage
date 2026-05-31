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

  const contactModals = document.querySelectorAll('.wechat-modal');

  function setContactModal(modal, isOpen) {
    if (!modal) return;

    modal.classList.toggle('is-open', isOpen);
    modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body.classList.toggle('modal-open', Boolean(document.querySelector('.wechat-modal.is-open')));
  }

  function setupContactModal(buttonId, modalId) {
    const button = document.getElementById(buttonId);
    const modal = document.getElementById(modalId);

    if (!button || !modal) return;

    button.addEventListener('click', function() {
      contactModals.forEach(function(item) {
        setContactModal(item, false);
      });
      setContactModal(modal, true);
    });

    modal.querySelectorAll('[data-close-modal]').forEach(function(target) {
      target.addEventListener('click', function() {
        setContactModal(modal, false);
      });
    });
  }

  setupContactModal('wechatButton', 'wechatModal');
  setupContactModal('xiaohongshuButton', 'xiaohongshuModal');

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      contactModals.forEach(function(modal) {
        setContactModal(modal, false);
      });
    }
  });

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
