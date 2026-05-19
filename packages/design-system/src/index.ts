// ── Design tokens ─────────────────────────────────────────────────────────────
export {
  colors,
  spacing,
  radius,
  fontFamily,
  fontSize,
  fontWeight,
  type Colors,
  type Spacing,
  type Radius,
  type FontFamily,
  type FontSize,
  type FontWeight,
} from './tokens/index.js';

// ── Utilities ─────────────────────────────────────────────────────────────────
export { cx } from './lib/cx.js';

// ── Button ────────────────────────────────────────────────────────────────────
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './components/Button.js';

// ── Input ─────────────────────────────────────────────────────────────────────
export { Input, type InputProps } from './components/Input.js';

// ── Badge ─────────────────────────────────────────────────────────────────────
export { Badge, type BadgeProps, type BadgeVariant } from './components/Badge.js';

// ── Avatar ────────────────────────────────────────────────────────────────────
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  type AvatarRootProps,
  type AvatarImageProps,
  type AvatarFallbackProps,
  type AvatarSize,
} from './components/Avatar.js';

// ── Dialog ────────────────────────────────────────────────────────────────────
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  type DialogOverlayProps,
  type DialogContentProps,
  type DialogHeaderProps,
  type DialogFooterProps,
  type DialogTitleProps,
  type DialogDescriptionProps,
} from './components/Dialog.js';

// ── Dropdown ──────────────────────────────────────────────────────────────────
export {
  Dropdown,
  DropdownTrigger,
  DropdownGroup,
  DropdownPortal,
  DropdownSub,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  type DropdownContentProps,
  type DropdownItemProps,
  type DropdownSeparatorProps,
  type DropdownLabelProps,
} from './components/Dropdown.js';

// ── Tabs ──────────────────────────────────────────────────────────────────────
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
} from './components/Tabs.js';

// ── Tooltip ───────────────────────────────────────────────────────────────────
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  type TooltipContentProps,
} from './components/Tooltip.js';
