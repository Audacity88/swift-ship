"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className = "", ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={`flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-gray-950 ${className}`}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className = "", ...props }, ref) => (
  <CommandPrimitive.Input
    ref={ref}
    className={`flex h-10 w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
))
CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`py-6 text-center text-sm text-gray-500 ${className}`}
    {...props}
  />
))
CommandEmpty.displayName = "CommandEmpty"

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className = "", ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={`overflow-hidden p-1 text-gray-950 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-500 ${className}`}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className = "", ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-gray-100 hover:bg-gray-100 ${className}`}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

export {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} 