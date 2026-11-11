import { readdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, '..', 'public', 'nfts')

const files = readdirSync(dir).filter((f) => f.endsWith('.jpg'))
for (const file of files) {
  const input = join(dir, file)
  const output = join(dir, file.replace(/\.jpg$/, '.webp'))
  await sharp(input)
    .resize({ width: 1024, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(output)
  console.log(`${file} → ${file.replace('.jpg', '.webp')}`)
  unlinkSync(input)
}
console.log(`\n${files.length} imagens convertidas para WebP.`)
