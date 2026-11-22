"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { createFormHookContexts } from "@tanstack/react-form"
import {
  cloneElement,
  type ComponentProps,
  type ComponentType,
  lazy,
  type ReactElement,
  type ReactNode,
  Suspense,
  useId,
} from "react"
import { formatIdList } from "../lib/aria"
import { descriptionClasses } from "../lib/classes"
import { cn } from "../lib/variants"
import { Button } from "./button"
import { Callout, CalloutText } from "./callout"
import { Checkbox } from "./checkbox"
import type { DatePickerProps } from "./date-picker"
import { DatePickerTrigger } from "./date-picker-trigger"
import { DetailRow } from "./detail-row"
import { DisabledReason } from "./disabled-reason"
import { Input } from "./input"
import { Label } from "./label"
import { NumberInput } from "./number-input"
import { RadioCard, RadioGroup } from "./radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select"
import { Switch } from "./switch"
import { Textarea } from "./textarea"

/**
 * Form primitives over TanStack Form. An app wires them up once with `createFormHook`:
 *
 *     const { useAppForm } = createFormHook({ fieldContext, formContext, fieldComponents, formComponents })
 *
 * and then writes `<form.AppField name="email">{field => <field.TextField label="Email" />}</form.AppField>`
 * inside a `<Form form={form}>`. The field components read the field they belong to from context,
 * so a call site names the field once, on `AppField`.
 */

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()

/**
 * `stack` puts the label above a full-width control, for dialogs and single-column pages;
 * `rows` puts the label and its description beside the control, for a `divide-y` settings body.
 */
export type FieldLayout = "stack" | "rows"

/** What a control needs to be the field's: its id, the aria links to the copy under it, and blur. */
export interface FieldControlProps {
  id: string
  name: string
  "aria-describedby"?: string
  "aria-invalid"?: true
  "aria-required"?: true
  onBlur: () => void
}

/** A validator's error as text. Standard Schema issues are objects; a plain validator returns a string. */
function errorMessage(error: unknown) {
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error) return String(error.message)
  return
}

/** The error a touched field shows, for a field that renders its own control and message. */
export function fieldError(meta: { isTouched: boolean; errors: unknown[] }) {
  if (!meta.isTouched) return
  return meta.errors.map(errorMessage).find(Boolean)
}

interface FieldMessageProps {
  id: string
  message: string | undefined
  className?: string
}

/**
 * A field's validation error, under its control. Not a live region: the message is in the
 * control's `aria-describedby`, so it is read when the submit moves focus there, and a live role
 * would fire one alert per invalid field.
 */
function FieldMessage({ id, message, className }: FieldMessageProps) {
  if (!message) return null

  return (
    <p id={id} className={cn(descriptionClasses, "text-danger-ink", className)}>
      {message}
    </p>
  )
}

export interface FieldProps {
  label: ReactNode
  description?: ReactNode
  isRequired?: boolean
  layout?: FieldLayout
  /** Classes for the whole field; a width set here constrains the control, which fills it. */
  className?: string
  /** Extra classes for the label, e.g. `sr-only` where the row around the control already names it. */
  labelClassName?: string
  /** An item at the end of the label's line: an `InlineAction`, a badge. */
  trailing?: ReactNode
  /** Extra classes for the value column in `rows` layout, e.g. `sm:items-end`. */
  valueClassName?: string
  /**
   * Why the control cannot be used: read with it, and shown above it on hover and focus. A
   * control handed over as an element gets it through `DisabledReason`; a text field also needs
   * `readOnly`, which the typed fields set. A function child wraps its own control.
   */
  disabledReason?: string
  /**
   * The control: an element the field's id and aria attributes are merged onto, or a function
   * handed them to put on the element that should carry them.
   */
  children: ReactElement<FieldControlProps> | ((control: FieldControlProps) => ReactNode)
}

/**
 * One labelled field in whichever frame the form asked for: label, control, description, and
 * the first validation error, with the label's `htmlFor` and the control's `aria-describedby`
 * and `aria-invalid` wired the same way in both layouts. In `stack` the error takes the
 * description's place, worded as the fix, so the line under the control never doubles up.
 */
export function Field({
  label,
  description,
  isRequired,
  layout = "stack",
  className,
  labelClassName,
  valueClassName,
  trailing,
  disabledReason,
  children,
}: FieldProps) {
  const field = useFieldContext()
  const id = useId()
  const descriptionId = `${id}-description`
  const messageId = `${id}-message`
  // Only a touched field shows its error, so one a switch has just revealed starts clean; a
  // submit touches every field, which is when the whole form's errors appear.
  const message = fieldError(field.state.meta)
  // In `rows` the description sits beside the label, so an error never replaces it.
  const showsDescription = !!description && (layout === "rows" || !message)

  const controlProps: FieldControlProps = {
    id,
    name: field.name,
    "aria-describedby": formatIdList(showsDescription && descriptionId, message && messageId),
    "aria-invalid": message ? true : undefined,
    "aria-required": isRequired ? true : undefined,
    onBlur: field.handleBlur,
  }

  const control =
    typeof children === "function" ? (
      children(controlProps)
    ) : (
      <DisabledReason reason={disabledReason}>
        {cloneElement(children, mergeProps(controlProps, children.props))}
      </DisabledReason>
    )

  let labelNode = (
    <Label htmlFor={id} isRequired={isRequired} className={labelClassName}>
      {label}
    </Label>
  )
  if (trailing) {
    labelNode = (
      <div className="flex items-center justify-between gap-2">
        {labelNode}
        <div className="flex shrink-0 items-center text-control">{trailing}</div>
      </div>
    )
  }
  const messageNode = <FieldMessage id={messageId} message={message} />

  if (layout === "rows") {
    return (
      <DetailRow
        density="form"
        label={labelNode}
        description={description && <p id={descriptionId}>{description}</p>}
        className={className}
        valueClassName={valueClassName}
      >
        {control}
        {messageNode}
      </DetailRow>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 has-disabled:[&_label]:cursor-default has-aria-disabled:[&_label]:cursor-default",
        className,
      )}
    >
      {labelNode}
      {control}
      {showsDescription && (
        <p id={descriptionId} className={descriptionClasses}>
          {description}
        </p>
      )}
      {messageNode}
    </div>
  )
}

type FrameProps = Omit<FieldProps, "children">

/** Splits a field component's props into the `Field` frame's and the control's. */
function splitFrame<T extends FrameProps>({
  label,
  description,
  isRequired,
  layout,
  className,
  labelClassName,
  valueClassName,
  trailing,
  disabledReason,
  ...control
}: T) {
  const frame = {
    label,
    description,
    isRequired,
    layout,
    className,
    labelClassName,
    valueClassName,
    trailing,
    disabledReason,
  }
  return [frame, control] as const
}

type TextFieldProps = FrameProps &
  Omit<ComponentProps<typeof Input>, "value" | "onChange" | "id" | "name" | "className">

/** A `Field` around an `Input` bound to a string field. */
export function TextField(props: TextFieldProps) {
  const [frame, control] = splitFrame(props)
  const field = useFieldContext<string>()

  return (
    <Field {...frame}>
      <Input
        {...control}
        value={field.state.value}
        readOnly={control.readOnly === true || !!frame.disabledReason}
        onChange={event => field.handleChange(event.target.value)}
      />
    </Field>
  )
}

type TextareaFieldProps = FrameProps &
  Omit<ComponentProps<typeof Textarea>, "value" | "onChange" | "id" | "name" | "className">

/** A `Field` around a `Textarea` bound to a string field. */
export function TextareaField(props: TextareaFieldProps) {
  const [frame, control] = splitFrame(props)
  const field = useFieldContext<string>()

  return (
    <Field {...frame}>
      <Textarea
        {...control}
        value={field.state.value}
        readOnly={control.readOnly === true || !!frame.disabledReason}
        onChange={event => field.handleChange(event.target.value)}
      />
    </Field>
  )
}

type NumberFieldProps = FrameProps &
  Omit<ComponentProps<typeof NumberInput>, "value" | "onValueChange" | "id" | "name" | "className">

/** A `Field` around a `NumberInput` bound to a number field; `nullable` for one that may be null. */
export function NumberField(props: NumberFieldProps) {
  const [frame, control] = splitFrame(props)
  const field = useFieldContext<number | null | undefined>()

  return (
    <Field {...frame}>
      <NumberInput
        {...control}
        value={field.state.value}
        readOnly={control.readOnly === true || !!frame.disabledReason}
        onValueChange={value => field.handleChange(value)}
      />
    </Field>
  )
}

/** A run of items under one optional heading, drawn apart from the next by a separator. */
export interface SelectFieldGroup {
  label?: string
  /** Value to label. */
  items: Record<string, string>
}

interface SelectFieldProps extends FrameProps {
  /**
   * Value to label, one flat list. The trigger shows the label of the selected value. Pass
   * `groups` instead to draw the list in sections.
   */
  items?: Record<string, string>
  groups?: SelectFieldGroup[]
  /** Why an item cannot be chosen, by value: it stays in the list, disabled, with the reason. */
  reasons?: Record<string, string>
  /** Something to draw before an item's label, like a glyph for the value. */
  prefix?: (value: string) => ReactNode
  placeholder?: string
}

/**
 * A `Field` around a `Select` bound to a string field, one item per entry of `items`, or per
 * entry of each of the `groups`.
 */
export function SelectField({
  items,
  groups,
  reasons,
  prefix,
  placeholder,
  ...frame
}: SelectFieldProps) {
  const field = useFieldContext<string>()
  const sections = groups ?? [{ items: items ?? {} }]
  // Every value to its label, whichever section it sits in: the trigger reads it from here.
  const labels = Object.assign({}, ...sections.map(section => section.items))

  function item(value: string, label: string) {
    return (
      <SelectItem
        key={value}
        value={value}
        label={label}
        prefix={prefix?.(value)}
        disabledReason={reasons?.[value]}
      >
        {label}
      </SelectItem>
    )
  }

  return (
    <Field {...frame}>
      {({ onBlur, ...control }) => (
        <Select
          items={labels}
          value={field.state.value}
          readOnly={!!frame.disabledReason}
          // Base UI reports a cleared selection as null; a select with no empty item never clears.
          onValueChange={value => value !== null && field.handleChange(value)}
          onOpenChange={open => !open && onBlur()}
        >
          <DisabledReason reason={frame.disabledReason}>
            <SelectTrigger {...control}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
          </DisabledReason>
          <SelectContent>
            {sections.map((section, index) => (
              <SelectGroup key={index}>
                {index > 0 && <SelectSeparator />}
                {section.label && <SelectLabel>{section.label}</SelectLabel>}
                {Object.entries(section.items).map(([value, label]) => item(value, label))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  )
}

type DateFieldProps = FrameProps &
  Pick<DatePickerProps, "min" | "max" | "placeholder" | "formatDay" | "disabled" | "clearable">

// Every form hook registers `DateField`, so a direct import would put the calendar and its
// popover on every page with a form, sign-in included. It loads when a date field first renders.
const DatePicker = lazy(() =>
  import("./date-picker").then(module => ({ default: module.DatePicker })),
)

/** A `Field` around a `DatePicker` bound to a "YYYY-MM-DD" string field. */
export function DateField({
  min,
  max,
  placeholder,
  formatDay,
  disabled = false,
  clearable,
  ...frame
}: DateFieldProps) {
  const field = useFieldContext<string>()

  return (
    <Field {...frame}>
      {({ name: _name, ...control }) => (
        // The fallback is the picker's own trigger, so nothing moves when the calendar arrives.
        // `inert` rather than `disabled`, which would dim it for that moment.
        <Suspense
          fallback={
            <DatePickerTrigger
              value={field.state.value}
              aria-hidden
              placeholder={placeholder}
              formatDay={formatDay}
              disabled={disabled}
              inert
            />
          }
        >
          <DatePicker
            {...control}
            value={field.state.value}
            min={min}
            max={max}
            placeholder={placeholder}
            formatDay={formatDay}
            clearable={clearable}
            disabled={disabled}
            disabledReason={frame.disabledReason}
            onChange={value => field.handleChange(value)}
          />
        </Suspense>
      )}
    </Field>
  )
}

interface SwitchFieldProps {
  label: ReactNode
  description?: ReactNode
  className?: string
  /** What the switch turns on, e.g. the password field itself. Rendered only while it is on. */
  children?: ReactNode
}

/**
 * A switch with its label and one line of consequence beside it, bound to a boolean field.
 * Its own frame rather than `Field`: a switch sits at the end of its label's line in every
 * layout, and Base UI renders it as a `<span role="switch">`, which `<label for>` cannot address.
 */
export function SwitchField({ label, description, className, children }: SwitchFieldProps) {
  const field = useFieldContext<boolean>()
  const id = useId()
  const descriptionId = `${id}-description`
  const messageId = `${id}-message`
  const message = fieldError(field.state.meta)

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span id={id} className="font-medium text-sm">
            {label}
          </span>
          {description && (
            <span id={descriptionId} className={descriptionClasses}>
              {description}
            </span>
          )}
          <FieldMessage id={messageId} message={message} />
        </div>

        <Switch
          checked={field.state.value}
          aria-labelledby={id}
          aria-describedby={formatIdList(!!description && descriptionId, message && messageId)}
          aria-invalid={message ? true : undefined}
          className="mt-0.5 shrink-0"
          onCheckedChange={checked => field.handleChange(checked)}
          onBlur={field.handleBlur}
        />
      </div>

      {field.state.value && children}
    </div>
  )
}

interface CheckboxFieldProps {
  label: ReactNode
  description?: ReactNode
  className?: string
}

/**
 * A checkbox before its label, bound to a boolean field. The row is a `<label>`, so a click on
 * the text toggles the box; the description and the error sit under the label text, not under
 * the box. Use it for an option of a one-off action; a setting that stays on is a `SwitchField`.
 */
export function CheckboxField({ label, description, className }: CheckboxFieldProps) {
  const field = useFieldContext<boolean>()
  const id = useId()
  const descriptionId = `${id}-description`
  const messageId = `${id}-message`
  const message = fieldError(field.state.meta)

  return (
    <div className={cn("flex flex-col gap-0.5 self-start", className)}>
      <label className="flex cursor-pointer items-start gap-2">
        <Checkbox
          checked={field.state.value}
          aria-labelledby={id}
          aria-describedby={formatIdList(!!description && descriptionId, message && messageId)}
          aria-invalid={message ? true : undefined}
          className="mt-0.5"
          onCheckedChange={checked => field.handleChange(checked)}
          onBlur={field.handleBlur}
        />

        <span className="flex min-w-0 flex-col gap-0.5">
          <span id={id} className="text-sm">
            {label}
          </span>
          {description && (
            <span id={descriptionId} className={descriptionClasses}>
              {description}
            </span>
          )}
        </span>
      </label>

      {/* Indented by the box and its gap, so it lines up with the label text. */}
      <FieldMessage id={messageId} message={message} className="pl-6" />
    </div>
  )
}

export interface RadioCardOption {
  value: string
  label: ReactNode
  description?: ReactNode
  badge?: ReactNode
  /** Why this card alone cannot be chosen, as `disabledReason` says it for all of them. */
  disabledReason?: string
}

interface RadioCardFieldProps {
  label: ReactNode
  description?: ReactNode
  options: RadioCardOption[]
  className?: string
  /**
   * Why the cards cannot be chosen: they stay reachable and cannot be picked, and each one reads
   * the reason and shows it above itself on hover and focus.
   */
  disabledReason?: string
  /** Under the cards, e.g. a note that holds for every choice. */
  children?: ReactNode
}

/**
 * A choice out of a few cards, bound to a string field, for choices that each need a sentence
 * to tell apart. Two plain states are a `SwitchField`, a long list a `SelectField`.
 */
export function RadioCardField({
  label,
  description,
  options,
  className,
  disabledReason,
  children,
}: RadioCardFieldProps) {
  const field = useFieldContext<string>()
  const id = useId()
  const descriptionId = `${id}-description`
  const messageId = `${id}-message`
  const message = fieldError(field.state.meta)

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={id} className="font-medium text-sm">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className={descriptionClasses}>
            {description}
          </span>
        )}
      </div>

      <RadioGroup
        value={field.state.value}
        readOnly={!!disabledReason}
        aria-labelledby={id}
        aria-describedby={formatIdList(!!description && descriptionId, message && messageId)}
        aria-invalid={message ? true : undefined}
        onValueChange={value => field.handleChange(value)}
      >
        {options.map(({ value, disabledReason: optionReason, ...option }) => (
          <RadioCard
            key={value}
            value={value}
            disabledReason={disabledReason ?? optionReason}
            onBlur={field.handleBlur}
            {...option}
          />
        ))}
      </RadioGroup>

      <FieldMessage id={messageId} message={message} />

      {children}
    </div>
  )
}

/** The part of a `useAppForm` result the `Form` element needs: the provider and the submit. */
export interface SubmittableForm {
  AppForm: ComponentType<{ children?: ReactNode }>
  validate: (cause: "submit") => unknown
  handleSubmit: () => Promise<void>
}

interface FormProps extends Omit<ComponentProps<"form">, "onSubmit"> {
  form: SubmittableForm
}

/**
 * The control to focus for the first invalid field: the marked element itself, or for a group
 * that cannot take focus (a radio group), the control inside it the Tab key would reach.
 */
function findInvalidControl(form: HTMLFormElement) {
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!invalid) return
  if (invalid.tabIndex >= 0) return invalid
  return invalid.querySelector<HTMLElement>('[tabindex="0"]') ?? undefined
}

/**
 * The `<form>` element of a TanStack form: provides the form to the components inside it,
 * validates the whole form and hands submit to `handleSubmit`, then moves focus to the first
 * invalid control. Browser validation is off, since the form's own validators own the messages.
 *
 * The explicit `validate` matters: `handleSubmit` runs the form-level validators (where a
 * schema lives) only once every field is valid, so while one error stands a field revealed
 * since the last submit would never get its own.
 */
export function Form({ form: { AppForm, validate, handleSubmit }, ...props }: FormProps) {
  return (
    <AppForm>
      <form
        noValidate
        {...props}
        onSubmit={event => {
          event.preventDefault()
          event.stopPropagation()
          const element = event.currentTarget
          void Promise.resolve(validate("submit"))
            .then(() => handleSubmit())
            .then(() => findInvalidControl(element)?.focus())
        }}
      />
    </AppForm>
  )
}

/** A submit button that shows the form's pending state. */
export function SubmitButton({ isPending = false, ...props }: ComponentProps<typeof Button>) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => state.isSubmitting}>
      {isSubmitting => <Button type="submit" isPending={isPending || isSubmitting} {...props} />}
    </form.Subscribe>
  )
}

interface SaveChangesButtonProps extends Omit<ComponentProps<typeof Button>, "disabled"> {
  /** Why the button is locked while every field still holds its saved value. */
  unchangedReason?: string
}

/**
 * A settings form's submit, locked with a reason until a field differs from its default value,
 * which a settings form sets to what is saved. Shows the form's pending state like
 * `SubmitButton`.
 */
export function SaveChangesButton({
  unchangedReason = "No changes to save.",
  children = "Save changes",
  ...props
}: SaveChangesButtonProps) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => state.isDefaultValue}>
      {unchanged => (
        <DisabledReason reason={unchanged ? unchangedReason : undefined}>
          <SubmitButton disabled={unchanged} {...props}>
            {children}
          </SubmitButton>
        </DisabledReason>
      )}
    </form.Subscribe>
  )
}

interface FormErrorProps {
  className?: string
}

/** The error the last submit left on the form as a whole, if any. Field errors show on their fields. */
export function FormError({ className }: FormErrorProps) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={state => errorMessage(state.errorMap.onSubmit)}>
      {message =>
        message ? (
          <Callout tone="danger" live="assertive" className={className}>
            <CalloutText>{message}</CalloutText>
          </Callout>
        ) : null
      }
    </form.Subscribe>
  )
}

/** The sets `createFormHook` takes, so an app registers every primitive in one line. */
export const fieldComponents = {
  Field,
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  DateField,
  SwitchField,
  CheckboxField,
  RadioCardField,
}
export const formComponents = { SubmitButton, SaveChangesButton, FormError }
