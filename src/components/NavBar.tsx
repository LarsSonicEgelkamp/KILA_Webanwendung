import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Drawer, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SectionId, useSection } from '../state/SectionContext';

type NavBarProps = {
  open: boolean;
  width?: number | string;
  onNavigate?: () => void;
};

type SectionItem = {
  key: string;
  path: string;
  scrollId: string;
};

type Section = {
  id: string;
  labelKey: string;
  basePath: string;
  items: SectionItem[];
};

const buildSections = (): Section[] => [
  {
    id: 'home',
    labelKey: 'menu.home.label',
    basePath: '/',
    items: [
      { key: 'menu.home.welcome', path: '/', scrollId: 'home-hero' },
      { key: 'menu.home.camp', path: '/lager', scrollId: 'home-camp' },
      { key: 'menu.home.dates', path: '/termine', scrollId: 'home-dates' }
    ]
  },
  {
    id: 'campYear',
    labelKey: 'menu.campYear.label',
    basePath: '/lager-aktuell',
    items: [
      { key: 'menu.campYear.reports', path: '/lager-aktuell/berichte', scrollId: 'home-campyear-reports' },
      { key: 'menu.campYear.photos', path: '/lager-aktuell/bilder', scrollId: 'home-campyear-photos' }
    ]
  },
  {
    id: 'team',
    labelKey: 'menu.team.label',
    basePath: '/team',
    items: [
      { key: 'menu.team.leadership', path: '/team/leitung', scrollId: 'home-team-leitung' },
      { key: 'menu.team.caretakers', path: '/team/betreuer', scrollId: 'home-team-betreuer' },
      { key: 'menu.team.kitchen', path: '/team/kochteam', scrollId: 'home-team-kochteam' },
      { key: 'menu.team.training', path: '/team/qualifikation', scrollId: 'home-team-qualifikation' }
    ]
  },
  {
    id: 'downloads',
    labelKey: 'menu.downloads.label',
    basePath: '/downloads',
    items: [
      { key: 'menu.downloads.packlist', path: '/downloads/packliste', scrollId: 'home-downloads-packliste' },
      { key: 'menu.downloads.consents', path: '/downloads/einverstaendnis', scrollId: 'home-downloads-consents' },
      { key: 'menu.downloads.parents', path: '/downloads/elterninfos', scrollId: 'home-downloads-parents' },
      { key: 'menu.downloads.emergency', path: '/downloads/notfall', scrollId: 'home-downloads-emergency' }
    ]
  },
  {
    id: 'gallery',
    labelKey: 'menu.gallery.label',
    basePath: '/galerie',
    items: [
      { key: 'menu.gallery.current', path: '/galerie/aktuell', scrollId: 'home-gallery-current' },
      { key: 'menu.gallery.past', path: '/galerie/vergangene', scrollId: 'home-gallery-past' }
    ]
  },
  {
    id: 'camp',
    labelKey: 'menu.camp.label',
    basePath: '/das-lager',
    items: [
      { key: 'menu.camp.expect', path: '/das-lager/was-erwartet', scrollId: 'home-camp-expect' },
      { key: 'menu.camp.schedule', path: '/das-lager/tagesablauf', scrollId: 'home-camp-schedule' },
      { key: 'menu.camp.games', path: '/das-lager/spiele', scrollId: 'home-camp-games' },
      { key: 'menu.camp.location', path: '/das-lager/unterkunft', scrollId: 'home-camp-location' }
    ]
  },
  {
    id: 'registration',
    labelKey: 'menu.registration.label',
    basePath: '/anmeldung/login',
    items: [
      { key: 'menu.registration.login', path: '/anmeldung/login', scrollId: 'home-login' },
      { key: 'menu.registration.signup', path: '/anmeldung/signup', scrollId: 'home-signup' }
    ]
  }
];

const sectionForPath = (pathname: string, sections: Section[]): string => {
  if (pathname.startsWith('/anmeldung')) {
    return 'registration';
  }
  for (const section of sections) {
    if (pathname === section.basePath) {
      return section.id;
    }
    if (section.items.some((item) => item.path === pathname)) {
      return section.id;
    }
    if (section.basePath !== '/' && pathname.startsWith(`${section.basePath}/`)) {
      return section.id;
    }
  }
  return 'home';
};

const NavBar: React.FC<NavBarProps> = ({ open, width = '50vw', onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { activeSection, setActiveSection } = useSection();
  const sections = React.useMemo(() => buildSections(), []);
  const [activeScrollId, setActiveScrollId] = React.useState<string | null>(null);
  const drawerWidth = width ?? '50vw';

  React.useEffect(() => {
    if (location.pathname === '/') {
      const pendingScroll = sessionStorage.getItem('kila_scroll_target');
      if (activeSection === 'registration' && !pendingScroll) {
        setActiveSection('home');
      }
      return;
    }
    setActiveSection(sectionForPath(location.pathname, sections) as SectionId);
  }, [location.pathname, sections, setActiveSection]);

  const active = sections.find((section) => section.id === activeSection) ?? sections[0];

  const isHomeLike =
    location.pathname === '/' ||
    sections.some(
      (section) =>
        section.basePath === location.pathname || section.items.some((item) => item.path === location.pathname)
    );

  const syncActiveScroll = React.useCallback(() => {
    if (!isHomeLike) {
      setActiveScrollId(null);
      return;
    }
    const container = document.getElementById('main-scroll');
    if (!container || active.items.length === 0) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const offset = 120;
    let currentId = active.items[0].scrollId;
    active.items.forEach((item) => {
      const element = document.getElementById(item.scrollId);
      if (!element) {
        return;
      }
      const top = element.getBoundingClientRect().top - containerRect.top + container.scrollTop;
      if (top <= container.scrollTop + offset) {
        currentId = item.scrollId;
      }
    });
    setActiveScrollId(currentId);
  }, [active.items, isHomeLike]);

  React.useEffect(() => {
    if (!isHomeLike) {
      setActiveScrollId(null);
      return;
    }
    const container = document.getElementById('main-scroll');
    if (!container) {
      return;
    }
    syncActiveScroll();
    const handleScroll = () => syncActiveScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isHomeLike, location.pathname, syncActiveScroll]);

  const handleLanguageToggle = () => {
    i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de');
  };

  const handleTabClick = (sectionId: SectionId) => {
    const section = sections.find((item) => item.id === sectionId);
    const basePath = section?.basePath ?? '/';
    setActiveSection(sectionId);
    if (location.pathname !== basePath) {
      navigate(basePath);
      return;
    }
    if (basePath === '/') {
      const container = document.getElementById('main-scroll');
      container?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToId = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleItemClick = (item: SectionItem) => {
    sessionStorage.setItem('kila_scroll_target', item.scrollId);
    if (location.pathname !== item.path) {
      navigate(item.path);
    } else {
      scrollToId(item.scrollId);
    }
    setActiveScrollId(item.scrollId);
    onNavigate?.();
  };

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={open}
      sx={(theme) => ({
        width: { xs: '100vw', md: drawerWidth },
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: { xs: '100vw', md: drawerWidth },
          boxSizing: 'border-box',
          height: '100dvh',
          overflowY: 'auto',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(20, 23, 32, 0.92)' : 'rgba(245, 245, 245, 0.92)',
          backdropFilter: 'blur(6px)',
          borderLeft:
            theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(0, 0, 0, 0.08)'
        }
      })}
    >
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          pt: { xs: 7, md: 4 },
          pb: 2,
          display: 'flex',
          gap: { xs: 0.5, md: 1 },
          flexWrap: 'wrap',
          rowGap: 1,
          overflowX: 'visible',
          pr: { xs: 7, md: 10 }
        }}
      >
        {sections.map((section) => {
          const label =
            section.id === 'campYear'
              ? t(section.labelKey, { year: new Date().getFullYear() })
              : t(section.labelKey);
          return (
          <Button
            key={section.id}
            onClick={() => handleTabClick(section.id as SectionId)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '999px',
              px: { xs: 1.5, md: 2 },
              py: 0.6,
              minWidth: 'auto',
              whiteSpace: 'nowrap',
              fontSize: { xs: '0.95rem', md: '1.1rem', lg: '1.15rem' },
              color: activeSection === section.id ? 'text.primary' : 'text.secondary',
              bgcolor:
                activeSection === section.id
                  ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#ffffff')
                  : 'transparent',
              boxShadow:
                activeSection === section.id
                  ? (theme) =>
                      theme.palette.mode === 'dark'
                        ? '0 0 0 1px rgba(255,255,255,0.1)'
                        : '0 0 0 1px rgba(0,0,0,0.08)'
                  : 'none'
            }}
          >
            {label}
          </Button>
          );
        })}
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          px: { xs: 3, md: 6 }
        }}
      >
        <List sx={{ width: '100%', maxWidth: { xs: '100%', md: 360 } }}>
          {active.items.map((item) => (
            <ListItemButton
              key={item.path}
              onClick={() => handleItemClick(item)}
              selected={location.pathname === '/' ? activeScrollId === item.scrollId : location.pathname === item.path}
              sx={{
                borderRadius: 2,
                mb: 1,
                justifyContent: 'flex-start',
                '&.Mui-selected': { bgcolor: 'rgba(0, 136, 255, 0.2)' }
              }}
            >
              <ListItemText
                primary={t(item.key)}
                primaryTypographyProps={{ fontWeight: 700, fontSize: '1.05rem', textAlign: 'left' }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box sx={{ px: 3, pb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button onClick={handleLanguageToggle} sx={{ textTransform: 'none' }}>
          {i18n.language === 'de' ? t('language.german') : t('language.english')}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {t('menu.footer')}
        </Typography>
      </Box>
    </Drawer>
  );
};

export default NavBar;
