import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Jest fixtures have a separate runner/config and are maintained independently.
  { ignores: ['src/__tests__/**', 'src/**/__mocks__/**', 'src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
