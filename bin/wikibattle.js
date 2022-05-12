#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import os from 'os'

if (process.env.NOW && process.env.FIRESTORE_KEY) {
  const keyFile = path.join(os.tmpdir(), 'firestore.json')
  fs.writeFileSync(keyFile, process.env.FIRESTORE_KEY)
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFile
}

await import('../src/app.js')
