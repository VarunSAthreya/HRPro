import { Notification } from '@contentstack/venus-components';
import { ReactElement } from 'react';

export const showNotification = (
    content: string,
    type: 'success' | 'error' | 'warning',
    cta: ReactElement | null = null
  ) => {
    Notification({
      displayContent: {
        text: content
      },
      notifyProps: {
        hideProgressBar: true
      },
      type,
      cta
    });
  };