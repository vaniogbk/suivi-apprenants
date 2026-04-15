// EducTrack — Plugin Figma
// Crée automatiquement 11 frames (6 Desktop + 5 Mobile) + liens prototype

const DESKTOP_SCREENS = [
  { label: 'Desktop — 01 Dashboard',       w: 1440, h: 900, key: 'desktop-01-dashboard'       },
  { label: 'Desktop — 02 Présence',        w: 1440, h: 900, key: 'desktop-02-presence'        },
  { label: 'Desktop — 03 Apprenants',      w: 1440, h: 900, key: 'desktop-03-apprenants'      },
  { label: 'Desktop — 04 Statistiques',    w: 1440, h: 900, key: 'desktop-04-statistiques'    },
  { label: 'Desktop — 05 Paramètres',      w: 1440, h: 900, key: 'desktop-05-parametres'      },
  { label: 'Desktop — 06 Dashboard Dark',  w: 1440, h: 900, key: 'desktop-06-dashboard-dark'  },
];

const MOBILE_SCREENS = [
  { label: 'Mobile — 01 Dashboard',        w: 390,  h: 844, key: 'mobile-01-dashboard'        },
  { label: 'Mobile — 02 Présence',         w: 390,  h: 844, key: 'mobile-02-presence'         },
  { label: 'Mobile — 03 Apprenants',       w: 390,  h: 844, key: 'mobile-03-apprenants'       },
  { label: 'Mobile — 04 Statistiques',     w: 390,  h: 844, key: 'mobile-04-statistiques'     },
  { label: 'Mobile — 05 Paramètres',       w: 390,  h: 844, key: 'mobile-05-parametres'       },
];

// Liens prototype Desktop (ordre de navigation naturel)
const DESKTOP_LINKS = [
  [0, 1], // Dashboard → Présence
  [1, 2], // Présence → Apprenants
  [2, 3], // Apprenants → Statistiques
  [3, 4], // Statistiques → Paramètres
  [4, 0], // Paramètres → Dashboard
  // Retours
  [1, 0], // Présence → Dashboard
  [2, 0], // Apprenants → Dashboard
  [3, 0], // Statistiques → Dashboard
];

// Liens prototype Mobile
const MOBILE_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
  [1, 0], [2, 0], [3, 0],
];

figma.showUI(__html__, { width: 420, height: 380, title: 'EducTrack — Import Maquette' });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'create-frames') return;

  const { images } = msg;
  const page = figma.currentPage;
  page.name = 'EducTrack — Maquette';

  // ── Supprimer les anciens frames EducTrack si re-run ──
  const oldFrames = page.children.filter(n => n.name.startsWith('Desktop —') || n.name.startsWith('Mobile —'));
  oldFrames.forEach(f => f.remove());

  const transition = {
    type: 'SMART_ANIMATE',
    easing: { type: 'EASE_OUT' },
    duration: 0.25,
  };

  // ── Créer les frames Desktop ──
  const dFrames = [];
  let xPos = 0;

  for (const screen of DESKTOP_SCREENS) {
    const frame = figma.createFrame();
    frame.name   = screen.label;
    frame.resize(screen.w, screen.h);
    frame.x = xPos;
    frame.y = 0;
    frame.cornerRadius = 0;
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

  // ── Créer les frames Mobile ──
  const mFrames = [];
  xPos = 0;
  const mYPos = 1000;

  for (const screen of MOBILE_SCREENS) {
    const frame = figma.createFrame();
    frame.name   = screen.label;
    frame.resize(screen.w, screen.h);
    frame.x = xPos;
    frame.y = mYPos;
    frame.cornerRadius = 0;
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

  // ── Zoom sur tous les frames ──
  figma.viewport.scrollAndZoomIntoView([...dFrames, ...mFrames]);

  figma.notify(`✅ ${dFrames.length + mFrames.length} frames créés + liens prototype !`, { timeout: 4000 });
  figma.closePlugin();
};
