import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import Login from './Login';
import SignUp from './SignUp';
import kilaMinimalLogo from '../assets/img/KILA_Minimalistisch.png';
import craneGif from '../assets/gif/crane.gif';
import { useSection } from '../state/SectionContext';
import { useAuth } from '../auth/AuthContext';
import SectionPanel from '../components/SectionPanel';
import RoughNotation from '../components/RoughNotation';
import { BlockType, createContentBlock, listContentBlocks, updateContentBlock } from '../lib/contentBlocks';
import { createContentSection, listContentSections } from '../lib/contentSections';

type WaveConfig = {
  minY: number;
  maxY: number;
  segments?: number;
  width?: number;
  height?: number;
  fromTop?: boolean;
};

const createWavePath = ({
  minY,
  maxY,
  segments = 4,
  width = 1200,
  height = 160,
  fromTop = true
}: WaveConfig): string => {
  const step = width / segments;
  const points = Array.from({ length: segments + 1 }, (_, index) => ({
    x: Math.round(index * step),
    y: Math.round(minY + Math.random() * (maxY - minY))
  }));

  const startY = fromTop ? 0 : height;
  let d = `M0 ${startY} V${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const cpX = Math.round(current.x + (next.x - current.x) * 0.5);
    d += ` C ${cpX} ${current.y} ${cpX} ${next.y} ${next.x} ${next.y}`;
  }
  d += ` V${startY} H0 Z`;
  return d;
};

const createHeroWavePath = (): string =>
  createWavePath({ minY: 80, maxY: 170, segments: 5, width: 1200, height: 200, fromTop: false });

const createReleaseWavePath = (): string =>
  createWavePath({ minY: 35, maxY: 120, segments: 4, width: 1200, height: 160, fromTop: true });

const Home: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { activeSection } = useSection();
  const { user } = useAuth();
  const theme = useTheme();
  const [showScrollHint, setShowScrollHint] = React.useState(true);
  const [releaseDate, setReleaseDate] = React.useState('2026-07-19');
  const [releaseSectionId, setReleaseSectionId] = React.useState<string | null>(null);
  const [releaseBlockId, setReleaseBlockId] = React.useState<string | null>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = React.useState(false);
  const [releaseSaving, setReleaseSaving] = React.useState(false);
  const [releaseError, setReleaseError] = React.useState('');
  const showHero = activeSection === 'home';
  const showRelease = activeSection === 'home';
  const canEditRelease = user?.role === 'admin';
  const sectionBg = theme.palette.mode === 'dark' ? 'dark' : 'light';
  const [heroWavePath, setHeroWavePath] = React.useState(() => createHeroWavePath());
  const [releaseWavePath, setReleaseWavePath] = React.useState(() => createReleaseWavePath());

  React.useEffect(() => {
    let active = true;
    const loadRelease = async () => {
      try {
        const sections = await listContentSections('home-release');
        if (!active) {
          return;
        }
        const releaseSection = sections[0];
        if (!releaseSection) {
          setReleaseSectionId(null);
          setReleaseBlockId(null);
          return;
        }
        setReleaseSectionId(releaseSection.id);
        const data = await listContentBlocks(releaseSection.id);
        if (!active) {
          return;
        }
        const releaseBlock = data[0];
        if (releaseBlock?.content) {
          setReleaseBlockId(releaseBlock.id);
          setReleaseDate(releaseBlock.content);
        } else {
          setReleaseBlockId(null);
        }
      } catch {
        if (active) {
          setReleaseError('Datum konnte nicht geladen werden.');
        }
      }
    };
    loadRelease();
    return () => {
      active = false;
    };
  }, []);

  const formattedRelease = React.useMemo(() => {
    const date = new Date(releaseDate);
    if (Number.isNaN(date.getTime())) {
      return { year: '2026', label: 'Am 19. Juli 2026' };
    }
    const year = date.getFullYear().toString();
    const dateLabel = new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
    return { year, label: `Am ${dateLabel}` };
  }, [releaseDate]);

  const handleReleaseSave = async () => {
    if (!user) {
      return;
    }
    setReleaseSaving(true);
    setReleaseError('');
    try {
      let sectionId = releaseSectionId;
      if (!sectionId) {
        const createdSection = await createContentSection({
          pageSectionId: 'home-release',
          title: 'KILA 2026',
          ownerId: user.id,
          ownerName: user.name
        });
        sectionId = createdSection.id;
        setReleaseSectionId(sectionId);
      }
      if (releaseBlockId) {
        await updateContentBlock(releaseBlockId, { content: releaseDate });
      } else {
        const created = await createContentBlock({
          sectionId,
          type: 'text',
          content: releaseDate,
          imageUrl: null,
          width: 12,
          orderIndex: 1
        });
        setReleaseBlockId(created.id);
      }
      setReleaseDialogOpen(false);
    } catch {
      setReleaseError('Datum konnte nicht gespeichert werden.');
    } finally {
      setReleaseSaving(false);
    }
  };

  React.useEffect(() => {
    const container = document.getElementById('main-scroll');
    if (!container) {
      return;
    }
    if (!showHero) {
      setShowScrollHint(false);
      return;
    }
    const handleScroll = () => {
      setShowScrollHint(container.scrollTop < 40);
    };
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [showHero]);

  React.useEffect(() => {
    const pathTargets: Record<string, string> = {
      '/lager': 'home-camp',
      '/termine': 'home-dates',
      '/lager-aktuell': 'home-campyear-reports',
      '/lager-aktuell/berichte': 'home-campyear-reports',
      '/lager-aktuell/bilder': 'home-campyear-photos',
      '/team': 'home-team-leitung',
      '/team/leitung': 'home-team-leitung',
      '/team/betreuer': 'home-team-betreuer',
      '/team/kochteam': 'home-team-kochteam',
      '/team/qualifikation': 'home-team-qualifikation',
      '/downloads': 'home-downloads-packliste',
      '/downloads/packliste': 'home-downloads-packliste',
      '/downloads/einverstaendnis': 'home-downloads-consents',
      '/downloads/elterninfos': 'home-downloads-parents',
      '/downloads/notfall': 'home-downloads-emergency',
      '/galerie': 'home-gallery-current',
      '/galerie/aktuell': 'home-gallery-current',
      '/galerie/vergangene': 'home-gallery-past',
      '/das-lager': 'home-camp-expect',
      '/das-lager/was-erwartet': 'home-camp-expect',
      '/das-lager/tagesablauf': 'home-camp-schedule',
      '/das-lager/spiele': 'home-camp-games',
      '/das-lager/unterkunft': 'home-camp-location',
      '/anmeldung': 'home-login',
      '/anmeldung/login': 'home-login',
      '/anmeldung/signup': 'home-signup'
    };

    const storedTarget = sessionStorage.getItem('kila_scroll_target');
    const target = storedTarget || pathTargets[location.pathname];
    if (!target) {
      return;
    }
    if (storedTarget) {
      sessionStorage.removeItem('kila_scroll_target');
    }
    setTimeout(() => {
      const element = document.getElementById(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, [location.pathname]);

  React.useEffect(() => {
    const container = document.getElementById('main-scroll');
    if (!container) {
      return;
    }
    const updateFade = () => {
      const containerRect = container.getBoundingClientRect();
      const viewportTop = container.scrollTop;
      const fadeStart = viewportTop + 120;
      const fadeEnd = viewportTop - 120;
      const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-fade]'));
      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top - containerRect.top + container.scrollTop;
        let opacity = 1;
        if (elementTop < fadeStart) {
          opacity = Math.max(0, Math.min(1, (elementTop - fadeEnd) / (fadeStart - fadeEnd)));
        }
        element.style.setProperty('--fade-opacity', opacity.toFixed(3));
      });
    };
    updateFade();
    container.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', updateFade);
    return () => {
      container.removeEventListener('scroll', updateFade);
      window.removeEventListener('resize', updateFade);
    };
  }, [showHero, showRelease]);

  type SectionConfig = {
    id: string;
    titleKey: string;
    bodyKey?: string;
    allowedBlockTypes?: BlockType[];
  };

  const sectionGroups: Record<string, SectionConfig[]> = {
    home: [
      { id: 'home-camp', titleKey: 'menu.home.camp', bodyKey: undefined },
      { id: 'home-dates', titleKey: 'menu.home.dates', bodyKey: undefined, allowedBlockTypes: ['event'] }
    ],
    campYear: [
      { id: 'home-campyear-reports', titleKey: 'menu.campYear.reports', bodyKey: undefined },
      { id: 'home-campyear-photos', titleKey: 'menu.campYear.photos', bodyKey: undefined }
    ],
    team: [
      { id: 'home-team-leitung', titleKey: 'menu.team.leadership', bodyKey: undefined },
      { id: 'home-team-betreuer', titleKey: 'menu.team.caretakers', bodyKey: undefined },
      { id: 'home-team-kochteam', titleKey: 'menu.team.kitchen', bodyKey: undefined },
      { id: 'home-team-qualifikation', titleKey: 'menu.team.training', bodyKey: undefined }
    ],
    downloads: [
      { id: 'home-downloads-packliste', titleKey: 'menu.downloads.packlist', bodyKey: undefined, allowedBlockTypes: ['link'] },
      { id: 'home-downloads-consents', titleKey: 'menu.downloads.consents', bodyKey: undefined, allowedBlockTypes: ['link'] },
      { id: 'home-downloads-parents', titleKey: 'menu.downloads.parents', bodyKey: undefined, allowedBlockTypes: ['link'] },
      { id: 'home-downloads-emergency', titleKey: 'menu.downloads.emergency', bodyKey: undefined, allowedBlockTypes: ['link'] }
    ],
    gallery: [
      { id: 'home-gallery-current', titleKey: 'menu.gallery.current', bodyKey: undefined, allowedBlockTypes: ['gallery'] },
      { id: 'home-gallery-past', titleKey: 'menu.gallery.past', bodyKey: undefined, allowedBlockTypes: ['file', 'link'] }
    ],
    camp: [
      { id: 'home-camp-expect', titleKey: 'menu.camp.expect', bodyKey: undefined },
      { id: 'home-camp-schedule', titleKey: 'menu.camp.schedule', bodyKey: undefined },
      { id: 'home-camp-games', titleKey: 'menu.camp.games', bodyKey: undefined },
      { id: 'home-camp-location', titleKey: 'menu.camp.location', bodyKey: undefined }
    ]
  };

  const activeSections =
    activeSection === 'registration'
      ? []
      : sectionGroups[activeSection as keyof typeof sectionGroups] ?? sectionGroups.home;

  return (
    <Box>
      {showHero ? (
        <Box
          sx={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            bgcolor: '#0088ff',
            position: 'relative'
          }}
          id="home-hero"
          data-bg="blue"
        >
          <Box sx={{ textAlign: 'center', maxWidth: 680 }}>
            <Box
              data-fade
              sx={{
                opacity: 'var(--fade-opacity, 1)',
                transition: 'opacity 220ms ease'
              }}
            >
            <Box
              component="img"
              src={kilaMinimalLogo}
              alt="KILA Logo"
              sx={{
                width: { xs: 200, md: 320 },
                height: 'auto',
                mb: 3
              }}
            />
            <Typography
              sx={{
                mt: 2,
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: { xs: '1rem', md: '1.2rem' }
              }}
            >
              {t('home.welcomeMessage')}
            </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: 18, md: 28 },
              left: '50%',
              transform: showScrollHint ? 'translate(-50%, 0)' : 'translate(-50%, 8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.4,
              color: '#ffffff',
              pointerEvents: 'none',
              opacity: showScrollHint ? 1 : 0,
              transition: 'opacity 200ms ease, transform 200ms ease'
            }}
          >
            <Typography
              sx={{
                fontFamily: '"A Day In September", "Comic Sans MS", cursive',
                fontSize: { xs: '1rem', md: '1.2rem' }
              }}
            >
              {t('home.scrollMe')}
            </Typography>
            <Box
              component="svg"
              viewBox="0 0 60 70"
              sx={{
                width: 52,
                height: 'auto',
                mt: 0.4,
                '@keyframes scrollChevron': {
                  '0%': { opacity: 0, transform: 'translateY(-6px)' },
                  '40%': { opacity: 1 },
                  '100%': { opacity: 0, transform: 'translateY(10px)' }
                },
                '& .scroll-chevron': {
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: 3.2,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  animation: 'scrollChevron 1.6s ease-in-out infinite'
                },
                '& .scroll-chevron:nth-of-type(1)': { animationDelay: '0s' },
                '& .scroll-chevron:nth-of-type(2)': { animationDelay: '0.2s' },
                '& .scroll-chevron:nth-of-type(3)': { animationDelay: '0.4s' }
              }}
            >
              <path className="scroll-chevron" d="M10 12 L30 32 L50 12" />
              <path className="scroll-chevron" d="M10 28 L30 48 L50 28" />
              <path className="scroll-chevron" d="M10 44 L30 64 L50 44" />
            </Box>
          </Box>
        </Box>
      ) : null}

      {showHero && showRelease ? (
        <Box
          aria-hidden
          sx={{
            bgcolor: '#0088ff',
            height: { xs: 120, md: 170 },
            lineHeight: 0
          }}
        >
          <Box
            component="svg"
            viewBox="0 0 1200 200"
            preserveAspectRatio="none"
            sx={{ width: '100%', height: '100%', display: 'block' }}
          >
            <path d={heroWavePath} fill="#0f1017" />
          </Box>
        </Box>
      ) : null}

      {showRelease ? (
        <Box
          sx={{
            bgcolor: '#0f1017',
            color: '#ffffff',
            py: { xs: 8, md: 12 },
            px: 2,
            textAlign: 'center',
            position: 'relative'
          }}
          data-bg="dark"
        >
          <Box
            data-fade
            sx={{
              maxWidth: 900,
              mx: 'auto',
              opacity: 'var(--fade-opacity, 1)',
              transition: 'opacity 220ms ease'
            }}
          >
            {canEditRelease ? (
              <IconButton
                onClick={() => setReleaseDialogOpen(true)}
                sx={{ position: 'absolute', top: 12, right: 12, color: '#ffffff' }}
                aria-label="Datum bearbeiten"
              >
                <EditIcon />
              </IconButton>
            ) : null}
            <Typography
              sx={{
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 700,
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                color: 'rgba(255,255,255,0.75)',
                mb: 2
              }}
            >
              KILA {formattedRelease.year}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '2.2rem', sm: '3rem', md: '4.4rem' },
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: 'linear-gradient(120deg, #ff5fa2 0%, #ffb36b 100%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}
            >
              <RoughNotation
                type="circle"
                show
                color="#ff3b3b"
                strokeWidth={3.5}
                padding={[6, 16, 8, 16]}
                iterations={2}
                animationDuration={1800}
              >
                <span style={{ display: 'inline-block', padding: '6px 4px' }}>
                  {formattedRelease.label}
                </span>
              </RoughNotation>
            </Typography>
          </Box>
        </Box>
      ) : null}

      {showRelease ? (
        <Box
          aria-hidden
          sx={{
            bgcolor: theme.palette.background.default,
            height: { xs: 120, md: 160 },
            lineHeight: 0
          }}
          data-bg={sectionBg}
        >
          <Box
            component="svg"
            viewBox="0 0 1200 160"
            preserveAspectRatio="none"
            sx={{ width: '100%', height: '100%', display: 'block' }}
          >
            <path d={releaseWavePath} fill="#0f1017" />
          </Box>
        </Box>
      ) : null}

      {activeSections.map((section) => {
        return (
          <Box
            key={section.id}
            id={section.id}
            sx={{
              bgcolor: theme.palette.background.default,
              color: theme.palette.text.primary,
              py: { xs: 6, md: 10 },
              px: 2,
              scrollMarginTop: '90px'
            }}
            data-bg={sectionBg}
          >
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
              <SectionPanel
                pageSectionId={section.id}
                titleKey={section.titleKey}
                bodyKey={section.bodyKey}
                placeholderBodyKey="home.sections.placeholder.body"
                placeholderIconSrc={craneGif}
                showPlaceholder
                allowedBlockTypes={section.allowedBlockTypes}
              />
            </Box>
          </Box>
        );
      })}

      {activeSection === 'registration' ? (
        <>
          <Box
            id="home-login"
            sx={{
              bgcolor: theme.palette.background.default,
              color: theme.palette.text.primary,
              py: { xs: 6, md: 10 },
              px: 2,
              scrollMarginTop: '90px'
            }}
            data-bg={sectionBg}
          >
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
              <Typography variant="h3" sx={{ color: '#0088ff', fontWeight: 700, mb: 2 }}>
                {t('menu.registration.login')}
              </Typography>
              <Login embedded />
            </Box>
          </Box>

          <Box
            id="home-signup"
            sx={{
              bgcolor: theme.palette.background.default,
              color: theme.palette.text.primary,
              py: { xs: 6, md: 10 },
              px: 2,
              scrollMarginTop: '90px'
            }}
            data-bg={sectionBg}
          >
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
              <Typography variant="h3" sx={{ color: '#0088ff', fontWeight: 700, mb: 2 }}>
                {t('menu.registration.signup')}
              </Typography>
              <SignUp embedded />
            </Box>
          </Box>
        </>
      ) : null}

      <Dialog open={releaseDialogOpen} onClose={() => setReleaseDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Datum bearbeiten</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Datum"
            type="date"
            value={releaseDate}
            onChange={(event) => setReleaseDate(event.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          {releaseError ? (
            <Typography color="error" sx={{ mt: 2 }}>
              {releaseError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReleaseDialogOpen(false)} disabled={releaseSaving}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={handleReleaseSave} disabled={releaseSaving}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Home;
