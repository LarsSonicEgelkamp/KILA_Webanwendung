import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AppBar, Box, IconButton, Toolbar } from '@mui/material';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import ContentPage from './pages/ContentPage';
import kilaLogo from './assets/img/KILA_Logo.png';

const drawerWidth = '50vw';
const appBarHeight = 56;

const App: React.FC = () => {
  const [navOpen, setNavOpen] = React.useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  const handleToggleNav = () => {
    setNavOpen((prev) => !prev);
  };

  const handleCloseNav = () => {
    setNavOpen(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: isHome ? '#0088ff' : '#ffffff' }}>
      <AppBar
        position="fixed"
        sx={(theme) => ({
          bgcolor: 'transparent',
          boxShadow: 'none',
          height: `${appBarHeight}px`,
          justifyContent: 'center',
          zIndex: theme.zIndex.drawer + 2,
          pointerEvents: 'none'
        })}
      >
        <Toolbar
          sx={{
            minHeight: `${appBarHeight}px`,
            justifyContent: 'flex-end'
          }}
        >
          <IconButton
            onClick={handleToggleNav}
            aria-label={navOpen ? 'Navigation schliessen' : 'Navigation oeffnen'}
            sx={{ color: isHome ? '#ffffff' : '#0088ff', pointerEvents: 'auto' }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 26,
                height: 20
              }}
            >
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: navOpen ? '9px' : '4px',
                  width: '26px',
                  height: '3px',
                  bgcolor: 'currentColor',
                  transform: navOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 220ms ease, top 220ms ease'
                }}
              />
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: navOpen ? '9px' : '13px',
                  width: '26px',
                  height: '3px',
                  bgcolor: 'currentColor',
                  transform: navOpen ? 'rotate(-45deg)' : 'rotate(0deg)',
                  transition: 'transform 220ms ease, top 220ms ease'
                }}
              />
            </Box>
          </IconButton>
        </Toolbar>
      </AppBar>

      {navOpen ? (
        <Box
          onClick={handleToggleNav}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '50vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            zIndex: 1000,
            cursor: 'pointer'
          }}
        >
          <Box
            component="img"
            src={kilaLogo}
            alt="KILA Logo"
            sx={{ width: { xs: 200, md: 260 }, height: 'auto', maxWidth: '70%', pointerEvents: 'none' }}
          />
        </Box>
      ) : null}

      <NavBar open={navOpen} width={drawerWidth} onNavigate={handleCloseNav} />

      <Box
        component="main"
        sx={{
          pt: `${appBarHeight}px`,
          minHeight: '100vh',
          bgcolor: 'transparent'
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lager" element={<ContentPage titleKey="menu.home.camp" />} />
          <Route path="/termine" element={<ContentPage titleKey="menu.home.dates" />} />
          <Route path="/anmeldung" element={<ContentPage titleKey="menu.home.registration" />} />
          <Route path="/team/leitung" element={<ContentPage titleKey="menu.team.leadership" />} />
          <Route path="/team/betreuer" element={<ContentPage titleKey="menu.team.caretakers" />} />
          <Route path="/team/kochteam" element={<ContentPage titleKey="menu.team.kitchen" />} />
          <Route path="/team/qualifikation" element={<ContentPage titleKey="menu.team.training" />} />
          <Route path="/downloads/packliste" element={<ContentPage titleKey="menu.downloads.packlist" />} />
          <Route path="/downloads/einverstaendnis" element={<ContentPage titleKey="menu.downloads.consents" />} />
          <Route path="/downloads/elterninfos" element={<ContentPage titleKey="menu.downloads.parents" />} />
          <Route path="/downloads/notfall" element={<ContentPage titleKey="menu.downloads.emergency" />} />
          <Route path="/galerie/aktuell" element={<ContentPage titleKey="menu.gallery.current" />} />
          <Route path="/galerie/vergangene" element={<ContentPage titleKey="menu.gallery.past" />} />
          <Route path="/das-lager/was-erwartet" element={<ContentPage titleKey="menu.camp.expect" />} />
          <Route path="/das-lager/tagesablauf" element={<ContentPage titleKey="menu.camp.schedule" />} />
          <Route path="/das-lager/spiele" element={<ContentPage titleKey="menu.camp.games" />} />
          <Route path="/das-lager/unterkunft" element={<ContentPage titleKey="menu.camp.location" />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default App;
