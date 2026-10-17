import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Button.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: IconName;
  /** Icon-only buttons must still have an accessible name. */
  label?: string;
  children?: ReactNode;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  label,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconOnly = !children;
  return (
    <button
      type={type}
      className={[styles.button, styles[variant], styles[size], iconOnly && styles.iconOnly, className]
        .filter(Boolean)
        .join(' ')}
      aria-label={iconOnly ? label : undefined}
      title={label}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
