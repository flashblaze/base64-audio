import { Checkbox } from '@mantine/core';

const ExtendedCheckbox = Checkbox.extend({
  classNames: {
    input: 'rounded-md shadow-sm',
  },
});

export default ExtendedCheckbox;
