import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'

const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')
const appSource = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf8')

describe('requirements coverage', () => {
  it('req4: mobile-friendly responsive UI', () => {
    expect(indexHtml).toMatch(/<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1.0"/i)
    expect(appSource).toContain('overflow-x-auto')
    expect(appSource).toContain('text-base')
  })

  it('req5: includes github repository link', () => {
    expect(appSource).toContain('https://github.com/LatentOverclock/clock-orchestrio')
  })
})
