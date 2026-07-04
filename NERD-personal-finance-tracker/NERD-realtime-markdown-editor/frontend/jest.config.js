/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  passWithNoTests: true,
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      { tsconfig: { module: "commonjs", esModuleInterop: true, target: "ES2019" } },
    ],
  },
};
