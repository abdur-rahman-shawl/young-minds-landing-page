import path from 'path';
import * as dotenv from 'dotenv';

let hasLoadedProjectEnv = false;

export function loadProjectEnv() {
  if (hasLoadedProjectEnv) {
    return;
  }

  const shouldOverrideExistingEnv = process.env.NODE_ENV !== 'production';
  const inheritedDatabaseUrl = process.env.DATABASE_URL;

  for (const fileName of ['.env.local', '.env']) {
    dotenv.config({
      path: path.join(process.cwd(), fileName),
      override: shouldOverrideExistingEnv,
      quiet: true,
    });
  }

  if (
    shouldOverrideExistingEnv &&
    inheritedDatabaseUrl &&
    process.env.DATABASE_URL &&
    inheritedDatabaseUrl !== process.env.DATABASE_URL
  ) {
    console.info('[env] Overrode inherited DATABASE_URL with project env files.');
  }

  hasLoadedProjectEnv = true;
}
