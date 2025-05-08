import { Textarea } from '@mantine/core';

const ExtendedTextInput = Textarea.extend({
  classNames: {
    input: 'rounded-lg shadow-sm',
  },
});

export default ExtendedTextInput;
