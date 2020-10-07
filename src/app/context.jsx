import {
  ColorModeProvider,
  ThemeProvider,
} from '@trendmicro/react-styled-ui';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider as ReduxProvider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { CardProvider } from 'app/components/Card';
import { Provider as GridSystemProvider } from 'app/components/GridSystem';
import { ModalProvider, ModalRoot } from 'app/components/Modal';
import reduxStore from 'app/store/redux';
import i18next from 'app/i18next';

export const GlobalProvider = ({ children }) => (
  <ThemeProvider>
    <ColorModeProvider value="light">
      <ReduxProvider store={reduxStore}>
        <ModalProvider>
          <ModalRoot />
          <GridSystemProvider
            breakpoints={[576, 768, 992, 1200, 1600]}
            containerWidths={[540, 720, 960, 1140]}
            columns={12}
            gutterWidth={0}
            layout="flexbox"
          >
            <CardProvider
              borderRadius={0}
              spacingX=".75rem"
              spacingY=".375rem"
            >
              <I18nextProvider i18n={i18next}>
                <HashRouter>
                  {children}
                </HashRouter>
              </I18nextProvider>
            </CardProvider>
          </GridSystemProvider>
        </ModalProvider>
      </ReduxProvider>
    </ColorModeProvider>
  </ThemeProvider>
);
