import { Resvg } from '@resvg/resvg-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const svgPath = path.join(__dirname, '../public/icon.svg')
const svg = fs.readFileSync(svgPath, 'utf-8')

const sizes = [192, 512]

for (const size of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  })
  const png = resvg.render().asPng()
  const outPath = path.join(__dirname, `../public/icon-${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`Generated ${outPath}`)
}

// Apple touch icon (180x180)
const resvg180 = new Resvg(svg, { fitTo: { mode: 'width', value: 180 } })
const png180 = resvg180.render().asPng()
fs.writeFileSync(path.join(__dirname, '../public/apple-touch-icon.png'), png180)
console.log('Generated apple-touch-icon.png')
