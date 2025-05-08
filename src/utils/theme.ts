import { createTheme } from '@mantine/core';

import ExtendedButton from '~/components/ExtendedButton';
import ExtendedCheckbox from '~/components/ExtendedCheckbox';
import ExtendedSelect from '~/components/ExtendedSelect';
import ExtendedTextarea from '~/components/ExtendedTextarea';

const theme = createTheme({
  components: {
    Button: ExtendedButton,
    Textarea: ExtendedTextarea,
    Checkbox: ExtendedCheckbox,
    Select: ExtendedSelect,
  },
  fontFamily: 'Geist, sans-serif',
});

export default theme;
