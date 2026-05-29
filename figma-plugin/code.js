// EducTrack — Plugin Figma v2
// Crée 17 frames (9 Desktop + 8 Mobile) + liens prototype

const DESKTOP_SCREENS = [
  { label: 'Desktop — 01 Dashboard',        w: 1440, h: 900, key: 'desktop-01-dashboard'      },
  { label: 'Desktop — 02 Présence',         w: 1440, h: 900, key: 'desktop-02-presence'       },
  { label: 'Desktop — 03 Apprenants',       w: 1440, h: 900, key: 'desktop-03-apprenants'     },
  { label: 'Desktop — 04 Formations',       w: 1440, h: 900, key: 'desktop-04-formations'     },
  { label: 'Desktop — 05 Formateurs',       w: 1440, h: 900, key: 'desktop-05-formateurs'     },
  { label: 'Desktop — 06 Statistiques',     w: 1440, h: 900, key: 'desktop-06-statistiques'   },
  { label: 'Desktop — 07 Paramètres',       w: 1440, h: 900, key: 'desktop-07-parametres'     },
  { label: 'Desktop — 08 Dashboard Dark',   w: 1440, h: 900, key: 'desktop-08-dashboard-dark' },
  { label: 'Desktop — 09 Espace Formateur', w: 1440, h: 900, key: 'desktop-09-trainer'        },
];

const MOBILE_SCREENS = [
  { label: 'Mobile — 01 Dashboard',         w: 390, h: 844, key: 'mobile-01-dashboard'     },
  { label: 'Mobile — 02 Présence',          w: 390, h: 844, key: 'mobile-02-presence'      },
  { label: 'Mobile — 03 Apprenants',        w: 390, h: 844, key: 'mobile-03-apprenants'    },
  { label: 'Mobile — 04 Formations',        w: 390, h: 844, key: 'mobile-04-formations'    },
  { label: 'Mobile — 05 Formateurs',        w: 390, h: 844, key: 'mobile-05-formateurs'    },
  { label: 'Mobile — 06 Statistiques',      w: 390, h: 844, key: 'mobile-06-statistiques'  },
  { label: 'Mobile — 07 Paramètres',        w: 390, h: 844, key: 'mobile-07-parametres'    },
  { label: 'Mobile — 08 Espace Formateur',  w: 390, h: 844, key: 'mobile-08-trainer'       },
];

// Liens prototype Desktop (navigation naturelle)
const DESKTOP_LINKS = [
  [0, 1], // Dashboard → Présence
  [0, 2], // Dashboard → Apprenants
  [0, 3], // Dashboard → Formations
  [1, 0], // Présence → Dashboard
  [2, 0], // Apprenants → Dashboard
  [3, 4], // Formations → Formateurs
  [3, 1], // Formations → Présence
  [4, 3], // Formateurs → Formations
  [4, 8], // Formateurs → Espace Formateur
  [5, 0], // Statistiques → Dashboard
  [6, 0], // Paramètres → Dashboard
];

// Liens prototype Mobile
const MOBILE_LINKS = [
  [0, 1], [0, 2], [0, 3],
  [1, 0], [2, 0],
  [3, 4], [3, 1],
  [4, 3], [4, 7],
  [5, 0], [6, 0],
];

figma.showUI(__html__, { width: 460, height: 540, title: 'EducTrack — Import Maquette v2' });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'create-frames') return;

  const { images } = msg;
  const page = figma.currentPage;
  page.name = 'EducTrack — Maquette v2';

  // Supprimer les anciens frames si re-run
  const oldFrames = page.children.filter(n =>
    n.name.startsWith('Desktop —') || n.name.startsWith('Mobile —')
  );
  oldFrames.forEach(f => f.remove());

  const transition = {
    type: 'SMART_ANIMATE',
    easing: { type: 'EASE_OUT' },
    duration: 0.25,
  };

  // ── Frames Desktop ──
  const dFrames = [];
  let xPos = 0;

  for (const screen of DESKTOP_SCREENS) {
    const frame = figma.createFrame();
    frame.name   = screen.label;
    frame.resize(screen.w, screen.h);
    frame.x = xPos;
    frame.y = 0;
    frame.clipsContent = true;

    const imgData = images[screen.key];
    if (imgData) {
      const img = figma.createImage(new Uint8Array(imgData));
      frame.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL', opacity: 1 }];
    } else {
      frame.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.99 } }];
    }

    page.appendChild(frame);
    dFrames.push(frame);
    xPos += screen.w + 60;
  }

  // ── Frames Mobile ──
  const mFrames = [];
  xPos = 0;

  for (const screen of MOBILE_SCREENS) {
    const frame = figma.createFrame();
    frame.name   = screen.label;
    frame.resize(screen.w, screen.h);
    frame.x = xPos;
    frame.y = 1000;
    frame.clipsContent = true;

    const imgData = images[screen.key];
    if (imgData) {
      const img = figma.createImage(new Uint8Array(imgData));
      frame.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL', opacity: 1 }];
    } else {
      frame.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.99 } }];
    }

    page.appendChild(frame);
    mFrames.push(frame);
    xPos += screen.w + 40;
  }

  // ── Liens Prototype Desktop ──
  for (const [from, to] of DESKTOP_LINKS) {
    if (!dFrames[from] || !dFrames[to]) continue;
    dFrames[from].reactions = [
      ...(dFrames[from].reactions || []),
      {
        action: {
          type: 'NODE',
          destinationId: dFrames[to].id,
          navigation: 'NAVIGATE',
          transition,
          preserveScrollPosition: false,
        },
        trigger: { type: 'ON_CLICK' },
      },
    ];
  }

  // ── Liens Prototype Mobile ──
  for (const [from, to] of MOBILE_LINKS) {
    if (!mFrames[from] || !mFrames[to]) continue;
    mFrames[from].reactions = [
      ...(mFrames[from].reactions || []),
      {
        action: {
          type: 'NODE',
          destinationId: mFrames[to].id,
          navigation: 'NAVIGATE',
          transition,
          preserveScrollPosition: false,
        },
        trigger: { type: 'ON_CLICK' },
      },
    ];
  }

  figma.viewport.scrollAndZoomIntoView([...dFrames, ...mFrames]);
  figma.notify(`✅ ${dFrames.length + mFrames.length} frames créés + ${DESKTOP_LINKS.length + MOBILE_LINKS.length} liens prototype !`, { timeout: 5000 });
  figma.closePlugin();
};
