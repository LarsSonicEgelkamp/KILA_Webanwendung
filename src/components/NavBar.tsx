import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Drawer, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
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
  items: SectionItem[];
};

const buildSections = (canManageUsers: boolean): Section[] => [
  {
    id: 'home',
    labelKey: 'menu.home.label',
    items: [
      { key: 'menu.home.welcome', path: '/', scrollId: 'home-hero' },
      { key: 'menu.home.camp', path: '/lager', scrollId: 'home-camp' },
      { key: 'menu.home.dates', path: '/termine', scrollId: 'home-dates' }
    ]
  },
  {
    id: 'team',
    labelKey: 'menu.team.label',
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
    items: [
      { key: 'menu.gallery.current', path: '/galerie/aktuell', scrollId: 'home-gallery-current' },
      { key: 'menu.gallery.past', path: '/galerie/vergangene', scrollId: 'home-gallery-past' }
    ]
  },
  {
    id: 'camp',
    labelKey: 'menu.camp.label',
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
    items: [
      { key: 'menu.registration.login', path: '/anmeldung/login', scrollId: 'home-login' },
      { key: 'menu.registration.signup', path: '/anmeldung/signup', scrollId: 'home-signup' },
      ...(canManageUsers
        ? [{ key: 'menu.registration.userManagement', path: '/anmeldung/user-management', scrollId: 'home-user-management' }]
        : [])
    ]
  }
];

const sectionForPath = (pathname: string, sections: Section[]): string => {
  if (pathname.startsWith('/anmeldung')) {
    return 'registration';
  }
  for (const section of sections) {
    if (section.items.some((item) => item.path === pathname)) {
      return section.id;
    }
  }
  return 'home';
};

const NavBar: React.FC<NavBarProps> = ({ open, width = '50vw', onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { activeSection, setActiveSection } = useSection();
  const canManageUsers = user?.role === 'admin' || user?.role === 'leitung';
  const sections = React.useMemo(() => buildSections(canManageUsers), [canManageUsers]);

  React.useEffect(() => {
    if (location.pathname === '/') {
      return;
    }
    setActiveSection(sectionForPath(location.pathname, sections) as SectionId);
  }, [location.pathname, sections, setActiveSection]);

  const active = sections.find((section) => section.id === activeSection) ?? sections[0];

  const handleLanguageToggle = () => {
    i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de');
  };

  const handleTabClick = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    if (location.pathname !== '/') {
      navigate('/');
      return;
    }
    const container = document.getElementById('main-scroll');
    container?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToId = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleItemClick = (item: SectionItem) => {
    if (location.pathname !== '/') {
      sessionStorage.setItem('kila_scroll_target', item.scrollId);
      navigate('/');
    } else {
      scrollToId(item.scrollId);
    }
    onNavigate?.();
  };

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={open}
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          height: '100vh',
          backgroundColor: 'rgba(245, 245, 245, 0.92)',
          backdropFilter: 'blur(6px)',
          borderLeft: '1px solid rgba(0, 0, 0, 0.08)'
        }
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          pt: 4,
          pb: 2,
          display: 'flex',
          gap: { xs: 0.5, md: 1 },
          flexWrap: 'nowrap',
          overflowX: 'auto'
        }}
      >
        {sections.map((section) => (
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
              color: activeSection === section.id ? '#0b0b0b' : '#333',
              bgcolor: activeSection === section.id ? '#ffffff' : 'transparent',
              boxShadow: activeSection === section.id ? '0 0 0 1px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            {t(section.labelKey)}
          </Button>
        ))}
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
        <List sx={{ width: '100%', maxWidth: 360 }}>
          {active.items.map((item) => (
            <ListItemButton
              key={item.path}
              onClick={() => handleItemClick(item)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                mb: 1,
                justifyContent: 'flex-start',
                '&.Mui-selected': { bgcolor: 'rgba(0, 136, 255, 0.12)' }
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
