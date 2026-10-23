import React from 'react';
  import Select, {
  StylesConfig,
  ActionMeta,
  SingleValue,
  } from 'react-select';
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
  placeholder = 'Select...',
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
  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || null;

  // Custom styles for 2-in-1 search and select dropdown
  const customStyles: StylesConfig<SelectOption, false> = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: state.isDisabled ? (isDaylight ? '#f8fafc' : '#18181b') : isDaylight ? '#ffffff' : '#121212',
      opacity: state.isDisabled ? 0.7 : 1,
      borderColor: state.isFocused ? '#0f766e' : isDaylight ? '#cbd5e1' : '#334155',
      borderRadius: '0.625rem',
      padding: '0 4px',
      fontSize: '0.875rem',
      borderWidth: isDaylight ? '1.5px' : '1px',
      boxShadow: state.isFocused ? (isDaylight ? '0 0 0 3px rgba(15, 118, 110, 0.15)' : 'none') : 'none',
      transition: 'all 0.15s ease',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      minHeight: '38px',
      height: '38px',
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
      '&:hover': {
        borderColor: state.isFocused ? '#0f766e' : isDaylight ? '#94a3b8' : '#475569',
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 8px',
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
      overflow: 'hidden',
      flex: '1 1 auto',
      minWidth: 0,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: isDaylight ? '#94a3b8' : '#71717a',
      fontSize: '0.8125rem',
      fontWeight: 400,
      opacity: 1,
      margin: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: isDaylight ? '#020617' : '#f4f4f5',
      fontWeight: 700,
      margin: 0,
      maxWidth: '100%',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    }),
    input: (provided) => ({
      ...provided,
      color: isDaylight ? '#020617' : '#f4f4f5',
      fontSize: '0.875rem',
      fontWeight: 600,
      margin: 0,
      padding: 0,
      backgroundColor: 'transparent !important',
      background: 'transparent !important',
      border: 'none !important',
      boxShadow: 'none !important',
      outline: 'none !important',
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: isDaylight ? '#ffffff' : '#242424',
      borderColor: isDaylight ? '#cbd5e1' : '#3f3f46',
      borderRadius: '0.75rem',
      boxShadow: isDaylight ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' : 'none',
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
      let textColor = isDaylight ? '#1e293b' : '#f1f5f9';
        let borderColor = 'transparent';

      if (isSelected && isFocused) {
        bgColor = isDaylight ? '#bbf7d0' : 'rgba(15, 118, 110, 0.4)';
        textColor = isDaylight ? '#065f46' : '#2dd4bf';
        borderColor = isDaylight ? '#059669' : '#2dd4bf';
      } else if (isSelected) {
        bgColor = isDaylight ? '#ccfbf1' : 'rgba(15, 118, 110, 0.25)';
        textColor = isDaylight ? '#0f766e' : '#2dd4bf';
        borderColor = isDaylight ? '#0f766e' : '#2dd4bf';
      } else if (isFocused) {
        bgColor = isDaylight ? '#e2e8f0' : '#334155';
        textColor = isDaylight ? '#0f766e' : '#ffffff';
        borderColor = isDaylight ? '#0f766e' : '#38bdf8';
      }

      return {
        ...provided,
        backgroundColor: bgColor,
        color: textColor,
        borderRadius: '0.5rem',
        padding: '8px 12px',
        margin: '2px 0',
        cursor: 'pointer',
        fontSize: '0.8125rem',
        fontWeight: isSelected || isFocused ? 700 : 500,
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: isFocused
          ? isDaylight
            ? '0 1px 3px rgba(0,0,0,0.08)'
            : '0 1px 3px rgba(0,0,0,0.4)'
          : 'none',
        transition: 'all 0.1s ease',
        '&:hover': {
          backgroundColor: isSelected
            ? isDaylight
              ? '#bbf7d0'
              : 'rgba(15, 118, 110, 0.4)'
            : isDaylight
            ? '#e2e8f0'
            : '#334155',
          color: isDaylight ? '#0f766e' : '#38bdf8',
          borderLeft: isDaylight ? '4px solid #0f766e' : '4px solid #38bdf8',
        },
        '&:active': {
          backgroundColor: isDaylight ? '#cbd5e1' : '#475569',
        },
      };
    },
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: isDaylight ? '#cbd5e1' : '#2c2c2c',
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused ? '#0f766e' : isDaylight ? '#1e293b' : '#a1a1aa',
      '&:hover': {
        color: '#0f766e',
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

  // Format Option and Value without remounting custom components
  const formatOption = (data: SelectOption, { context }: { context: 'menu' | 'value' }) => {
    if (context === 'value') {
      const isAllOption = data.value === 'ALL' || data.value === '' || String(data.label || '').startsWith('All ');
      return (
        <div className="flex items-center gap-1.5 truncate min-w-0 max-w-full overflow-hidden pointer-events-none">
          <span
            className={`truncate min-w-0 ${
              isAllOption
                ? isDaylight
                  ? 'text-slate-800 font-semibold text-xs'
                  : 'text-slate-400 font-normal text-xs'
                : isDaylight
                  ? 'text-slate-950 font-bold text-xs'
                  : 'text-white font-bold text-xs'
            }`}
          >
            {data.label}
          </span>
          {data.badge && !isAllOption && (
            <span
              className={`text-[10px] font-medium px-1.5 py-0.2 rounded shrink-0 border ${
                data.badgeColor ||
                (isDaylight
                  ? 'bg-teal-50 text-teal-900 border-teal-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700')
              }`}
            >
              {data.badge}
            </span>
          )}
        </div>
      );
    }

    const isSelected = String(data.value) === String(value);

    return (
      <div className="flex items-center justify-between gap-2 min-w-0 pointer-events-none w-full">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="font-bold text-xs truncate">
            {data.label}
          </span>
          {isSelected && (
            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-black">✓</span>
          )}
        </div>
        {data.badge && (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 border ${
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
    );
  };

  const handleChange = (newValue: SingleValue<SelectOption>, _actionMeta: ActionMeta<SelectOption>) => {
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
        formatOptionLabel={formatOption}
        menuPlacement={menuPlacement}
        noOptionsMessage={() => noOptionsMessage}
        classNamePrefix="eg-select"
      />
    </div>
  );
};
