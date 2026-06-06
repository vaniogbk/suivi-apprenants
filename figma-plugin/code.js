// EducTrack — Plugin Figma v3
// 21 frames : 11 Desktop + 10 Mobile + liens prototype

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
  { label: 'Desktop — 10 Inscription',      w: 1440, h: 900, key: 'desktop-11-inscription'    },
  { label: 'Desktop — 11 Super Admin',      w: 1440, h: 900, key: 'desktop-12-superadmin'     },
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
  { label: 'Mobile — 09 Connexion',         w: 390, h: 844, key: 'mobile-09-login'         },
  { label: 'Mobile — 10 Inscription',       w: 390, h: 844, key: 'mobile-10-inscription'   },
];

// Liens prototype Desktop
const DESKTOP_LINKS = [
  [0, 1],  // Dashboard → Présence
  [0, 2],  // Dashboard → Apprenants
  [0, 3],  // Dashboard → Formations
  [1, 0],  // Présence → Dashboard
  [2, 0],  // Apprenants → Dashboard
  [3, 4],  // Formations → Formateurs
  [3, 1],  // Formations → Présence
  [4, 3],  // Formateurs → Formations
  [4, 8],  // Formateurs → Espace Formateur
  [5, 0],  // Statistiques → Dashboard
];

// Liens prototype Mobile
const MOBILE_LINKS = [
  [8, 0],  // Login → Dashboard
  [9, 8],  // Inscription → Login
  [0, 1], [1, 0],
  [0, 2], [2, 0],
  [0, 3], [3, 4],
  [4, 3], [4, 7],
  [5, 0], [6, 8],
];

figma.showUI(__html__, { width: 480, height: 600, title: 'EducTrack — Import Maquette v3' });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'create-frames') return;

  const { images } = msg;
  const page = figma.currentPage;
  page.name = 'EducTrack — Maquette v3';

  const old = page.children.filter(n => n.name.startsWith('Desktop —') || n.name.startsWith('Mobile —'));
  old.forEach(f => f.remove());

  const transition = { type: 'SMART_ANIMATE', easing: { type: 'EASE_OUT' }, duration: 0.25 };

  const makeFrames = (screens, yOffset, gap) => {
    const frames = [];
    let x = 0;
    for (const s of screens) {
      const frame = figma.createFrame();
      frame.name = s.label;
      frame.resize(s.w, s.h);
      frame.x = x; frame.y = yOffset;
      frame.clipsContent = true;
      const img = images[s.key];
      if (img) {
        const fi = figma.createImage(new Uint8Array(img));
        frame.fills = [{ type: 'IMAGE', imageHash: fi.hash, scaleMode: 'FILL', opacity: 1 }];
      } else {
        frame.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.99 } }];
        // Label placeholder
        const txt = figma.createText();
        txt.characters = s.key;
        txt.fontSize = 18; txt.x = 20; txt.y = 20;
        frame.appendChild(txt);
      }
      page.appendChild(frame);
      frames.push(frame);
      x += s.w + gap;
    }
    return frames;
  };

  const dFrames = makeFrames(DESKTOP_SCREENS, 0, 60);
  const mFrames = makeFrames(MOBILE_SCREENS, 1040, 40);

  const addLinks = (frames, links) => {
    for (const [from, to] of links) {
      if (!frames[from] || !frames[to]) continue;
      frames[from].reactions = [
        ...(frames[from].reactions || []),
        { action: { type: 'NODE', destinationId: frames[to].id, navigation: 'NAVIGATE', transition, preserveScrollPosition: false }, trigger: { type: 'ON_CLICK' } },
      ];
    }
  };

  addLinks(dFrames, DESKTOP_LINKS);
  addLinks(mFrames, MOBILE_LINKS);

  figma.viewport.scrollAndZoomIntoView([...dFrames, ...mFrames]);
  figma.notify(`✅ ${dFrames.length + mFrames.length} frames importées avec ${DESKTOP_LINKS.length + MOBILE_LINKS.length} liens prototype !`, { timeout: 5000 });
  figma.closePlugin();
};
