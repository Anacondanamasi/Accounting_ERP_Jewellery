import { useEffect } from "react";
import { useForm, } from "react-hook-form";
const getValueByPath = (obj, path) => {
    const chunks = path.split(".");
    let cursor = obj;
    for (const chunk of chunks) {
        if (cursor == null)
            return undefined;
        cursor = cursor[chunk];
    }
    return cursor;
};
const findFirstErrorPath = (errors, prefix = "") => {
    for (const [key, value] of Object.entries(errors)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (!value || typeof value !== "object")
            continue;
        if ("message" in value && value.message)
            return path;
        const nested = findFirstErrorPath(value, path);
        if (nested)
            return nested;
    }
    return null;
};
const selectorSafeName = (path) => path.replace(/"/g, '\\"');
export const useAppForm = (props = {}) => {
    const form = useForm({
        mode: "onChange",
        reValidateMode: "onChange",
        criteriaMode: "firstError",
        shouldFocusError: true,
        ...props,
    });
    const originalRegister = form.register;
    const registerWithA11y = ((name, options) => {
        const registered = originalRegister(name, options);
        const hasError = Boolean(getValueByPath(form.formState.errors, String(name)));
        return {
            ...registered,
            "aria-invalid": hasError ? "true" : "false",
            "data-invalid": hasError ? "true" : "false",
            "aria-required": options?.required ? "true" : undefined,
        };
    });
    useEffect(() => {
        if (form.formState.submitCount === 0 || !form.formState.isSubmitted)
            return;
        const firstErrorPath = findFirstErrorPath(form.formState.errors);
        if (!firstErrorPath)
            return;
        const target = document.querySelector(`[name="${selectorSafeName(firstErrorPath)}"]`);
        if (!target)
            return;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [form.formState.errors, form.formState.isSubmitted, form.formState.submitCount]);
    return {
        ...form,
        register: registerWithA11y,
    };
};
