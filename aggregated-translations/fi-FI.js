import { addLocaleData } from 'react-intl';
import localeData from 'react-intl/locale-data/fi';

addLocaleData(localeData);

const messages = {
  "Terra.ajax.error": "This content failed to load.n9KZ Pi~",
  "Terra.datePicker.today": "Today ~",
  "Terra.datePicker.openCalendar": "Open Calendar ~",
  "Terra.form.field.optional": "(optional)2384932**",
  "Terra.form.select.defaultDisplay": "- Select -",
  "Terra.Overlay.loading": "Lataamalla..."
};
const areTranslationsLoaded = true;
const locale = 'fi-FI';
export {
  areTranslationsLoaded,
  locale,
  messages
};