import { useT } from '@/lib/i18n';

const STORE_URL = 'https://chromewebstore.google.com/detail/usrhelper/hmmlhdogplekofonkkmhacfolcfgejic';
const PROJECT_URL = 'https://attv.uk/projects/usrhelper.html';

/**
 * Two quiet calls to action shown where the user has just finished a report:
 * rate the extension, or ask for the feature they found missing.
 */
export function FeedbackFooter() {
  const { t } = useT();
  return (
    <div class="feedback-footer">
      <div>
        {t('feedback.rate')}{' '}
        <a href={STORE_URL} target="_blank" rel="noreferrer">
          {t('feedback.rate.link')}
        </a>
      </div>
      <div>
        {t('feedback.feature')}{' '}
        <a href={PROJECT_URL} target="_blank" rel="noreferrer">
          {t('feedback.feature.link')}
        </a>
      </div>
    </div>
  );
}
