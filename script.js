const root = document.documentElement;
const pointer = { currentX: 0, currentY: 0, targetX: 0, targetY: 0 };
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const setActiveNav = (id) => {
  document.querySelectorAll(".top-nav a").forEach((link) => {
    const isActive = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("is-active", isActive);
  });
};

const activatePublication = (card) => {
  const image = document.querySelector("[data-spotlight-image]");
  const year = document.querySelector("[data-spotlight-year]");
  const venue = document.querySelector("[data-spotlight-venue]");
  const title = document.querySelector("[data-spotlight-title]");
  const summary = document.querySelector("[data-spotlight-summary]");
  const tags = document.querySelector("[data-spotlight-tags]");

  document.querySelectorAll(".pub-card").forEach((item) => item.classList.remove("is-active"));
  card.classList.add("is-active");

  image.style.opacity = "0.25";
  window.clearTimeout(activatePublication.timer);
  activatePublication.timer = window.setTimeout(() => {
    image.src = card.dataset.image;
    image.alt = `Concrete research backdrop paired with ${card.dataset.title || "selected work"}.`;
    year.textContent = card.dataset.year;
    venue.textContent = card.dataset.venue;
    title.textContent = card.dataset.title;
    summary.textContent = card.dataset.summary;
    tags.innerHTML = "";

    (card.dataset.tags || "")
      .split("|")
      .filter(Boolean)
      .forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "tag";
        chip.textContent = tag;
        tags.appendChild(chip);
      });

    image.style.opacity = "1";
  }, prefersReducedMotion ? 0 : 120);
};

const animateMetric = (metric) => {
  const value = metric.querySelector(".metric-value");
  const total = Number(metric.dataset.count || 0);
  const suffix = metric.dataset.suffix ?? "";

  if (!value) {
    return;
  }

  if (prefersReducedMotion) {
    value.textContent = `${total}${suffix}`;
    return;
  }

  const duration = 900;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    value.textContent = `${Math.round(total * eased)}${suffix}`;

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    }
  };

  window.requestAnimationFrame(tick);
};

const setupRevealObserver = () => {
  const revealables = document.querySelectorAll("[data-reveal]");
  if (!revealables.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealables.forEach((element) => observer.observe(element));
};

const setupMetricObserver = () => {
  const metrics = document.querySelectorAll(".metric[data-count]");
  if (!metrics.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateMetric(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.7 }
  );

  metrics.forEach((metric) => observer.observe(metric));
};

const setupSectionObserver = () => {
  const links = Array.from(document.querySelectorAll(".top-nav a"));
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!sections.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveNav(entry.target.id);
        }
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
};

const setupPointerMotion = () => {
  if (prefersReducedMotion) {
    return;
  }

  window.addEventListener("pointermove", (event) => {
    pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
  });

  window.addEventListener("pointerleave", () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  });

  const update = () => {
    pointer.currentX += (pointer.targetX - pointer.currentX) * 0.08;
    pointer.currentY += (pointer.targetY - pointer.currentY) * 0.08;

    root.style.setProperty("--tilt-x", pointer.currentX.toFixed(3));
    root.style.setProperty("--tilt-y", pointer.currentY.toFixed(3));
    window.requestAnimationFrame(update);
  };

  window.requestAnimationFrame(update);
};

const setupPublicationSwitcher = () => {
  const cards = document.querySelectorAll(".pub-card");
  if (!cards.length) {
    return;
  }

  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => activatePublication(card));
    card.addEventListener("focus", () => activatePublication(card));
    card.addEventListener("click", () => activatePublication(card));
  });

  activatePublication(cards[0]);
};

const setupMotionField = () => {
  const canvas = document.querySelector(".motion-field");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (time = 0) => {
    const seconds = time * 0.001;
    context.clearRect(0, 0, width, height);

    const horizon = height * (0.18 + (pointer.currentY + 1) * 0.05);
    const vanishingX = width * (0.5 + pointer.currentX * 0.18);

    const floorGradient = context.createLinearGradient(0, horizon, 0, height);
    floorGradient.addColorStop(0, "rgba(255, 255, 255, 0.02)");
    floorGradient.addColorStop(1, "rgba(16, 16, 16, 0.08)");
    context.fillStyle = floorGradient;
    context.fillRect(0, horizon, width, height - horizon);

    context.strokeStyle = "rgba(16, 16, 16, 0.15)";
    context.lineWidth = 1;

    for (let row = 0; row < 22; row += 1) {
      const ratio = row / 21;
      const y = horizon + Math.pow(ratio, 2.15) * (height - horizon + 220);
      context.beginPath();
      context.moveTo(-60, y);
      context.lineTo(width + 60, y);
      context.stroke();
    }

    for (let column = -12; column <= 12; column += 1) {
      const spread = column / 12;
      const startX = width / 2 + spread * width * 0.82;
      context.beginPath();
      context.moveTo(startX, height + 140);
      context.lineTo(vanishingX, horizon);
      context.stroke();
    }

    context.strokeStyle = "rgba(239, 106, 26, 0.5)";
    context.lineWidth = 2;
    const pulseX = width * (0.24 + (pointer.currentX + 1) * 0.16);
    const pulseY = horizon + 140 + Math.sin(seconds * 0.7) * 24;
    context.beginPath();
    context.ellipse(pulseX, pulseY, 72, 24, seconds * 0.22, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.moveTo(pulseX - 140, pulseY);
    context.lineTo(pulseX + 140, pulseY);
    context.stroke();

    context.strokeStyle = "rgba(255, 255, 255, 0.18)";
    context.lineWidth = 1;
    for (let wave = 0; wave < 3; wave += 1) {
      const offset = wave * 36;
      context.beginPath();
      for (let x = -40; x <= width + 40; x += 18) {
        const y = horizon - 62 + offset + Math.sin(seconds * 0.8 + x * 0.011 + wave) * 8;
        if (x === -40) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.stroke();
    }

    if (!prefersReducedMotion) {
      window.requestAnimationFrame(draw);
    }
  };

  resize();
  draw();
  window.addEventListener("resize", resize);
};

setupRevealObserver();
setupMetricObserver();
setupSectionObserver();
setupPointerMotion();
setupPublicationSwitcher();
setupMotionField();
