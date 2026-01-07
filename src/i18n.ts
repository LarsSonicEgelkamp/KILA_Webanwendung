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
        },
        welcomeMessage:
          'Willkommen beim Kinderlager Hörstel! Hier findest du alle Infos zu unserem Lager, den Terminen und der Anmeldung.',
        learnMore: 'erfahre mehr',
        scrollMe: 'scroll mich',
        sections: {
          camp: {
            body:
              'Unser Lager bietet Abenteuer, Gemeinschaft und jede Menge Spaß in der Natur. Entdecke, was die Kinder erwartet.'
          },
          dates: {
            body:
              'Hier findest du alle wichtigen Termine rund um das Lagerjahr, von Anmeldungen bis zu den Camp-Wochen.'
          },
          placeholder: {
            body: 'Inhalte folgen in Kürze.'
          }
        }
      },
      menu: {
        footer: 'Kinderlager Hörstel',
        home: {
          label: 'Home',
          welcome: 'Willkommen',
          camp: 'Unser Lager',
          dates: 'Termine'
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
        },
        registration: {
          label: 'Anmeldung',
          login: 'Login',
          signup: 'Sign Up',
          userManagement: 'Benutzerverwaltung'
        }
      },
      auth: {
        login: 'Login',
        signup: 'Sign Up',
        logout: 'Logout',
        name: 'Name',
        email: 'E-Mail',
        password: 'Passwort',
        role: 'Rolle',
        loggedInAs: 'Angemeldet als {{name}} ({{role}}).',
        firstAdminNote: 'Das erste Konto wird automatisch Admin.',
        loginRequired: 'Bitte erst anmelden.',
        noAccess: 'Keine Berechtigung.',
        errors: {
          invalidCredentials: 'E-Mail oder Passwort stimmt nicht.',
          emailInUse: 'E-Mail ist bereits registriert.',
          missingFields: 'Bitte alle Felder ausfüllen.'
        },
        success: {
          created: 'Konto wurde angelegt.'
        },
        roles: {
          admin: 'Admin',
          leitung: 'Leitung',
          user: 'User'
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
        },
        welcomeMessage:
          'Welcome to Kids Camp Hörstel! Find everything about our camp, important dates, and registration.',
        learnMore: 'learn more',
        scrollMe: 'scroll me',
        sections: {
          camp: {
            body:
              'Our camp is all about adventure, community, and fun in nature. Explore what awaits the kids.'
          },
          dates: {
            body:
              'Here you can find all key dates for the camp year, from registration to camp weeks.'
          },
          placeholder: {
            body: 'Content coming soon.'
          }
        }
      },
      menu: {
        footer: 'Kids Camp Hörstel',
        home: {
          label: 'Home',
          welcome: 'Welcome',
          camp: 'Our Camp',
          dates: 'Dates'
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
        },
        registration: {
          label: 'Registration',
          login: 'Login',
          signup: 'Sign Up',
          userManagement: 'User Management'
        }
      },
      auth: {
        login: 'Login',
        signup: 'Sign Up',
        logout: 'Logout',
        name: 'Name',
        email: 'Email',
        password: 'Password',
        role: 'Role',
        loggedInAs: 'Logged in as {{name}} ({{role}}).',
        firstAdminNote: 'The first account becomes Admin automatically.',
        loginRequired: 'Please log in first.',
        noAccess: 'Not authorized.',
        errors: {
          invalidCredentials: 'Email or password is incorrect.',
          emailInUse: 'Email is already registered.',
          missingFields: 'Please fill out all fields.'
        },
        success: {
          created: 'Account created.'
        },
        roles: {
          admin: 'Admin',
          leitung: 'Leadership',
          user: 'User'
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
