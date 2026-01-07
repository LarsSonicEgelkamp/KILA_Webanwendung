import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Login from './Login';
import SignUp from './SignUp';
import UserManagement from './UserManagement';
import kilaMinimalLogo from '../assets/img/KILA_Minimalistisch.png';
import craneGif from '../assets/gif/crane.gif';
import { useSection } from '../state/SectionContext';
import { useAuth } from '../auth/AuthContext';
import ContentBlocks from '../components/ContentBlocks';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { activeSection } = useSection();
  const { user } = useAuth();
  const [showScrollHint, setShowScrollHint] = React.useState(true);
  const [editingSections, setEditingSections] = React.useState<Record<string, boolean>>({});
  const showHero = activeSection === 'home';
  const canEdit = user?.role === 'admin' || user?.role === 'leitung';

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
    const target = sessionStorage.getItem('kila_scroll_target');
    if (!target) {
      return;
    }
    sessionStorage.removeItem('kila_scroll_target');
    setTimeout(() => {
      const element = document.getElementById(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, []);

  const sectionGroups = {
    home: [
      { id: 'home-camp', titleKey: 'menu.home.camp', bodyKey: 'home.sections.camp.body' },
      { id: 'home-dates', titleKey: 'menu.home.dates', bodyKey: 'home.sections.dates.body' }
    ],
    team: [
      { id: 'home-team-leitung', titleKey: 'menu.team.leadership', bodyKey: undefined },
      { id: 'home-team-betreuer', titleKey: 'menu.team.caretakers', bodyKey: undefined },
      { id: 'home-team-kochteam', titleKey: 'menu.team.kitchen', bodyKey: undefined },
      { id: 'home-team-qualifikation', titleKey: 'menu.team.training', bodyKey: undefined }
    ],
    downloads: [
      { id: 'home-downloads-packliste', titleKey: 'menu.downloads.packlist', bodyKey: undefined },
      { id: 'home-downloads-consents', titleKey: 'menu.downloads.consents', bodyKey: undefined },
      { id: 'home-downloads-parents', titleKey: 'menu.downloads.parents', bodyKey: undefined },
      { id: 'home-downloads-emergency', titleKey: 'menu.downloads.emergency', bodyKey: undefined }
    ],
    gallery: [
      { id: 'home-gallery-current', titleKey: 'menu.gallery.current', bodyKey: undefined },
      { id: 'home-gallery-past', titleKey: 'menu.gallery.past', bodyKey: undefined }
    ],
    camp: [
      { id: 'home-camp-expect', titleKey: 'menu.camp.expect', bodyKey: undefined },
      { id: 'home-camp-schedule', titleKey: 'menu.camp.schedule', bodyKey: undefined },
      { id: 'home-camp-games', titleKey: 'menu.camp.games', bodyKey: undefined },
      { id: 'home-camp-location', titleKey: 'menu.camp.location', bodyKey: undefined }
    ]
  } as const;

  const activeSections =
    activeSection === 'registration'
      ? []
      : sectionGroups[activeSection as keyof typeof sectionGroups] ?? sectionGroups.home;

  const toggleEditing = (sectionId: string) => {
    setEditingSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <Box>
      {showHero ? (
        <Box
          sx={{
            minHeight: '100vh',
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

      {activeSections.map((section) => {
        const isPlaceholder = !section.bodyKey;
        return (
          <Box
            key={section.id}
            id={section.id}
            sx={{
              bgcolor: '#ffffff',
              color: '#111111',
              py: { xs: 6, md: 10 },
              px: 2,
              scrollMarginTop: '90px'
            }}
            data-bg="light"
          >
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                  mb: 2
                }}
              >
                <Typography variant="h3" sx={{ color: '#0088ff', fontWeight: 700 }}>
                  {t(section.titleKey)}
                </Typography>
                {canEdit ? (
                  <Button
                    variant={editingSections[section.id] ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => toggleEditing(section.id)}
                  >
                    {editingSections[section.id] ? 'Editor schliessen' : 'Bearbeiten'}
                  </Button>
                ) : null}
              </Box>
              {isPlaceholder ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    color: '#0b57d0'
                  }}
                >
                  <Box
                    component="img"
                    src={craneGif}
                    alt="Kran"
                    sx={{ width: 42, height: 42, objectFit: 'contain' }}
                  />
                  <Typography sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}>
                    {t('home.sections.placeholder.body')}
                  </Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}>
                  {t(section.bodyKey)}
                </Typography>
              )}
              <ContentBlocks
                sectionId={section.id}
                canEdit={canEdit}
                editing={Boolean(editingSections[section.id])}
              />
            </Box>
          </Box>
        );
      })}

      {activeSection === 'registration' ? (
        <>
          <Box
            id="home-login"
            sx={{ bgcolor: '#ffffff', color: '#111111', py: { xs: 6, md: 10 }, px: 2, scrollMarginTop: '90px' }}
            data-bg="light"
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
            sx={{ bgcolor: '#ffffff', color: '#111111', py: { xs: 6, md: 10 }, px: 2, scrollMarginTop: '90px' }}
            data-bg="light"
          >
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
              <Typography variant="h3" sx={{ color: '#0088ff', fontWeight: 700, mb: 2 }}>
                {t('menu.registration.signup')}
              </Typography>
              <SignUp embedded />
            </Box>
          </Box>

          <Box
            id="home-user-management"
            sx={{ bgcolor: '#ffffff', color: '#111111', py: { xs: 6, md: 10 }, px: 2, scrollMarginTop: '90px' }}
            data-bg="light"
          >
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
              <UserManagement />
            </Box>
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export default Home;
