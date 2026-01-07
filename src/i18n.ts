import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  de: {
    translation: {
      brand: {
        kila: 'KILA',
        hoerstel: 'Hörstel'
      },
      home: {
        title: {
          line1: 'Kinder',
          line2: 'Lager',
          line3: 'Hörstel'
        }
      },
      menu: {
        footer: 'Kinderlager Hoerstel',
        home: {
          label: 'Home',
          welcome: 'Willkommen',
          camp: 'Unser Lager',
          dates: 'Termine',
          registration: 'Anmeldung'
        },
        team: {
          label: 'Das Team',
          leadership: 'Die Leitung',
          caretakers: 'Die Betreuer',
          kitchen: 'Das Kochteam',
          training: 'Qualifikation & Schulungen'
        },
        downloads: {
          label: 'Downloads',
          packlist: 'Packliste',
          consents: 'Einverständniserklärungen',
          parents: 'Elterninfos (PDF)',
          emergency: 'Notfallzettel'
        },
        gallery: {
          label: 'Galerie',
          current: 'Aktuell',
          past: 'Vergangene Lager'
        },
        camp: {
          label: 'Das Lager',
          expect: 'Was erwartet die Kinder?',
          schedule: 'Tagesablauf',
          games: 'Spiele & Aktionen',
          location: 'Unterkunft & Umgebung'
        }
      },
      language: {
        german: 'Deutsch',
        english: 'English'
      }
    }
  },
  en: {
    translation: {
      brand: {
        kila: 'KILA',
        hoerstel: 'Hörstel'
      },
      home: {
        title: {
          line1: 'Kids',
          line2: 'Camp',
          line3: 'Hörstel'
        }
      },
      menu: {
        footer: 'Kids Camp Hoerstel',
        home: {
          label: 'Home',
          welcome: 'Welcome',
          camp: 'Our Camp',
          dates: 'Dates',
          registration: 'Registration'
        },
        team: {
          label: 'The Team',
          leadership: 'Leadership',
          caretakers: 'Counselors',
          kitchen: 'Kitchen Team',
          training: 'Qualifications & Training'
        },
        downloads: {
          label: 'Downloads',
          packlist: 'Packing List',
          consents: 'Consent Forms',
          parents: 'Parent Info (PDF)',
          emergency: 'Emergency Form'
        },
        gallery: {
          label: 'Gallery',
          current: 'Current',
          past: 'Past Camps'
        },
        camp: {
          label: 'The Camp',
          expect: 'What to Expect',
          schedule: 'Daily Schedule',
          games: 'Games & Activities',
          location: 'Venue & Surroundings'
        }
      },
      language: {
        german: 'Deutsch',
        english: 'English'
      }
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: 'de',
  lng: 'de',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
