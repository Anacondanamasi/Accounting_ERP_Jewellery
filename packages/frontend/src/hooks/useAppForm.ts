import { useEffect } from "react";
import {
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from "react-hook-form";

const getValueByPath = (obj: unknown, path: string): unknown => {
  const chunks = path.split(".");
  let cursor: any = obj;
  for (const chunk of chunks) {
    if (cursor == null) return undefined;
    cursor = cursor[chunk];
  }
  return cursor;
};

const findFirstErrorPath = (errors: FieldErrors, prefix = ""): string | null => {
  for (const [key, value] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!value || typeof value !== "object") continue;
    if ("message" in value && value.message) return path;
    const nested = findFirstErrorPath(value as FieldErrors, path);
    if (nested) return nested;
  }
  return null;
};

const selectorSafeName = (path: string) => path.replace(/"/g, '\\"');

type AppUseFormReturn<T extends FieldValues> = UseFormReturn<T>;

export const useAppForm = <T extends FieldValues = FieldValues>(
  props: UseFormProps<T> = {},
): AppUseFormReturn<T> => {
  const form = useForm<T>({
    mode: "onChange",
    reValidateMode: "onChange",
    criteriaMode: "firstError",
    shouldFocusError: true,
    ...props,
  });

  const originalRegister = form.register;
  const registerWithA11y = ((name: Path<T>, options?: any) => {
    const registered = originalRegister(name, options);
    const hasError = Boolean(getValueByPath(form.formState.errors, String(name)));
    return {
      ...registered,
      "aria-invalid": hasError ? "true" : "false",
      "data-invalid": hasError ? "true" : "false",
      "aria-required": options?.required ? "true" : undefined,
    };
  }) as typeof form.register;

  useEffect(() => {
    if (form.formState.submitCount === 0 || !form.formState.isSubmitted) return;
    const firstErrorPath = findFirstErrorPath(form.formState.errors);
    if (!firstErrorPath) return;
    const target = document.querySelector(
      `[name="${selectorSafeName(firstErrorPath)}"]`,
    ) as HTMLElement | null;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [form.formState.errors, form.formState.isSubmitted, form.formState.submitCount]);

  return {
    ...form,
    register: registerWithA11y,
  };
};
