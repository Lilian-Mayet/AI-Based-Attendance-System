import React, {
    useState,
    useEffect,
    useRef,
    ReactNode,
    HTMLAttributes,
    useCallback,
} from 'react';
import { ListBoxItem } from './list-box-item';
import { ChevronDownIcon } from '@radix-ui/react-icons'; 

interface ListBoxProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    onValueChange?: (value: string) => void;
    defaultValue?: string;
}

export const ListBox = React.forwardRef<HTMLDivElement, ListBoxProps>(
    ({ children, onValueChange, defaultValue, className, ...props }, ref) => {
        const [isOpen, setIsOpen] = useState(false);
        const [selectedValue, setSelectedValue] = useState(defaultValue || '');
        const listRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (defaultValue) {
                setSelectedValue(defaultValue);
            }
        }, [defaultValue]);

        const handleToggle = () => {
            setIsOpen(!isOpen);
        };

        const handleItemClick = useCallback((value: string) => {
            setSelectedValue(value);
            setIsOpen(false);
            onValueChange?.(value);
        }, [onValueChange, setSelectedValue, setIsOpen]);

        // Close the listbox when clicking outside
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (listRef.current && !listRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [listRef, setIsOpen]);

        return (
            <div ref={listRef} className={`relative ${className}`} {...props}>
                <button
                    type="button"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-left text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-between"
                    onClick={handleToggle}
                >
                    {selectedValue
                        ? React.Children.toArray(children).find(
                              (child) => React.isValidElement(child) && child.props.value === selectedValue
                          )?.props.children
                        : 'Select an option'}
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </button>

                {isOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg focus:outline-none" role="listbox" aria-labelledby="listbox-label" aria-activedescendant="listbox-item-3">
                        <ul className="max-h-48 overflow-auto py-1 text-sm" role="list">
                            {React.Children.map(children, (child) => (
                                React.isValidElement(child) &&
                                <ListBoxItem
                                    value={child.props.value}
                                    onClick={() => handleItemClick(child.props.value)}
                                    active={selectedValue === child.props.value}
                                >
                                    {child.props.children}
                                </ListBoxItem>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }
);

ListBox.displayName = 'ListBox';