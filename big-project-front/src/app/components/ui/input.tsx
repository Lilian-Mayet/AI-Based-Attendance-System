import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 focus:ring-opacity-50 ${className}`}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };