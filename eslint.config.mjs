import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([".next/**", ".next-release/**", ".release-test-results/**", "out/**", "next-env.d.ts", "playwright-report/**", "test-results/**", "src/generated/**", ".next-backend/**", ".next-backend-build/**", ".backend-test-results/**", ".next-camera/**", ".next-camera-edge/**", ".camera-test-results-edge/**", ".camera-test-results/**", ".camera-runtime/**"]),
]);
