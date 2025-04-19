import React, { LabelHTMLAttributes } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => {
  return (
    <label
      className={`block text-sm font-medium text-gray-700 ${className}`}
      ref={ref}
      {...props}
    />
  );
});

Label.displayName = 'Label';

export { Label };