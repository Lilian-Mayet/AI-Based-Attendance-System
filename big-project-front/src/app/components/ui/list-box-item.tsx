import React, { HTMLAttributes, ReactNode } from 'react';

interface ListBoxItemProps extends HTMLAttributes<HTMLLIElement> {
    value: string;
    children: ReactNode;
    onClick?: () => void;
    active?: boolean;
}

export const ListBoxItem = React.forwardRef<HTMLLIElement, ListBoxItemProps>(
    ({ value, children, onClick, active, className, ...props }, ref) => {
        const handleClick = () => {
            onClick?.();
        };

        return (
            <li
                ref={ref}
                className={`relative cursor-default select-none py-2 pl-3 pr-9 ${
                    active ? 'bg-blue-600 text-white' : 'text-gray-900'
                } hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:bg-blue-600 focus-visible:text-white ${className}`}
                role="option"
                aria-selected={active}
                onClick={handleClick}
                {...props}
            >
                <div className="flex items-center">
                    <span>{children}</span>
                </div>

                {active && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                        {/* You can add a checkmark icon here if you want */}
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </span>
                )}
            </li>
        );
    }
);

ListBoxItem.displayName = 'ListBoxItem';