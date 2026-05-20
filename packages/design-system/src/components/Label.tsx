import React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {}

export function Label(props: LabelProps): React.JSX.Element {
  return <LabelPrimitive.Root {...props} />;
}
