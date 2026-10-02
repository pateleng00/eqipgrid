import React from 'react';
import Select, {
  components,
  ControlProps,
  OptionProps,
  SingleValueProps,
  StylesConfig,
  ActionMeta,
  SingleValue,
} from 'react-select';
import { Search } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

export interface SelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: string;
  isDisabled?: boolean;
}

interface SearchSelectProps {
  options: SelectOption[];
  value: string | number | null | undefined;
  onChange: (value: any) => void;
  placeholder?: string;
  isClearable?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  isSearchable?: boolean;
  className?: string;
  id?: string;
  menuPlacement?: 'auto' | 'bottom' | 'top';
  noOptionsMessage?: string;
}

export const SearchSelect: React.FC<SearchSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Search & select...',
  isClearable = true,
  isDisabled = false,
  isLoading = false,
  isSearchable = true,
  className = '',
  id,
  menuPlacement = 'auto',
  noOptionsMessage = 'No matching options found',
}) => {
  const { isDaylight } = useTheme();

  // Find currently selected option object
  const selectedOption =
    options.find((opt) => String(opt.value) === String(value)) || null;

  // Custom styles for 2-in-1 search and select dropdown
  const customStyles: StylesConfig<SelectOption, false> = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: isDaylight ? 'transparent' : '#121212',
      borderColor: state.isFocused
        ? '#b45309'
        : isDaylight
        ? '#94a3b8'
        : '#334155',
      borderRadius: '0.625rem',
      padding: '1px 3px',
      fontSize: '0.875rem',
      borderWidth: isDaylight ? '1.5px' : '1px',
      boxShadow: state.isFocused
        ? isDaylight
          ? '0 0 0 3px rgba(180, 83, 9, 0.15)'
          : 'none'
        : 'none',
      transition: 'all 0.15s ease',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      minHeight: '40px',
      '&:hover': {
        borderColor: state.isFocused ? '#b45309' : isDaylight ? '#475569' : '#475569',
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '2px 8px',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: isDaylight ? '#94a3b8' : '#52525b',
      fontSize: '0.8125rem',
      fontWeight: 400,
      opacity: 0.8,
    }),
    singleValue: (provided) => ({
      ...provided,
      color: isDaylight ? '#020617' : '#f4f4f5',
      fontWeight: 700,
    }),
    input: (provided) => ({
      ...provided,
      color: isDaylight ? '#020617' : '#f4f4f5',
      fontSize: '0.875rem',
      fontWeight: 600,
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: isDaylight ? '#ffffff' : '#242424',
      borderColor: isDaylight ? '#cbd5e1' : '#3f3f46',
      borderRadius: '0.75rem',
      boxShadow: isDaylight
        ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
        : 'none',
      overflow: 'hidden',
      zIndex: 60,
      border: `1px solid ${isDaylight ? '#cbd5e1' : '#3f3f46'}`,
      padding: '4px',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '4px',
      maxHeight: '260px',
    }),
    option: (provided, state) => {
      const isSelected = state.isSelected;
      const isFocused = state.isFocused;

      let bgColor = 'transparent';
      let textColor = isDaylight ? '#020617' : '#f4f4f5';

      if (isSelected) {
        bgColor = isDaylight ? '#fed7aa' : 'rgba(245, 158, 11, 0.2)';
        textColor = isDaylight ? '#78350f' : '#fbbf24';
      } else if (isFocused) {
        bgColor = isDaylight ? '#f1f5f9' : '#2c2c2c';
        textColor = isDaylight ? '#020617' : '#f4f4f5';
      }

      return {
        ...provided,
        backgroundColor: bgColor,
        color: textColor,
        borderRadius: '0.5rem',
        padding: '8px 10px',
        margin: '2px 0',
        cursor: 'pointer',
        fontSize: '0.875rem',
        transition: 'all 0.12s ease',
        '&:active': {
          backgroundColor: isDaylight ? '#e2e8f0' : '#2c2c2c',
        },
      };
    },
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: isDaylight ? '#cbd5e1' : '#2c2c2c',
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused ? '#b45309' : isDaylight ? '#1e293b' : '#a1a1aa',
      '&:hover': {
        color: '#b45309',
      },
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: isDaylight ? '#1e293b' : '#a1a1aa',
      '&:hover': {
        color: '#be123c',
      },
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: isDaylight ? '#334155' : '#a1a1aa',
      fontSize: '0.875rem',
      padding: '12px',
    }),
  };

  // Custom Option rendering with rich labels, secondary tags & badges
  const CustomOption = (props: OptionProps<SelectOption, false>) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className={`font-bold text-sm truncate ${isDaylight ? 'text-slate-950' : ''}`}>
              {data.label}
            </span>
            {data.subLabel && (
              <span className={`text-xs truncate ${isDaylight ? 'text-slate-700 font-semibold' : 'opacity-75'}`}>
                {data.subLabel}
              </span>
            )}
          </div>
          {data.badge && (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 border ${
                data.badgeColor ||
                (isDaylight
                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700')
              }`}
            >
              {data.badge}
            </span>
          )}
        </div>
      </components.Option>
    );
  };

  // Custom SingleValue rendering
  const CustomSingleValue = (props: SingleValueProps<SelectOption, false>) => {
    const { data } = props;
    const isAllOption = data.value === 'ALL' || data.value === '' || data.label.startsWith('All ');
    return (
      <components.SingleValue {...props}>
        <div className="flex items-center gap-2 truncate">
          <span
            className={`truncate ${
              isAllOption
                ? isDaylight
                  ? 'text-slate-500 font-normal text-xs'
                  : 'text-slate-400 font-normal text-xs'
                : isDaylight
                ? 'text-slate-950 font-bold text-xs'
                : 'text-white font-bold text-xs'
            }`}
          >
            {data.label}
          </span>
          {data.subLabel && !isAllOption && (
            <span className={`text-[11px] truncate ${isDaylight ? 'text-slate-600' : 'opacity-60'}`}>
              ({data.subLabel})
            </span>
          )}
          {data.badge && !isAllOption && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.2 rounded shrink-0 border ${
                data.badgeColor ||
                (isDaylight
                  ? 'bg-amber-100 text-amber-950 border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700')
              }`}
            >
              {data.badge}
            </span>
          )}
        </div>
      </components.SingleValue>
    );
  };

  const handleChange = (
    newValue: SingleValue<SelectOption>,
    _actionMeta: ActionMeta<SelectOption>
  ) => {
    if (!newValue) {
      onChange(null);
    } else {
      onChange(newValue.value);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Select<SelectOption, false>
        id={id}
        value={selectedOption}
        onChange={handleChange}
        options={options}
        placeholder={placeholder}
        isClearable={isClearable}
        isDisabled={isDisabled}
        isLoading={isLoading}
        isSearchable={isSearchable}
        styles={customStyles}
        components={{
          Option: CustomOption,
          SingleValue: CustomSingleValue,
        }}
        menuPlacement={menuPlacement}
        noOptionsMessage={() => noOptionsMessage}
        classNamePrefix="eg-select"
      />
    </div>
  );
};
