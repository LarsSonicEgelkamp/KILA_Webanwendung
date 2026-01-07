import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Button, Drawer, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

type NavBarProps = {
  open: boolean;
  width?: number | string;
  onNavigate?: () => void;
};

const sections = [
  {
    id: 'home',
    labelKey: 'menu.home.label',
    items: [
      { key: 'menu.home.welcome', to: '/' },
      { key: 'menu.home.camp', to: '/lager' },
      { key: 'menu.home.dates', to: '/termine' },
      { key: 'menu.home.registration', to: '/anmeldung' }
    ]
  },
  {
    id: 'team',
    labelKey: 'menu.team.label',
    items: [
      { key: 'menu.team.leadership', to: '/team/leitung' },
      { key: 'menu.team.caretakers', to: '/team/betreuer' },
      { key: 'menu.team.kitchen', to: '/team/kochteam' },
      { key: 'menu.team.training', to: '/team/qualifikation' }
    ]
  },
  {
    id: 'downloads',
    labelKey: 'menu.downloads.label',
    items: [
      { key: 'menu.downloads.packlist', to: '/downloads/packliste' },
      { key: 'menu.downloads.consents', to: '/downloads/einverstaendnis' },
      { key: 'menu.downloads.parents', to: '/downloads/elterninfos' },
      { key: 'menu.downloads.emergency', to: '/downloads/notfall' }
    ]
  },
  {
    id: 'gallery',
    labelKey: 'menu.gallery.label',
    items: [
      { key: 'menu.gallery.current', to: '/galerie/aktuell' },
      { key: 'menu.gallery.past', to: '/galerie/vergangene' }
    ]
  },
  {
    id: 'camp',
    labelKey: 'menu.camp.label',
    items: [
      { key: 'menu.camp.expect', to: '/das-lager/was-erwartet' },
      { key: 'menu.camp.schedule', to: '/das-lager/tagesablauf' },
      { key: 'menu.camp.games', to: '/das-lager/spiele' },
      { key: 'menu.camp.location', to: '/das-lager/unterkunft' }
    ]
  }
];

const sectionForPath = (pathname: string): string => {
  for (const section of sections) {
    if (section.items.some((item) => item.to === pathname)) {
      return section.id;
    }
  }
  return 'home';
};

const NavBar: React.FC<NavBarProps> = ({ open, width = '50vw', onNavigate }) => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = React.useState(sectionForPath(location.pathname));

  React.useEffect(() => {
    setActiveSection(sectionForPath(location.pathname));
  }, [location.pathname]);

  const active = sections.find((section) => section.id === activeSection) ?? sections[0];

  const handleLanguageToggle = () => {
    i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de');
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
            onClick={() => setActiveSection(section.id)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '999px',
              px: { xs: 1.5, md: 2 },
              py: 0.5,
              minWidth: 'auto',
              whiteSpace: 'nowrap',
              fontSize: { xs: '0.95rem', md: '1.1rem' },
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
              key={item.to}
              component={Link}
              to={item.to}
              onClick={onNavigate}
              selected={location.pathname === item.to}
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
